/* Syllasprint Guided Study: source-linked, honest five-round study sessions. */
(function (root) {
  'use strict';
  var rounds = [
    {id:'understand', label:'Understand', caption:'Read and paraphrase source passages'},
    {id:'recall', label:'Active recall', caption:'Answer questions before viewing the reference'},
    {id:'apply', label:'Apply', caption:'Explain a real use in your own words'},
    {id:'debug', label:'Debug / test', caption:'Reason about a source example or edge case'},
    {id:'revise', label:'Revision', caption:'Retake questions and review uncertain answers'}
  ];
  var ctx;
  var draft = {text:'', confidence:''};
  function api(){return ctx;}
  function data(){return api().getState();}
  function esc(x){return api().esc(x);}
  function ico(x){return api().ico(x);}
  function btn(action,label,style,attrs){return api().button(action,label,style,attrs);}
  function courses(){return data().courses.filter(function(c){return data().materials.some(function(m){return m.courseId===c.id;});});}
  function materials(courseId){return data().materials.filter(function(m){return m.courseId===courseId;});}
  function current(){var id=api().getUI().guideId;return data().sessions.find(function(s){return s.kind==='guided' && s.id===id;});}
  function sourceFor(s){return data().materials.find(function(m){return m.id===s.sourceId;});}
  function questionsFor(s){return data().questions.filter(function(q){return q.sourceId===s.sourceId && q.courseId===s.courseId;});}
  function excerpts(s){
    var found=[],seen=new Set();
    questionsFor(s).forEach(function(q){
      var text=(q.sourceExcerpt||q.answer||'').trim();
      text=text.replace(/^\[page\s*\d+\]\s*/i,'').slice(0,600);
      if(text.length>=30 && !seen.has(text.toLowerCase())){found.push({text:text,page:q.sourcePage||null});seen.add(text.toLowerCase());}
    });
    if(found.length<3){var m=sourceFor(s); if(m){var blocks=(m.content||'').split(/\n\s*\n/).map(function(x){return x.trim();}).filter(function(x){return x.length>=65 && x.length<=900;});blocks.slice(0,5).forEach(function(x){if(!seen.has(x.toLowerCase())){seen.add(x.toLowerCase());found.push({text:x.slice(0,600),page:null});}});}}
    return found.slice(0,Math.min(4,found.length));
  }
  function codeExcerpt(s){
    var m=sourceFor(s);if(!m)return '';
    var lines=m.content.split(/\r?\n/);
    for(var i=0;i<lines.length;i++){
      if(/^\s*(?:class\s+[A-Za-z_]|def\s+[A-Za-z_]|for\s+\w+|while\s+|if\s+|import\s+)/.test(lines[i])){
        return lines.slice(i,Math.min(lines.length,i+9)).join('\n').trim().slice(0,800);
      }
    }
    return '';
  }
  function hasAnswers(s){return questionsFor(s).length>0;}
  function learnCards(s){var card=excerpts(s);return card.length?card:[{text:(sourceFor(s)?.content||'No source found').slice(0,650),page:null}];}
  function questionIds(s,stage){
    var qs=questionsFor(s);if(stage==='recall')return qs.slice(0,Math.min(4,qs.length)).map(function(q){return q.id;});
    if(stage==='revise'){
      var weak=qs.filter(function(q){return api().C.isWeak(data(),q);});
      var ordered=weak.concat(qs.filter(function(q){return !weak.some(function(w){return w.id===q.id;});}));
      return ordered.slice(0,Math.min(3,ordered.length)).map(function(q){return q.id;});
    }
    return [];
  }
  function items(s){
    var stage=rounds[s.round].id;
    if(stage==='understand')return learnCards(s);
    if(stage==='recall')return s.recallIds.map(function(id){return data().questions.find(function(q){return q.id===id;});}).filter(Boolean);
    if(stage==='revise')return (s.reviseIds||[]).map(function(id){return data().questions.find(function(q){return q.id===id;});}).filter(Boolean);
    return [stage];
  }
  function save(){api().persist();}
  function resetDraft(){draft={text:'',confidence:''};}
  function sessionScore(s){
    var answers=(s.records||[]).filter(function(r){return r.kind==='question';}),auto=answers.filter(function(r){return !r.selfGraded;});
    var manual=(s.records||[]).filter(function(r){return r.selfGraded;});
    return {autoTotal:auto.length,autoCorrect:auto.filter(function(r){return r.correct;}).length,manualTotal:manual.length,manualCorrect:manual.filter(function(r){return r.correct;}).length,needs:(s.records||[]).filter(function(r){return !r.correct;}).length};
  }
  function renderHome(){
    var u=api().getUI(),cs=courses(),chosen=cs.find(function(c){return c.id===u.guideCourseId;})||cs[0], ms=chosen?materials(chosen.id):[];
    var history=data().sessions.filter(function(s){return s.kind==='guided';}).slice(-5).reverse();
    return '<div class="guide-page"><div class="eyebrow">Source-based guided learning</div><h1>Learn it. Practice it. Prove it.</h1><p class="guide-lead">A guided study routine built from your own lecture material. Go through explanations, recall, application, code reasoning and revision — at your pace.</p>'+
    '<div class="guide-rounds">'+rounds.map(function(r,i){return '<div class="guide-round"><span>0'+(i+1)+'</span><strong>'+esc(r.label)+'</strong><small>'+esc(r.caption)+'</small></div>';}).join('')+'</div>'+
    '<section class="card guide-select"><div class="eyebrow">Start a guided lesson</div><h2>Choose a course and lecture</h2>'+
    (ms.length?'<div class="field"><label for="guide-course">Course</label><select id="guide-course">'+cs.map(function(c){return '<option value="'+esc(c.id)+'" '+(c.id===chosen.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select></div><div class="field"><label for="guide-material">Lecture material</label><select id="guide-material">'+ms.map(function(m){return '<option value="'+esc(m.id)+'">'+esc(m.title)+'</option>';}).join('')+'</select></div><p class="hint">Questions are source-linked; short answers, coding, and explanations are self-graded. This is not an AI tutor.</p>'+btn('guide-start',ico('arrow')+' Start guided study','btn-mint','data-id="'+esc(ms[0].id)+'"'):
    '<p>No course materials yet. Upload your PDF or paste notes in a course first; the app will generate a practice question bank.</p>'+btn('quick-import',ico('upload')+' Upload lecture','btn-mint'))+'</section>'+
    '<section class="guide-history"><div class="section-head"><h2>Study tracker</h2><span class="hint">Saved in this browser · included in JSON exports</span></div>'+
    (history.length?history.map(function(s){var m=sourceFor(s),score=sessionScore(s);return '<div class="guide-history-row"><div><strong>'+esc(m?m.title:'Deleted lecture')+'</strong><p>'+esc(s.completedAt?'Completed':'In progress')+' · '+(s.completedAt?'5/5':s.round+'/5')+' rounds · '+score.autoCorrect+'/'+score.autoTotal+' auto-graded correct</p></div>'+btn('guide-resume',s.completedAt?'View report':'Continue','btn-light btn-sm','data-id="'+esc(s.id)+'"')+'</div>';}).join(''):'<p class="hint">Your first guided lesson will appear here.</p>')+'</section></div>';
  }
  function renderQuestion(s,q){
    if(!q)return '<p>Question was deleted. Continue to the next step.</p>';
    var f=s.feedback,answered=!!f, opt=q.type==='mcq'?'<div class="answer-list">'+(q.options||[]).map(function(o,i){return '<button type="button" class="answer-option '+(draft.text===o?'selected':'')+'" data-action="guide-option" data-value="'+esc(o)+'" '+(answered?'disabled':'')+'><span class="option-letter">'+String.fromCharCode(65+i)+'</span>'+esc(o)+'</button>';}).join('')+'</div>':'<label class="field"><span>Your answer — in your own words</span><textarea id="guide-answer" rows="5" '+(answered?'disabled':'')+' placeholder="Recall what the lecture said before revealing the answer...">'+esc(answered?f.response:draft.text)+'</textarea></label>';
    var conf=answered?'':'<div class="confidence-title">How confident are you?</div><div class="confidence-row">'+['low','medium','high'].map(function(k,i){return '<button type="button" class="confidence-option '+(draft.confidence===k?'selected':'')+'" data-action="guide-confidence" data-value="'+k+'">'+['Not sure','Somewhat sure','Very sure'][i]+'</button>';}).join('')+'</div>';
    var info=f?'<div class="guide-reference"><strong>'+esc(f.done?(f.correct?'Correct / got it':'Needs work'):'Compare with your answer')+'</strong><p><b>Reference answer:</b> '+esc(q.answer)+'</p><p>'+esc(q.explanation||'Use the original source to check your answer.')+'</p><details><summary>Show source excerpt'+(q.sourcePage?' (page '+q.sourcePage+')':'')+'</summary><pre>'+esc(q.sourceExcerpt||'Source excerpt unavailable')+'</pre></details>'+(f.correct===false&&f.confidence==='high'?'<p class="gap-alert">High-confidence mistake — added to Weak Spots.</p>':'')+'</div>':'';
    return '<span class="tag">'+esc(q.type==='mcq'?'Auto-graded multiple choice':'Self-graded recall')+'</span><h2>'+esc(q.prompt)+'</h2>'+opt+conf+info+
      (f?(f.done?btn('guide-next','Next step '+ico('arrow'),'btn-mint'):'<p>Compare your explanation with the source. Grade your own response:</p><div class="guide-actions">'+btn('guide-grade','Needs work','btn-danger','data-value="false"')+btn('guide-grade','I got it','btn-mint','data-value="true"')+'</div>'):
      btn('guide-check','Check answer '+ico('arrow'),'btn-mint','id="guide-check" '+(!(draft.text.trim()&&draft.confidence)?'disabled':'')));
  }
  function renderLab(s,kind){
    var q=questionsFor(s)[kind==='apply'?0:Math.min(1,questionsFor(s).length-1)];var code=codeExcerpt(s),ref=(q?.sourceExcerpt||q?.answer||sourceFor(s)?.content||'').slice(0,900);
    var title=kind==='apply'?'Apply the idea':'Debug / test your understanding';
    var prompt=kind==='apply'?'Describe one realistic example where this concept matters. Explain the steps and why it works.':'Read the example and describe its behavior, an edge case to test, and one possible mistake a developer could make.';
    if(!code&&kind==='debug')prompt='Use the lecture passage to describe a misconception or edge case, how you would detect it, and how you would correct it.';
    var f=s.feedback;
    return '<span class="tag">Self-graded reasoning exercise</span><h2>'+esc(title)+'</h2><p>'+esc(prompt)+'</p>'+(!code&&q?'<blockquote class="guide-quote">'+esc(q.prompt)+'</blockquote>':'')+(kind==='debug'&&code?'<pre class="guide-code">'+esc(code)+'</pre>':'')+
      '<label class="field"><span>Your explanation'+(kind==='debug'?' / test idea':'')+'</span><textarea id="guide-answer" rows="7" '+(f?'disabled':'')+' placeholder="Write what you would say during an oral exam...">'+esc(f?f.response:draft.text)+'</textarea></label>'+
      (f?'<div class="guide-reference"><b>Compare with the lecture source</b><pre>'+esc(ref)+'</pre><p><b>Self-check rubric:</b> Did you use the correct terms, explain your reasoning, and give a specific example or test? This app cannot execute or grade Python code.</p></div>'+(f.done?btn('guide-next','Continue '+ico('arrow'),'btn-mint'):'<div class="guide-actions">'+btn('guide-grade','Needs work','btn-danger','data-value="false"')+btn('guide-grade','Meets the rubric','btn-mint','data-value="true"')+'</div>'):
      btn('guide-check','Compare with source '+ico('arrow'),'btn-mint','id="guide-check" '+(draft.text.trim().length<5?'disabled':'')));
  }
  function renderSession(){
    var s=current();if(!s)return renderHome();if(s.completedAt)return renderReport(s);
    var itemList=items(s),round=rounds[s.round],item=itemList[s.index],max=Math.max(1,itemList.length);
    var body=round.id==='understand'?'<span class="tag">Original source passage · '+(s.index+1)+'/'+max+'</span><h2>Read, then explain it aloud.</h2><p>Before proceeding, summarize this in your own words. You can open the original lecture if you need more context.</p><blockquote class="guide-quote">'+esc(item?.text||'No source passage available')+'</blockquote>'+(item?.page?'<p class="hint">Source: page '+esc(item.page)+'</p>':'')+btn('guide-next','I understand — next '+ico('arrow'),'btn-mint'):
      round.id==='recall'||round.id==='revise'?renderQuestion(s,item):renderLab(s,round.id);
    var m=sourceFor(s),progress=Math.round((s.round+s.index/max)/rounds.length*100);
    return '<div class="guide-page"><div class="guide-breadcrumb">'+btn('guide-home',ico('back')+' Guided Study','btn-light btn-sm')+'<span>'+esc(m?m.title:'Lecture')+'</span></div><div class="guide-steps">'+rounds.map(function(r,i){return '<div class="guide-step '+(i===s.round?'current':i<s.round?'complete':'')+'"><span>'+(i<s.round?'✓':i+1)+'</span><small>'+esc(r.label)+'</small></div>';}).join('')+'</div><div class="quiz-progress guide-progress"><div style="width:'+progress+'%"></div></div><div class="guide-session-head"><div><div class="eyebrow">ROUND '+(s.round+1)+' OF 5 · STEP '+(s.index+1)+' / '+max+'</div><h1>'+esc(round.label)+'</h1><p>'+esc(round.caption)+'</p></div><span class="tag">Progress saved</span></div><section class="card guide-lesson">'+body+'</section><p class="hint" style="text-align:center">Source-grounded prompts; no AI grading or code execution. Your choices and progress are saved in this browser.</p></div>';
  }
  function renderReport(s){
    var sc=sessionScore(s),m=sourceFor(s),questions=(s.records||[]).filter(function(r){return r.kind==='question';});
    var weakness=questions.filter(function(r){return !r.correct;}).map(function(r){return data().questions.find(function(q){return q.id===r.questionId;});}).filter(Boolean);
    return '<div class="guide-page"><div class="eyebrow">Guided lesson complete</div><h1>You finished the study path.</h1><p class="guide-lead">'+esc(m?m.title:'Lecture')+' · Your recorded results, not a predicted exam grade.</p><div class="stats-grid">'+[
      ['Auto-graded',''+sc.autoCorrect+' / '+sc.autoTotal,'Question checks'],['Self-graded',''+sc.manualCorrect+' / '+sc.manualTotal,'Your own assessments'],['To review',''+sc.needs,'Answers marked needs work'],['Stages','5 / 5','Guided rounds completed']
    ].map(function(x){return '<div class="stat"><div class="stat-label">'+esc(x[0])+'</div><div class="stat-number">'+esc(x[1])+'</div><div class="stat-foot">'+esc(x[2])+'</div></div>';}).join('')+'</div><section class="card guide-report"><h2>Revision priorities</h2>'+(weakness.length?'<div class="guide-weak">'+weakness.slice(0,5).map(function(q){return '<p>• '+esc(q.prompt)+'</p>';}).join('')+'</div>':'<p>No missed quiz questions in this session. Continue to revisit other material over time.</p>')+'<p class="hint">Your quiz responses also contribute to Syllasprint’s Weak Spots tracker. Open-ended exercises are explicitly self-graded.</p><div class="guide-actions">'+btn('guide-restart','Study this lecture again','btn-mint','data-id="'+esc(s.sourceId)+'"')+btn('guide-home','Choose another lecture','btn-light')+btn('navigate','Weak Spots '+ico('arrow'),'btn-light','data-id="weak"')+'</div></section></div>';
  }
  function start(materialId){
    var m=data().materials.find(function(m){return m.id===materialId;});if(!m){api().toast('Choose a lecture first.',true);return;}
    var newSession={kind:'guided',id:api().C.uid('guided'),courseId:m.courseId,sourceId:m.id,round:0,index:0,recallIds:[],reviseIds:[],records:[],feedback:null,startedAt:new Date().toISOString(),completedAt:null};
    newSession.recallIds=questionIds(newSession,'recall');
    if(!newSession.recallIds.length){api().toast('No questions for this source yet. Add some questions before starting.',true);return;}
    data().sessions.push(newSession);api().getUI().guideId=newSession.id;save();resetDraft();api().goto('guide-session');
  }
  function advance(s){
    s.feedback=null;s.index++;resetDraft();
    var count=items(s).length;
    if(s.index>=count){s.index=0;s.round++;if(s.round===4)s.reviseIds=questionIds(s,'revise');if(s.round>=5)s.completedAt=new Date().toISOString();}
    save();api().render();
  }
  function record(s,q,correct,selfGraded,confidence,response){
    if(q)api().C.addAttempt(data(),s.id,q,response,confidence,correct);
    s.records.push({kind:q?'question':s.round===2?'apply':'debug',questionId:q?q.id:null,correct:correct,selfGraded:selfGraded,confidence:confidence,response:response,at:new Date().toISOString()});
  }
  function act(action,d){
    var u=api().getUI(),s=current();
    if(action==='guide-home'){api().goto('guide');return;}
    if(action==='guide-start'||action==='guide-start-material'||action==='guide-restart'){start(action==='guide-start'?(document.getElementById('guide-material')?.value||d.id):d.id);return;}
    if(action==='guide-resume'){u.guideId=d.id;resetDraft();api().goto('guide-session');return;}
    if(action==='guide-option'){if(s&&!s.feedback){draft.text=d.value;api().render();}return;}
    if(action==='guide-confidence'){if(s&&!s.feedback){draft.confidence=d.value;api().render();}return;}
    if(!s||s.completedAt)return;
    if(action==='guide-next'){if(rounds[s.round].id==='understand'||s.feedback?.done){advance(s);}return;}
    if(action==='guide-check'){
      if(s.feedback)return;
      var stage=rounds[s.round].id;
      if(!draft.text.trim()||(stage==='recall'||stage==='revise')&&!draft.confidence){api().toast('Write an answer and choose your confidence first.',true);return;}
      var q=(stage==='recall'||stage==='revise')?items(s)[s.index]:null;
      if(q&&q.type==='mcq'){
        var correct=draft.text===q.answer;record(s,q,correct,false,draft.confidence,draft.text);
        s.feedback={done:true,correct:correct,confidence:draft.confidence,response:draft.text};
      }else{s.feedback={done:false,correct:null,confidence:draft.confidence||'',response:draft.text};}
      save();api().render();return;
    }
    if(action==='guide-grade'){
      if(!s.feedback||s.feedback.done)return;
      var stage=rounds[s.round].id,q=(stage==='recall'||stage==='revise')?items(s)[s.index]:null,correct=d.value==='true';
      record(s,q,correct,true,s.feedback.confidence,s.feedback.response);
      s.feedback.done=true;s.feedback.correct=correct;save();api().render();return;
    }
  }
  function change(e){if(e.target.id==='guide-course'){api().getUI().guideCourseId=e.target.value;api().render();}}
  function input(e){if(e.target.id==='guide-answer'){draft.text=e.target.value;var b=document.getElementById('guide-check');if(b)b.disabled=draft.text.trim().length<5||(current()&&(rounds[current().round].id==='recall'||rounds[current().round].id==='revise')&&!draft.confidence);}}
  function init(options){ctx=options;document.addEventListener('change',change);document.addEventListener('input',input);}
  root.SyllaGuide={init:init,renderHome:renderHome,renderSession:renderSession,act:act,start:start};
})(globalThis);