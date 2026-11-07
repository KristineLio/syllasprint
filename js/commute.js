/* Commute Mode: deterministic, source-linked self review. No AI or network service. */
(function (root) {
  'use strict';
  var LIMITS={5:6,10:12,15:18};
  function ensure(state){
    if(!state.commute||typeof state.commute!=='object')state.commute={sessions:[],savedQuestionIds:[]};
    if(!Array.isArray(state.commute.sessions))state.commute.sessions=[];
    if(!Array.isArray(state.commute.savedQuestionIds))state.commute.savedQuestionIds=[];
    return state.commute;
  }
  function eligible(q){return !!q&&typeof q.prompt==='string'&&!!q.prompt.trim()&&typeof q.answer==='string'&&!!q.answer.trim();}
  function saved(state,id){return ensure(state).savedQuestionIds.includes(id);}
  function toggleSaved(state,id){
    var store=ensure(state),q=state.questions.find(function(v){return v.id===id;});if(!eligible(q))return false;
    var i=store.savedQuestionIds.indexOf(id);
    if(i>=0){store.savedQuestionIds.splice(i,1);return false;}
    store.savedQuestionIds.push(id);return true;
  }
  function queue(state,courseId,minutes){
    var m=Number(minutes),limit=LIMITS[m];if(!limit)throw new Error('Choose a 5, 10, or 15 minute session.');
    var qs=state.questions.filter(function(q){return q.courseId===courseId&&eligible(q);});
    if(!qs.length)return [];
    var weak=qs.filter(function(q){return state.attempts.some(function(a){return a.questionId===q.id;})&&state.attempts.filter(function(a){return a.questionId===q.id;}).slice(-1)[0].correct===false;});
    var keep=qs.filter(function(q){return saved(state,q.id);});
    var rest=qs.slice();
    var seen=new Set(),ids=[];
    [weak,keep,rest].forEach(function(group){group.forEach(function(q){if(ids.length<limit&&!seen.has(q.id)){seen.add(q.id);ids.push(q.id);}});});
    return ids;
  }
  function active(state){return ensure(state).sessions.find(function(s){return !s.completedAt;})||null;}
  function begin(state,courseId,minutes,now){
    var course=state.courses.find(function(c){return c.id===courseId;});if(!course)throw new Error('Choose an existing course.');
    if(active(state))throw new Error('Finish your existing commute session first.');
    var ids=queue(state,courseId,minutes);if(!ids.length)throw new Error('Add a question with an answer to this course first.');
    var stamp=now===undefined?Date.now():now;
    var session={id:'commute_'+stamp+'_'+Math.random().toString(36).slice(2,8),kind:'commute',courseId:courseId,minutes:Number(minutes),questionIds:ids,index:0,revealed:false,startedAt:new Date(stamp).toISOString(),completedAt:null,reviews:[],skipped:[]};
    ensure(state).sessions.unshift(session);
    return session;
  }
  function currentQuestion(state,session){return session?state.questions.find(function(q){return q.id===session.questionIds[session.index]&&eligible(q);})||null:null;}
  function end(state,session,now){if(!session||session.completedAt)return session;session.completedAt=new Date(now===undefined?Date.now():now).toISOString();return session;}
  function reveal(session){if(!session||session.completedAt)return false;session.revealed=true;return true;}
  function advance(state,session,rating,now){
    if(!session||session.completedAt)return false;
    var q=currentQuestion(state,session);if(!q)return false;
    if(rating!=='skip'&&rating!=='again'&&rating!=='gotit')return false;
    if(rating!=='skip'&&!session.revealed)return false;
    if(rating==='skip')session.skipped.push(q.id);
    else{
      session.reviews.push({questionId:q.id,rating:rating,reviewedAt:new Date(now===undefined?Date.now():now).toISOString(),gradingMethod:'self-reported'});
      if(rating==='again'&&!saved(state,q.id))ensure(state).savedQuestionIds.push(q.id);
      if(rating==='gotit'){
        // A previously saved difficult card is intentionally retained; users control their saved list.
      }
    }
    session.index++;
    session.revealed=false;
    if(session.index>=session.questionIds.length)end(state,session,now);
    return true;
  }
  function remaining(session,now){
    if(!session)return 0;
    return Math.max(0,Math.ceil((Date.parse(session.startedAt)+session.minutes*60000-(now===undefined?Date.now():now))/1000));
  }
  function stats(session){var rs=session&&Array.isArray(session.reviews)?session.reviews:[];return {reviewed:rs.length,gotit:rs.filter(function(x){return x.rating==='gotit';}).length,again:rs.filter(function(x){return x.rating==='again';}).length,skipped:session&&session.skipped?session.skipped.length:0};}
  function speechText(q){
    if(!eligible(q))return null;
    var explanation=String(q.explanation||'').trim();
    var source=String(q.sourceExcerpt||'').trim();
    var answer='Answer: '+q.answer+'.';
    if(source&&source!==q.answer)answer+=' Source passage: '+source.slice(0,650);
    else if(explanation)answer+=' '+explanation.slice(0,550);
    return {question:q.prompt,answer:answer};
  }
  function speechAvailable(){return typeof root.speechSynthesis!=='undefined'&&typeof root.SpeechSynthesisUtterance==='function';}
  function makeSpeaker(){
    var token=0,timer=null,paused=false;
    function stop(){token++;if(timer!==null){clearTimeout(timer);timer=null;}paused=false;if(speechAvailable())try{root.speechSynthesis.cancel();}catch(_){}}
    function speak(question,answer,rate,pauseSeconds,onReveal,onFailure){
      stop();if(!speechAvailable()){if(onFailure)onFailure();return false;}
      var mine=token,engine=root.speechSynthesis;
      function utter(text,onEnd){if(mine!==token)return;var u=new root.SpeechSynthesisUtterance(text);u.rate=Math.max(.7,Math.min(1.3,Number(rate)||1));u.lang='en-US';u.onend=function(){if(mine===token&&onEnd)onEnd();};u.onerror=function(){if(mine===token){stop();if(onFailure)onFailure();}};engine.speak(u);}
      try{utter(question,function(){timer=setTimeout(function(){timer=null;if(mine!==token)return;if(onReveal)onReveal();utter(answer);},Math.max(2,Math.min(10,Number(pauseSeconds)||5))*1000);});return true;}
      catch(_){stop();if(onFailure)onFailure();return false;}
    }
    return {stop:stop,speak:speak,available:speechAvailable};
  }
  root.SyllaCommute={LIMITS:LIMITS,ensure:ensure,eligible:eligible,saved:saved,toggleSaved:toggleSaved,queue:queue,active:active,begin:begin,currentQuestion:currentQuestion,reveal:reveal,advance:advance,end:end,remaining:remaining,stats:stats,speechText:speechText,makeSpeaker:makeSpeaker};
})(typeof globalThis!=='undefined'?globalThis:this);