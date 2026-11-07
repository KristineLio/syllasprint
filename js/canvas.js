/* Syllasprint Concept Map. Source-linked study notes and targeted revision. */
(function(root){
  'use strict';
  var WIDTH=1180, HEIGHT=740, CARD_W=244, CARD_H=180, COLORS=['mint','sky','peach','lavender','cream'];
  function uid(prefix){return prefix+'_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9);}
  function ensure(state){if(!Array.isArray(state.boards))state.boards=[];return state.boards;}
  function board(state,courseId){
    if(!state.courses.some(function(c){return c.id===courseId;}))return null;
    var boards=ensure(state),b=boards.find(function(x){return x.courseId===courseId;});
    if(!b){b={id:uid('board'),courseId:courseId,nodes:[],links:[],updatedAt:new Date().toISOString()};boards.push(b);}
    return b;
  }
  function getBoard(state,courseId){return ensure(state).find(function(x){return x.courseId===courseId;})||null;}
  function clamp(v,min,max){return Math.max(min,Math.min(max,Math.round(Number(v)||0)));}
  function addNote(b,title,body,color,x,y,meta){
    if(!b||b.nodes.length>=80)throw new Error('This canvas has reached its 80-note limit.');
    title=String(title||'').trim().slice(0,80);body=String(body||'').trim().slice(0,1200);
    if(!title&&!body)throw new Error('Write a title or some note text.');
    var note={id:uid('note'),title:title||'Untitled note',body:body,color:COLORS.includes(color)?color:'cream',x:clamp(x,0,WIDTH-CARD_W),y:clamp(y,0,HEIGHT-CARD_H),sourceQuestionId:meta&&meta.sourceQuestionId||'',topicId:meta&&meta.topicId||'',sourceId:meta&&meta.sourceId||'',sourcePage:meta&&meta.sourcePage||null,createdAt:new Date().toISOString()};
    b.nodes.push(note);touch(b);return note;
  }
  function updateNote(b,id,data){var n=b&&b.nodes.find(function(x){return x.id===id;});if(!n)return false;
    var title=String(data.title||'').trim().slice(0,80),body=String(data.body||'').trim().slice(0,1200);
    if(!title&&!body)throw new Error('Write a title or some note text.');
    n.title=title||'Untitled note';n.body=body;n.color=COLORS.includes(data.color)?data.color:'cream';
    if(Object.prototype.hasOwnProperty.call(data,'topicId'))n.topicId=String(data.topicId||'');
    if(Object.prototype.hasOwnProperty.call(data,'sourceId'))n.sourceId=String(data.sourceId||'');
    if(Object.prototype.hasOwnProperty.call(data,'sourcePage'))n.sourcePage=data.sourcePage?Math.max(1,Math.min(100,Math.floor(Number(data.sourcePage)))):null;
    touch(b);return true;
  }
  function move(b,id,x,y){var n=b&&b.nodes.find(function(x){return x.id===id;});if(!n)return false;n.x=clamp(x,0,WIDTH-CARD_W);n.y=clamp(y,0,HEIGHT-CARD_H);touch(b);return true;}
  function link(b,from,to){if(!b||from===to)return false;if(!b.nodes.some(function(x){return x.id===from;})||!b.nodes.some(function(x){return x.id===to;}))return false;
    if(b.links.some(function(x){return (x.from===from&&x.to===to)||(x.from===to&&x.to===from);}))return false;
    b.links.push({id:uid('link'),from:from,to:to});touch(b);return true;
  }
  function unlink(b,id){if(!b)return false;var old=b.links.length;b.links=b.links.filter(function(x){return x.id!==id;});if(old!==b.links.length)touch(b);return b.links.length!==old;}
  function removeNote(b,id){if(!b)return false;var old=b.nodes.length;b.nodes=b.nodes.filter(function(x){return x.id!==id;});b.links=b.links.filter(function(x){return x.from!==id&&x.to!==id;});if(old!==b.nodes.length)touch(b);return old!==b.nodes.length;}
  function touch(b){b.updatedAt=new Date().toISOString();}
  function fromTopics(state,courseId){var b=board(state,courseId);if(!b)return 0;
    var course=state.courses.find(function(c){return c.id===courseId;}),topics=state.topics.filter(function(t){return t.courseId===courseId;}).slice(0,9);
    var root=b.nodes.find(function(n){return n.topicId==='__root__';});if(!root)root=addNote(b,course.name,'What do I need to understand before this exam?','mint',40,270,{topicId:'__root__'});
    var created=0;
    topics.forEach(function(topic,i){if(b.nodes.length>=80)return;var match=b.nodes.find(function(n){return n.topicId===topic.id;});if(match){link(b,root.id,match.id);return;}
      var col=i%3,row=Math.floor(i/3),topicSources=state.materials.filter(function(m){return m.courseId===courseId&&m.topicId===topic.id;}),note=addNote(b,topic.name,'Add an explanation, example, and questions about this topic.','sky',340+col*270,70+row*212,{topicId:topic.id,sourceId:topicSources.length===1?topicSources[0].id:''});link(b,root.id,note.id);created++;
    });return created;
  }
  function pinQuestion(state,question){var b=board(state,question.courseId);if(!b)return null;var old=b.nodes.find(function(n){return n.sourceQuestionId===question.id;});if(old)return old;
    var index=b.nodes.length,n=addNote(b,question.prompt,question.answer+(question.sourcePage?'\nSource page: '+question.sourcePage:''),'peach',40+(index%4)*278,45+(Math.floor(index/4)%3)*220,{sourceQuestionId:question.id,topicId:question.topicId||'',sourceId:question.sourceId||'',sourcePage:question.sourcePage||null});return n;
  }
  // Only link to questions explicitly pinned or assigned to the same course topic.
  // Never match unrelated questions based on their words or invent a source.
  function relatedQuestions(state,courseId,note){
    if(!note)return [];
    if(note.sourceQuestionId)return state.questions.filter(function(q){return q.courseId===courseId&&q.id===note.sourceQuestionId;});
    if(!note.topicId||note.topicId==='__root__')return [];
    return state.questions.filter(function(q){return q.courseId===courseId&&q.topicId===note.topicId;});
  }
  function pagePassage(material,page){
    if(!material||!page)return '';
    var txt=String(material.content||'');
    var reg=new RegExp('\\[\\[Page\\s+'+page+'\\]\\]\\s*([\\s\\S]*?)(?=\\[\\[Page\\s+\\d+\\]\\]|$)','i');
    var m=txt.match(reg);return m?m[1].trim().slice(0,1400):'';
  }
  function sourceFor(state,courseId,note){
    var q=note&&note.sourceQuestionId?state.questions.find(function(x){return x.id===note.sourceQuestionId&&x.courseId===courseId;}):null;
    var sourceId=(q&&q.sourceId)||note&&note.sourceId||'';
    var material=state.materials.find(function(m){return m.id===sourceId&&m.courseId===courseId;})||null;
    var page=(q&&q.sourcePage)||note&&note.sourcePage||null;
    var excerpt=q&&q.sourceExcerpt||pagePassage(material,page)||'';
    return material||excerpt?{material:material,page:page,excerpt:excerpt,question:q}:null;
  }
  function noteStatus(state,courseId,note){
    var qs=relatedQuestions(state,courseId,note);
    return {questions:qs,gaps:qs.filter(function(q){return root.SyllaCore&&root.SyllaCore.isGap(state,q);}).length,
      weak:qs.filter(function(q){return root.SyllaCore&&root.SyllaCore.isWeak(state,q);}).length,
      source:sourceFor(state,courseId,note)};
  }
  function validBoard(b){if(!b||typeof b.id!=='string'||typeof b.courseId!=='string'||!Array.isArray(b.nodes)||!Array.isArray(b.links)||b.nodes.length>80||b.links.length>300)return false;
    var ids=new Set();for(var i=0;i<b.nodes.length;i++){var n=b.nodes[i];if(!n||typeof n.id!=='string'||ids.has(n.id)||typeof n.title!=='string'||typeof n.body!=='string'||n.title.length>80||n.body.length>1200||!Number.isFinite(n.x)||!Number.isFinite(n.y)||!COLORS.includes(n.color)||['topicId','sourceId','sourceQuestionId'].some(function(k){return n[k]!==undefined&&typeof n[k]!=='string';})||(n.sourcePage!=null&&(!Number.isInteger(n.sourcePage)||n.sourcePage<1||n.sourcePage>100)))return false;ids.add(n.id);}
    return b.links.every(function(l){return l&&typeof l.id==='string'&&ids.has(l.from)&&ids.has(l.to)&&l.from!==l.to;});
  }
  root.SyllaCanvas={WIDTH:WIDTH,HEIGHT:HEIGHT,CARD_W:CARD_W,CARD_H:CARD_H,COLORS:COLORS,ensure:ensure,board:board,getBoard:getBoard,addNote:addNote,updateNote:updateNote,move:move,link:link,unlink:unlink,removeNote:removeNote,fromTopics:fromTopics,pinQuestion:pinQuestion,relatedQuestions:relatedQuestions,sourceFor:sourceFor,noteStatus:noteStatus,validBoard:validBoard};
})(typeof globalThis!=='undefined'?globalThis:this);
