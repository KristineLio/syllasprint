/* Syllasprint — zero-dependency application shell. All user data stays in this browser. */
(function () {
  'use strict';
  var C = globalThis.SyllaCore, M = globalThis.SyllaCommute, B = globalThis.SyllaCanvas;
  var state;
  try {
    var raw = localStorage.getItem(C.STORAGE_KEY);
    state = raw ? C.cleanState(JSON.parse(raw)) : C.emptyState();
  } catch (error) {
    state = C.emptyState();
    document.addEventListener('DOMContentLoaded', function(){ toast('Saved data could not be read. Use Import to restore a backup.', true); });
  }
  var ui = { page:'dashboard', courseId:null, quiz:null, search:'', topicFilter:'all', weakFilter:'all', setupCourseId:'', setupMode:'all', importAfterCreate:false, importedPdf:false, guideId:null, guideCourseId:null, canvasCourseId:'', canvasLinkFrom:'' };
  var speaker=M.makeSpeaker();
  var commuteCourseId='', commuteMinutes=10, commuteResultId=null;
  var el = function (id) { return document.getElementById(id); };
  var iconPaths={
    home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    book:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
    exam:'<rect x="5" y="3" width="14" height="19" rx="2"/><path d="M9 3.5h6M9 9h6m-6 4h6m-6 4h3"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',arrow:'<path d="M5 12h14m-7-7 7 7-7 7"/>',back:'<path d="M19 12H5m7-7-7 7 7 7"/>',
    chevron:'<path d="m9 18 6-6-6-6"/>',check:'<path d="m4 12 5 5L20 6"/>',clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    spark:'<path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8z"/>',
    close:'<path d="M18 6 6 18M6 6l12 12"/>',more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    download:'<path d="M12 3v12m-5-5 5 5 5-5M5 18v3h14v-3"/>',upload:'<path d="M12 17V5m-5 5 5-5 5 5M5 18v3h14v-3"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',edit:'<path d="m15 5 4 4M4 20l4-1 11-11a3 3 0 0 0-4-4L4 15z"/>',
    trash:'<path d="M3 6h18m-2 0-1 15H6L5 6m4-3h6m-5 7v7m4-7v7"/>',search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    shield:'<path d="M12 2 4 5v6c0 5 3 9 8 11 5-2 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
    warning:'<path d="m12 3 10 18H2z"/><path d="M12 9v5m0 3h.01"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 10h18"/>',
    canvas:'<rect x="2" y="2" width="9" height="8" rx="1"/><rect x="14" y="6" width="8" height="8" rx="1"/><rect x="5" y="15" width="8" height="7" rx="1"/><path d="M11 6h3M9 10v5m5-5 3 0"/>'
  };
  function ico(name){return '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">'+(iconPaths[name]||iconPaths.spark)+'</svg>';}
  function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function fmt(iso){if(!iso)return 'No exam date';var d=new Date(iso.length===10?iso+'T12:00:00':iso);return isNaN(d.getTime())?'Unknown date':d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'});}
  function timeUntilDate(value){if(!value)return 'Set an exam date';var today=new Date();today.setHours(0,0,0,0);var target=new Date(value+'T00:00:00');var n=Math.round((target-today)/86400000);return n<0?'Exam date passed':n===0?'Exam today':n===1?'Exam tomorrow':n+' days until exam';}
  function textButton(action,text,kind,attrs){return '<button type="button" class="btn '+(kind||'')+'" data-action="'+esc(action)+'" '+(attrs||'')+'>'+text+'</button>';}
  function persist(){try{localStorage.setItem(C.STORAGE_KEY,JSON.stringify(state));return true;}catch(e){toast('Storage is full or unavailable. Export your data to protect it.',true);return false;}}
  function toast(message,error){var r=el('toast-region');if(!r)return;var node=document.createElement('div');node.className='toast'+(error?' error':'');node.textContent=message;r.appendChild(node);setTimeout(function(){node.remove();},4300);}
  function goto(page,courseId){if(ui.page==='commute-session'&&page!=='commute-session')speaker.stop();ui.page=page;if(courseId!==undefined)ui.courseId=courseId;ui.search='';render();window.scrollTo({top:0,behavior:'instant'});}
  function navLinks(){return [{id:'dashboard',label:'Dashboard',icon:'home'},{id:'courses',label:'Courses',icon:'book'},{id:'guide',label:'Study Mode',icon:'spark'},{id:'commute',label:'Commute Mode',icon:'clock'},{id:'canvas',label:'Study Canvas',icon:'canvas'},{id:'exam',label:'Exam Room',icon:'exam'},{id:'weak',label:'Weak Spots',icon:'target'}];}
  function activeNav(id){return (ui.page==='course'&&id==='courses')||(ui.page==='guide-session'&&id==='guide')||(ui.page==='commute-session'&&id==='commute')||(ui.page==='commute-report'&&id==='commute')||((ui.page==='quiz'||ui.page==='results')&&id==='exam')||ui.page===id;}
  function renderShell(){
    el('sidebar').innerHTML='<div><div class="logo"><span class="logo-mark">ϟ</span><span>syllasprint<span style="color:var(--mint)">.</span></span></div><p class="sidebar-small">YOUR WORKSPACE</p><nav class="side-nav" aria-label="Main navigation">'+navLinks().map(function(n){return '<button class="nav-link '+(activeNav(n.id)?'active':'')+'" data-action="navigate" data-id="'+n.id+'">'+ico(n.icon)+' '+esc(n.label)+'</button>';}).join('')+'</nav></div><div class="sidebar-foot"><p class="quick-label">YOUR LEARNING SPACE</p><div class="side-course"><div><strong>'+esc(state.courses.length?state.courses[0].name:'Your first course')+'</strong><small>'+state.courses.length+' course'+(state.courses.length===1?'':'s')+' · Browser only</small></div><span class="side-stamp">✦</span></div><div class="side-note">Your notes and exam history stay on this device. Export a backup anytime.</div></div>';
    el('mobile-nav').innerHTML=navLinks().map(function(n){return '<button class="mob-link '+(activeNav(n.id)?'active':'')+'" data-action="navigate" data-id="'+n.id+'">'+ico(n.icon)+'<span>'+esc(n.label)+'</span></button>';}).join('');
    var titles={dashboard:'Overview',courses:'My courses',course:'Course workspace',guide:'Guided Study', 'guide-session':'Study Mode',commute:'Commute Mode','commute-session':'Listen & Recall','commute-report':'Commute review',canvas:'Study Canvas',exam:'Practice setup',quiz:'Exam Room',results:'Exam results',weak:'Confidence gaps'};
    el('topbar').innerHTML='<div class="topbar-left">'+ico('spark')+' Syllasprint <span class="build-version">V2.5</span><span style="color:#a0aba9">/</span> '+esc(titles[ui.page]||'Workspace')+'</div><div class="topbar-actions"><span class="top-chip">'+ico('shield')+' Local-first</span>'+textButton('quick-import',ico('upload')+' <span class="upload-label">Add material</span><span class="upload-short">PDF</span>','btn-sm btn-mint topbar-upload')+textButton('new-course',ico('plus')+' Add course','btn-sm')+'</div>';
  }
  function pageTitle(eyebrow,title,subtitle,action){return '<div class="page-heading"><div><div class="eyebrow">'+esc(eyebrow)+'</div><h1>'+title+'</h1><p>'+subtitle+'</p></div>'+(action?'<div class="right">'+action+'</div>':'')+'</div>';}
  function empty(iconName,title,desc,action){return '<div class="empty"><div class="empty-icon">'+ico(iconName)+'</div><h3>'+title+'</h3><p>'+desc+'</p>'+(action||'')+'</div>';}
  function courseCard(c){var qcount=state.questions.filter(function(q){return q.courseId===c.id;}).length;return '<div class="course-row"><div class="course-left"><span class="course-icon '+(c.isDemo?'warm':'')+'">'+ico('book')+'</span><div style="min-width:0"><div class="course-title">'+esc(c.name)+'</div><div class="course-meta">'+qcount+' question'+(qcount===1?'':'s')+' · '+esc(timeUntilDate(c.examDate))+'</div></div></div><div class="course-actions">'+(c.isDemo?'<span class="tag tag-yellow">SAMPLE</span>':'')+'<button class="icon-button" data-action="open-course" data-id="'+esc(c.id)+'" aria-label="Open '+esc(c.name)+'">'+ico('chevron')+'</button></div></div>';}
  function metric(iconName,title,value,foot){return '<div class="stat"><div class="stat-label">'+ico(iconName)+' '+esc(title)+'</div><div class="stat-number">'+esc(value)+'</div><div class="stat-foot">'+esc(foot)+'</div></div>';}
  function renderDashboard(){var s=C.computeStats(state);var courses=state.courses.slice(0,4);
    var hero='<section class="hero"><div class="hero-text"><div class="hero-kicker">Your study advantage</div><h2>Know your weak spots <span style="color:var(--mint)">before exam day.</span></h2><p>Stop memorizing what feels familiar. Practice, spot confident mistakes, and focus on what actually needs work.</p><div class="hero-actions">'+textButton('demo',ico('spark')+' Try a 60-second exam','btn-mint')+textButton('navigate',ico('book')+' Guided Study','hero-outline','data-id="guide"')+textButton('navigate',ico('clock')+' Listen on your commute','hero-outline','data-id="commute"')+textButton('quick-import',ico('upload')+' Upload PDF / notes','hero-outline')+'</div></div><div class="hero-art"><div class="orbit"></div><div class="orbit"></div><div class="orbit"></div><div class="hero-core"><span>?</span><small>know it?</small></div><div class="hero-floating one">'+ico('check')+' One question at a time</div><div class="hero-floating two"><span class="float-dot"></span>Confidence gap spotted</div></div></section>';
    return pageTitle('Welcome to your exam comeback','Study smarter.<br>Show up ready.','The best time to discover a knowledge gap is before your exam.')+hero+
      '<section aria-label="Your study statistics" class="stats-grid">'+metric('book','Courses',s.courses,'Learning spaces')+metric('exam','Practiced',s.attempted,'Distinct questions')+metric('target','Confidence gaps',s.gaps,'Unresolved, high-confidence misses')+metric('check','Observed accuracy',s.accuracy===null?'—':s.accuracy+'%',s.accuracy===null?'Take a quiz to begin':'Auto-graded attempts')+'</section>'+
      '<div class="two-col"><section><div class="section-head"><h2>Your courses</h2><button class="text-link" data-action="navigate" data-id="courses">View all '+ico('arrow')+'</button></div>'+(courses.length?'<div class="course-list">'+courses.map(courseCard).join('')+'</div>':empty('book','Start with one course','Add your own subject and notes, or try the built-in networking exam.',textButton('new-course',ico('plus')+' Create course','btn-mint')))+'</section><aside><div class="section-head"><h2>Why confidence matters</h2></div><div class="tip-card">'+ico('target')+'<h3>Wrong + very sure?<br>That is your signal.</h3><p>A confidence gap is a wrong answer given with high confidence. Syllasprint flags it until you get it right on a later attempt.</p>'+textButton('navigate','View weak spots '+ico('arrow'),'btn-sm','data-id="weak"')+'</div></aside></div>'+
      renderDataNote();
  }
  function renderDataNote(){return '<div class="data-note"><div>'+ico('shield')+' <strong>Private to this browser.</strong> Your courses are stored locally, not synced. Clearing site data can erase them.</div><div class="split-actions">'+textButton('export',ico('download')+' Export JSON','btn-light btn-sm')+textButton('import',ico('upload')+' Import','btn-light btn-sm')+'</div></div>';}
  function renderCourses(){var filtered=state.courses.filter(function(c){return c.name.toLowerCase().includes(ui.search.toLowerCase());});
    return pageTitle('Your subjects','Course library','Keep readings, PDF lectures and practice questions organized by course.',textButton('new-course',ico('plus')+' New course','btn-mint'))+
      '<div class="filter-row"><input id="course-search" class="search-box" type="search" placeholder="Search courses..." aria-label="Search courses" value="'+esc(ui.search)+'" /></div>'+
      (filtered.length?'<div class="library-grid">'+filtered.map(function(c){var s=C.computeStats(state,c.id);return '<article class="library-card"><div><span class="tag '+(c.isDemo?'tag-yellow':'tag-mint')+'">'+(c.isDemo?'SAMPLE COURSE':'YOUR COURSE')+'</span><h3>'+esc(c.name)+'</h3><p>'+s.questions+' questions · '+s.attempted+' practiced · '+esc(timeUntilDate(c.examDate))+'</p></div><div class="bottom"><span class="tag">'+(s.accuracy===null?'No quiz yet':s.accuracy+'% observed')+'</span>'+textButton('open-course','Open '+ico('arrow'),'btn-sm','data-id="'+esc(c.id)+'"')+'</div></article>';}).join('')+'</div>':empty('book',ui.search?'No matching courses':'No courses yet',ui.search?'Try searching a different name.':'Create a course or launch a sample exam to explore.',textButton('new-course','Add a course','btn-mint')))+renderDataNote();
  }
  function renderCourse(){var c=state.courses.find(function(x){return x.id===ui.courseId;});if(!c)return empty('warning','Course not found','This course may have been deleted.',textButton('navigate','Back to courses','btn-mint','data-id="courses"'));
    var qs=state.questions.filter(function(q){return q.courseId===c.id && (ui.topicFilter==='all'||q.topicId===ui.topicFilter)});
    var materials=state.materials.filter(function(m){return m.courseId===c.id});var topics=state.topics.filter(function(t){return t.courseId===c.id});var s=C.computeStats(state,c.id);
    var topicFilter='<select id="topic-filter" aria-label="Filter questions by topic"><option value="all">All topics</option>'+topics.map(function(t){return '<option value="'+esc(t.id)+'" '+(ui.topicFilter===t.id?'selected':'')+'>'+esc(t.name)+'</option>';}).join('')+'</select>';
    return pageTitle('Course workspace',esc(c.name),esc(timeUntilDate(c.examDate))+' · '+s.questions+' questions · '+s.attempted+' practiced',textButton('course-edit',ico('edit')+' Edit','btn-light','data-id="'+esc(c.id)+'"')+textButton('course-delete',ico('trash')+' Delete','btn-danger','data-id="'+esc(c.id)+'"')+(c.isDemo?textButton('remove-demo','Remove sample','btn-light',''):'') )+
      '<div class="mini-grid"><div class="card"><div class="eyebrow">Questions ready</div><h2 style="font-size:34px;margin:6px 0">'+s.questions+'</h2><p>Add a note or write questions manually.</p></div><div class="card"><div class="eyebrow">Your confidence gaps</div><h2 style="font-size:34px;margin:6px 0">'+s.gaps+'</h2><p>Resolved after a correct retake.</p></div></div>'+
      '<div class="canvas-course-callout"><div><strong>Study Canvas</strong><p>Arrange sticky notes and connect concepts for this course.</p></div>'+textButton('canvas-open',ico('canvas')+' Open study canvas','btn-sm btn-mint','data-id="'+esc(c.id)+'"')+'</div>'+
      '<div class="section-head"><h2>Course materials</h2>'+textButton('add-material',ico('upload')+' Add PDF / notes','btn-sm btn-mint','data-id="'+esc(c.id)+'"')+'</div>'+
      (materials.length?'<div class="course-list">'+materials.map(function(m){return '<div class="course-row"><div class="course-left"><span class="course-icon blue">'+ico('book')+'</span><div><div class="course-title">'+esc(m.title)+'</div><div class="course-meta">'+(m.content||'').length+' characters of source text</div></div></div><div class="course-actions">'+textButton('guide-start-material',ico('spark')+' Study','btn-sm btn-mint','data-id="'+esc(m.id)+'"')+textButton('view-material','Read','btn-sm btn-light','data-id="'+esc(m.id)+'"')+textButton('delete-material',ico('trash'),'btn-sm btn-danger','data-id="'+esc(m.id)+'"')+'</div></div>';}).join('')+'</div>':empty('book','No notes yet','Upload a text-based lecture PDF or paste ordinary notes. Source-grounded recall questions are created for review.',textButton('add-material','Add course material','btn-mint','data-id="'+esc(c.id)+'"')))+
      '<div class="section-head"><h2>Question bank</h2>'+textButton('new-question',ico('plus')+' Add question','btn-sm','data-id="'+esc(c.id)+'"')+'</div><div class="filter-row">'+topicFilter+textButton('start-course-quiz',ico('arrow')+' Practice now','btn-sm btn-mint','data-id="'+esc(c.id)+'" '+(!s.questions?'disabled':''))+'</div>'+
      (qs.length?'<div class="question-list">'+qs.map(function(q){var topic=state.topics.find(function(t){return t.id===q.topicId;});return '<div class="question-row"><div><span class="tag">'+esc(q.type==='mcq'?'MULTIPLE CHOICE':'SELF-GRADED')+'</span> '+(C.isGap(state,q)?'<span class="tag tag-coral">CONFIDENCE GAP</span>':'')+'<h3>'+esc(q.prompt)+'</h3><p>'+esc(topic?topic.name:'General')+' · '+esc(q.origin==='source-recall'?'source-grounded recall · self-graded':(q.origin==='source-cloze'?'source cloze · auto-graded':(q.origin||'manual')))+'</p></div><div class="q-right">'+textButton('canvas-pin',ico('canvas')+' Pin','btn-light btn-sm','data-id="'+esc(q.id)+'" aria-label="Pin question to Study Canvas"')+textButton('edit-question',ico('edit'),'btn-light btn-sm','data-id="'+esc(q.id)+'" aria-label="Edit question"')+textButton('delete-question',ico('trash'),'btn-danger btn-sm','data-id="'+esc(q.id)+'" aria-label="Delete question"')+'</div></div>';}).join('')+'</div>':empty('exam','No questions yet','Add one manually or parse structured notes to build your exam.'));
  }
  function renderExamSetup(){var cid=ui.setupCourseId || (state.courses[0]&&state.courses[0].id)||'';var c=state.courses.find(function(x){return x.id===cid;});var qs=state.questions.filter(function(q){return q.courseId===cid;});var weak=C.findWeak(state,cid);var count=ui.setupMode==='weak'?weak.length:qs.length;
    return pageTitle('Time to test yourself','The Exam Room','Small practice sessions. Clear feedback. Real progress.')+
      '<div class="two-col"><section class="card"><form id="quiz-setup-form" data-form="quiz-start"><div class="eyebrow">Set up a session</div><h2 style="margin:7px 0 23px">Build your practice exam</h2><div class="field"><label for="exam-course">Course</label><select name="courseId" id="exam-course" required>'+state.courses.map(function(x){return '<option value="'+esc(x.id)+'" '+(x.id===cid?'selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select></div><div class="field"><label for="exam-mode">Question pool</label><select id="exam-mode" name="mode"><option value="all">All questions</option><option value="weak" '+(ui.setupMode==='weak'?'selected':'')+'>Weak spots only</option></select></div><div class="field"><label for="exam-count">Number of questions</label><select name="count" id="exam-count">'+([5,10,20].filter(function(n){return n<=count;}).concat(count>0?[count]:[]).filter(function(n,i,a){return a.indexOf(n)===i;})).map(function(n){return '<option value="'+n+'">'+(n===count&&n!==5&&n!==10&&n!==20?'All available ('+n+')':n+' questions')+'</option>';}).join('')+'</select><span class="hint">'+count+' question'+(count===1?'':'s')+' available in this pool.</span></div><button class="btn btn-mint btn-full" type="submit" '+(!count?'disabled':'')+'>'+ico('arrow')+' Start practice</button></form>'+(count?'':'<div class="notice" style="margin-top:15px">No questions available for this selection. Create questions or choose another pool.</div>')+'</section><aside class="tip-card">'+ico('spark')+'<h3>Confidence before correctness.</h3><p>For every answer, choose how sure you feel. The app then flags incorrect answers given with high confidence, so you can target the hidden gaps.</p><div style="margin-top:20px" class="steps"><span class="step">01 Answer</span><span class="step">02 Rate</span><span class="step">03 Improve</span></div></aside></div>'+
      (!state.courses.length?'<div style="margin-top:22px">'+empty('exam','Nothing to practice yet','Try the sample exam to see how it works.',textButton('demo','Try sample exam','btn-mint'))+'</div>':'');
  }
  function getQuizQuestion(){return ui.quiz&&state.questions.find(function(q){return q.id===ui.quiz.questionIds[ui.quiz.index];});}
  function renderQuiz(){var z=ui.quiz;if(!z)return renderExamSetup();var q=getQuizQuestion();if(!q)return empty('warning','Question unavailable','Return to the exam setup.',textButton('navigate','Back to exam room','btn-mint','data-id="exam"'));
    var n=z.questionIds.length, answered=z.answered, progress=Math.round(z.index/n*100);
    var answers=q.type==='mcq'?'<div class="answer-list">'+q.options.map(function(option,i){var chosen=z.choice===option;var cls=answered?(option===q.answer?' correct':chosen?' wrong':''):chosen?' selected':'';return '<button type="button" class="answer-option'+cls+'" data-action="choose-answer" data-value="'+esc(option)+'" '+(answered?'disabled':'')+' aria-pressed="'+(chosen?'true':'false')+'"><span class="option-letter">'+String.fromCharCode(65+i)+'</span>'+esc(option)+'</button>';}).join('')+'</div>':'<div class="field"><label for="free-response">Your answer</label><textarea id="free-response" placeholder="Explain this in your own words..." '+(answered?'disabled':'')+'>'+esc(z.choice||'')+'</textarea><span class="hint">Short answers are self-graded. Compare your response with the reference answer.</span></div>';
    var confidences=[{id:'low',label:'Not sure'},{id:'medium',label:'Somewhat sure'},{id:'high',label:'Very sure'}];
    var confidence='<div class="confidence-title">How confident are you?</div><div class="confidence-row">'+confidences.map(function(c){return '<button type="button" class="confidence-option '+(z.confidence===c.id?'selected':'')+'" data-action="choose-confidence" data-value="'+c.id+'" aria-pressed="'+(z.confidence===c.id?'true':'false')+'" '+(answered?'disabled':'')+'>'+c.label+'</button>';}).join('')+'</div>';
    var feedback='';if(z.revealed){
      var a=z.lastAttempt, correct=a?a.correct:null;
      feedback='<div class="feedback '+(a&&!correct?'error':'')+'"><h3>'+((a?correct:q.type==='short')?ico('check'):'')+(a?(correct?'Correct — keep it up.':'Not quite. Here is what to review.'): 'Compare with the source answer')+'</h3><p><strong>Answer:</strong> '+esc(q.answer)+'</p><p style="margin-top:7px">'+esc(q.explanation||'Review your source material.')+'</p><div class="answer-note"><strong>Source:</strong> '+esc(q.sourceExcerpt||'From your course notes')+'</div>'+(a&&!correct&&a.confidence==='high'?'<div class="gap-alert">'+ico('warning')+' Confidence Gap detected · High priority</div>':'')+'</div>';
    }
    var action='';if(!z.revealed){action='<button class="btn btn-mint" data-action="'+(q.type==='mcq'?'check-answer':'reveal-short')+'" '+((!z.confidence||!z.choice.trim())?'disabled':'')+'>'+ico('check')+' '+(q.type==='mcq'?'Check answer':'Reveal reference answer')+'</button>';}else if(q.type==='short'&&!z.answered){action='<div class="split-actions">'+textButton('grade-short','Needs work','btn-danger','data-value="false"')+textButton('grade-short','I got it '+ico('check'),'btn-mint','data-value="true"')+'</div>';}else{action=textButton('next-question',z.index===n-1?'See my results '+ico('arrow'):'Next question '+ico('arrow'),'btn-mint');}
    return '<div class="quiz-shell"><div class="quiz-head"><button class="text-link" data-action="navigate" data-id="exam">'+ico('back')+' Exit session</button><span class="tag">QUESTION '+(z.index+1)+' / '+n+'</span></div><div class="quiz-progress"><div style="width:'+progress+'%"></div></div><div class="quiz-card"><div class="eyebrow">'+esc(q.type==='mcq'?'Multiple choice':'Short answer · self-graded')+'</div><h2>'+esc(q.prompt)+'</h2>'+answers+(z.revealed?'':confidence)+feedback+'<div class="quiz-actions"><span class="hint">'+(z.revealed?'Use the explanation to learn.':'No rush — accuracy matters more than speed.')+'</span>'+action+'</div></div><p class="hint" style="text-align:center;margin-top:21px">Your answers are stored locally in this browser.</p></div>';
  }
  function renderResults(){var z=ui.quiz;if(!z)return renderExamSetup();var as=state.attempts.filter(function(a){return a.sessionId===z.sessionId;});var auto=as.filter(function(a){return a.gradingMethod==='automatic';});var correct=as.filter(function(a){return a.correct;}).length;var gaps=as.filter(function(a){return !a.correct&&a.confidence==='high';}).length;var cid=z.courseId;
    var session=state.sessions.find(function(x){return x.id===z.sessionId;});
    var initialGaps=session&&session.initialGaps||[];
    var resolved=initialGaps.filter(function(id){var q=state.questions.find(function(x){return x.id===id;});return q&&!C.isGap(state,q)&&C.latestAttempt(state,id)&&C.latestAttempt(state,id).correct;}).length;
    var improvement=resolved?'<div class="victory-note">'+ico('check')+' <strong>'+resolved+' confidence gap'+(resolved===1?'':'s')+' resolved this session.</strong> Those earlier mistakes are still in your history, but no longer count as unresolved gaps.</div>':'';
    return pageTitle('Session complete','Progress, not perfection.','The best result is knowing what to work on next.')+'<div class="result-banner"><div><div class="eyebrow" style="color:var(--mint)">Exam summary</div><h2>'+correct+' of '+as.length+' marked correct</h2><p>'+(auto.length?'Auto-graded accuracy: '+Math.round(100*auto.filter(function(a){return a.correct;}).length/auto.length)+'%. ':'')+'Short-answer results are self-reported.</p></div><div class="result-number">'+as.length+' ✓</div></div><div class="stats-grid">'+metric('exam','Questions completed',as.length,'This session')+metric('check','Marked correct',correct,'Includes self-grading')+metric('target','Confidence gaps',gaps,'High-confidence mistakes')+metric('clock','Need work',as.length-correct,'Questions to revisit')+'</div>'+improvement+'<div class="section-head"><h2>What comes next?</h2></div><div class="card"><p>Retake the questions you missed, or return to your course to create more practice material. Your previous attempts remain in your history.</p><div class="split-actions" style="margin-top:19px">'+textButton('retake-weak',ico('target')+' Retake weak spots','btn-mint','data-id="'+esc(cid)+'"')+textButton('open-course','Open course '+ico('arrow'),'btn-light','data-id="'+esc(cid)+'"')+textButton('navigate','Dashboard','btn-light','data-id="dashboard"')+'</div></div>';
  }
  function renderWeak(){var qs=C.findWeak(state);if(ui.weakFilter!=='all')qs=qs.filter(function(q){return q.courseId===ui.weakFilter;});var gaps=qs.filter(function(q){return C.isGap(state,q);});var other=qs.filter(function(q){return !C.isGap(state,q);});var content=qs.map(function(q){var c=state.courses.find(function(x){return x.id===q.courseId;});var a=C.latestAttempt(state,q.id);return '<article class="weak-item"><div><span class="tag '+(C.isGap(state,q)?'tag-coral':'tag-yellow')+'">'+(C.isGap(state,q)?'CONFIDENCE GAP':'NEEDS PRACTICE')+'</span><h3>'+esc(q.prompt)+'</h3><p>'+esc(c?c.name:'Unknown course')+' · Last response: '+esc(a&&a.gradingMethod==='self-reported'?'Self-graded':'Auto-graded')+' · '+esc(a?fmt(a.answeredAt):'')+'</p></div>'+textButton('retake-one','Retake '+ico('arrow'),'btn-light btn-sm','data-id="'+esc(q.id)+'"')+'</article>';}).join('');
    return pageTitle('Your blind spots','Make mistakes useful.','A high-confidence wrong answer is a signal, not a setback.',textButton('retake-weak',ico('arrow')+' Practice all weak spots','btn-mint',qs.length?'':'disabled'))+
      '<div class="mini-grid"><div class="card"><div class="eyebrow">Unresolved confidence gaps</div><h2 style="font-size:34px;margin:7px 0">'+gaps.length+'</h2><p>High-confidence misses from latest attempts.</p></div><div class="card"><div class="eyebrow">Other questions to revisit</div><h2 style="font-size:34px;margin:7px 0">'+other.length+'</h2><p>Incorrect or marked "Needs work."</p></div></div><div class="filter-row"><select id="weak-course" aria-label="Filter weak spots by course"><option value="all">All courses</option>'+state.courses.map(function(c){return '<option value="'+esc(c.id)+'" '+(ui.weakFilter===c.id?'selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select></div>'+
      (qs.length?'<div class="weak-grid">'+content+'</div>':empty('target','No weak spots in this view','Complete an exam to discover what needs work. Correct retakes clear unresolved gaps.',textButton('navigate','Go to Exam Room','btn-mint','data-id="exam"')))+
      '<div class="callout" style="margin-top:18px">'+ico('info')+' <strong>How it works:</strong> Weak spots use the latest attempt for each question. Old attempts are retained for your progress history. Getting a question right later resolves its active gap.</div>';
  }
  function timeLabel(seconds){var n=Math.max(0,Number(seconds)||0);return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
  function renderCommuteHome(){
    var store=M.ensure(state),running=M.active(state),courseId=commuteCourseId||state.courses[0]?.id||'',available=state.questions.filter(function(q){return q.courseId===courseId&&M.eligible(q);});
    var recent=store.sessions.filter(function(x){return x.completedAt;}).slice(0,3);
    return '<div class="commute-page">'+pageTitle('Learn anywhere','Commute Mode','Your own course material, read aloud as short source-linked recall sessions.')+
      '<section class="commute-hero"><span class="commute-label">LISTEN · THINK · REVEAL · REVIEW</span><h2>Turn spare minutes into study time.</h2><p>Questions come from your saved courses. Listen with headphones or read the same cards silently. Review difficult questions again later.</p><span class="commute-note">Audio works only where your browser supports speech synthesis. Keep this tab open; background playback and offline voices aren’t guaranteed.</span></section>'+
      (running?'<section class="card commute-resume"><h2>Your unfinished commute</h2><p>'+esc(running.minutes)+'-minute session · '+running.index+' / '+running.questionIds.length+' cards completed</p>'+textButton('commute-resume','Resume where I stopped','btn-mint')+' '+textButton('commute-finish','End and save this session','btn-light')+'</section>':'')+
      '<section class="card commute-setup"><h2>Plan your session</h2>'+
      (!state.courses.length?empty('book','No course yet','Try the original networking sample or create a course.',textButton('commute-demo','Try a 5-minute sample commute','btn-mint')):
      '<form data-form="commute-start"><div class="field"><label for="commute-course">Course</label><select name="courseId" id="commute-course">'+state.courses.map(function(c){return '<option value="'+esc(c.id)+'" '+(c.id===courseId?'selected':'')+'>'+esc(c.name)+'</option>';}).join('')+'</select></div><div class="field"><label for="commute-minutes">Available time</label><select id="commute-minutes" name="minutes">'+[5,10,15].map(function(n){return '<option value="'+n+'" '+(commuteMinutes===n?'selected':'')+'>'+n+' minutes · up to '+M.LIMITS[n]+' recall cards</option>';}).join('')+'</select></div><p class="hint">'+available.length+' answerable questions in this course · '+store.savedQuestionIds.filter(function(id){return available.some(function(q){return q.id===id;});}).length+' saved for review. Weak questions appear first. Time is a maximum, not a promise of exact playback length.</p><button type="submit" class="btn btn-mint" '+(running||!available.length?'disabled':'')+'>Start Listen & Recall '+ico('arrow')+'</button>'+(available.length?'':textButton('commute-demo','Try sample commute','btn-light'))+'</form>')+
      '</section>'+(recent.length?'<section class="commute-recent"><h2>Recent commute reviews</h2>'+recent.map(function(s){var st=M.stats(s);return '<div class="commute-history"><div><strong>'+st.reviewed+' reviewed · '+st.again+' to revisit</strong><p>'+esc(fmt(s.completedAt))+' · '+s.minutes+' min</p></div>'+textButton('commute-view-report','View report','btn-light btn-sm','data-id="'+esc(s.id)+'"')+'</div>';}).join('')+'</section>':'')+'</div>';
  }
  function renderCommuteSession(){
    var session=M.active(state);if(!session)return renderCommuteReport();
    if(M.remaining(session)<=0){M.end(state,session);commuteResultId=session.id;persist();return renderCommuteReport();}
    var q=M.currentQuestion(state,session),course=state.courses.find(function(c){return c.id===session.courseId;});
    if(!q)return '<div class="commute-page">'+empty('warning','Question was removed','Skip this card or end your review.',textButton('commute-skip','Skip unavailable card','btn-light')+' '+textButton('commute-finish','Finish','btn-mint'))+'</div>';
    var text=M.speechText(q),isSaved=M.saved(state,q.id),idx=session.index+1,percent=Math.round((idx-1)/session.questionIds.length*100);
    return '<div class="commute-page commute-active"><div class="commute-toolbar">'+textButton('commute-back',ico('back')+' Back','btn-light btn-sm')+'<span class="tag">'+idx+' of '+session.questionIds.length+'</span><span class="tag">'+esc(course?course.name:'Course')+'</span><span class="commute-clock" aria-label="Time remaining" id="commute-remaining">'+timeLabel(M.remaining(session))+'</span></div><div class="quiz-progress"><div style="width:'+percent+'%"></div></div>'+
      '<section class="commute-listen-card"><div class="commute-label">LISTEN &amp; RECALL · SELF-GRADED</div><h1>'+esc(text.question)+'</h1><p class="commute-help">Think about the answer before revealing it. You can always read instead of listening.</p><div class="commute-audio-controls">'+textButton('commute-play',ico('spark')+' Play question + answer','btn-mint')+' '+textButton('commute-stop','Stop audio','btn-light')+'</div><p class="hint" role="status" id="commute-voice-status">'+(speaker.available()?'Voice available · pauses 5 seconds before reading the answer.':'Voice unavailable in this browser · reading mode is fully available.')+'</p><div class="commute-answer" id="commute-answer">'+(session.revealed?'<p class="commute-label">SOURCE / REFERENCE ANSWER</p><strong>'+esc(q.answer)+'</strong><p>'+esc(q.sourceExcerpt||q.explanation||'Answer provided by the question author.')+'</p>'+(q.sourcePage?'<span class="tag">Lecture page '+esc(q.sourcePage)+'</span>':''):'<div class="commute-hidden">Answer hidden until you reveal it.</div>')+'</div>'+
      '<div class="commute-card-actions">'+textButton('commute-reveal',session.revealed?'Answer revealed':'Reveal answer','btn-light',session.revealed?'disabled':'')+' '+textButton('commute-save',isSaved?'★ Saved for review':'☆ Save difficult question','btn-light')+'</div>'+
      '<div class="commute-grade">'+(session.revealed?'<p>How well did you recall it? <small>Self-reported, not an exam grade.</small></p><div class="split-actions">'+textButton('commute-grade','Review again','btn-danger','data-rating="again"')+textButton('commute-grade','Got it! '+ico('check'),'btn-mint','data-rating="gotit"')+'</div>':'<p>Reveal the answer to rate your recall.</p>')+textButton('commute-skip','Skip this card','btn-light btn-sm')+'</div></section>'+
      '<div class="commute-disclaimer">Source: '+esc(q.sourcePage?'page '+q.sourcePage+' of your lecture':q.origin==='demo'?'original demo notes':q.origin==='manual'?'your manually created question':'your uploaded course material')+'. No generated explanations beyond the stored source.</div></div>';
  }
  function renderCommuteReport(){
    var sess=M.ensure(state).sessions.find(function(s){return s.id===commuteResultId;})||M.ensure(state).sessions.find(function(s){return !!s.completedAt;});
    if(!sess)return renderCommuteHome();var st=M.stats(sess);
    return '<div class="commute-page">'+pageTitle('Your commute review','Session saved','A record of what you practiced, not a predicted exam grade.')+'<section class="card commute-report"><span class="tag tag-mint">SESSION COMPLETE</span><h2>'+st.reviewed+' concepts reviewed</h2><div class="commute-results"><div><strong>'+st.gotit+'</strong><span>Got it</span></div><div><strong>'+st.again+'</strong><span>Review again</span></div><div><strong>'+st.skipped+'</strong><span>Skipped</span></div></div><p class="hint">Difficult questions are kept in your saved review list. Commute self-ratings do not change your automatically graded exam accuracy.</p>'+textButton('commute-again','Start another commute','btn-mint')+' '+textButton('navigate','Back to dashboard','btn-light','data-id="dashboard"')+'</section></div>';
  }
  function commuteAction(a,d){
    var session=M.active(state);
    if(a==='commute-demo'){var cid=C.addDemo(state);commuteCourseId=cid;persist();if(!session){try{M.begin(state,cid,5);persist();goto('commute-session');}catch(e){toast(e.message,true);}}else goto('commute');return;}
    if(a==='commute-resume'){goto('commute-session');return;}
    if(a==='commute-back'){goto('commute');return;}
    if(a==='commute-again'){goto('commute');return;}
    if(a==='commute-view-report'){commuteResultId=d.id;goto('commute-report');return;}
    if(a==='commute-finish'){if(session){speaker.stop();M.end(state,session);commuteResultId=session.id;persist();goto('commute-report');}return;}
    if(!session)return;
    var q=M.currentQuestion(state,session);
    if(a==='commute-stop'){speaker.stop();var status=el('commute-voice-status');if(status)status.textContent='Audio stopped. Read the card or play again.';return;}
    if(a==='commute-play'){
      if(!q){toast('This question is unavailable.',true);return;}
      var spoken=M.speechText(q);
      speaker.speak(spoken.question,spoken.answer,1,5,function(){if(M.active(state)===session&&!session.revealed){M.reveal(session);persist();render();}},function(){toast('Speech unavailable. You can read the answer instead.',true);});
      var status=el('commute-voice-status');if(status)status.textContent='Listening: question, thinking pause, then stored answer. Keep the tab open.';
      return;
    }
    if(a==='commute-reveal'){speaker.stop();M.reveal(session);persist();render();return;}
    if(a==='commute-save'){if(q){var v=M.toggleSaved(state,q.id);persist();render();toast(v?'Saved for a later review.':'Removed from saved questions.');}return;}
    if(a==='commute-skip'||a==='commute-grade'){
      speaker.stop();var rating=a==='commute-skip'?'skip':d.rating;
      if(M.advance(state,session,rating)){persist();if(session.completedAt){commuteResultId=session.id;goto('commute-report');}else render();}
      return;
    }
  }
  setInterval(function(){if(ui.page!=='commute-session')return;var s=M.active(state);if(!s)return;
    var remaining=M.remaining(s);if(remaining<=0){speaker.stop();M.end(state,s);commuteResultId=s.id;persist();goto('commute-report');return;}
    var timer=el('commute-remaining');if(timer)timer.textContent=timeLabel(remaining);
  },1000);

  // Course-specific sticky-note canvas. No AI-derived or third-party templates.
  function canvasCourse(){var id=ui.canvasCourseId||ui.courseId;return state.courses.find(function(c){return c.id===id;})||state.courses[0]||null;}
  function canvasBoard(){var c=canvasCourse();return c?B.board(state,c.id):null;}
  function renderCanvas(){
    var c=canvasCourse();if(!c)return pageTitle('Your visual thinking space','Study Canvas','Connect ideas with notes that belong to your courses.')+empty('book','Create a course first','Add a course to collect your notes and concepts.',textButton('new-course','Create course','btn-mint'));
    ui.canvasCourseId=c.id;
    var b=canvasBoard(),topics=state.topics.filter(function(t){return t.courseId===c.id;});
    var selector='<label class="canvas-course-picker">Course <select id="canvas-course">'+state.courses.map(function(x){return '<option value="'+esc(x.id)+'" '+(x.id===c.id?'selected':'')+'>'+esc(x.name)+'</option>';}).join('')+'</select></label>';
    var toolbar='<div class="canvas-toolbar">'+selector+textButton('canvas-add',ico('plus')+' New sticky note','btn-mint btn-sm')+textButton('canvas-topics',ico('spark')+' Map course topics','btn-light btn-sm',topics.length?'':'disabled title="Add topics first"')+textButton('canvas-reset',ico('trash')+' Clear canvas','btn-light btn-sm',b.nodes.length?'':'disabled')+'</div>';
    var lines=b.links.map(function(l){var a=b.nodes.find(function(x){return x.id===l.from;}),z=b.nodes.find(function(x){return x.id===l.to;});if(!a||!z)return '';
      return '<g class="canvas-edge" data-link-id="'+esc(l.id)+'"><line data-from="'+esc(a.id)+'" data-to="'+esc(z.id)+'" x1="'+(a.x+B.CARD_W/2)+'" y1="'+(a.y+B.CARD_H/2)+'" x2="'+(z.x+B.CARD_W/2)+'" y2="'+(z.y+B.CARD_H/2)+'" /><title>Concept connection</title></g>';}).join('');
    var nodes=b.nodes.map(function(n){return '<article class="canvas-sticky canvas-'+esc(n.color)+'" data-node-id="'+esc(n.id)+'" style="left:'+n.x+'px;top:'+n.y+'px"><div class="canvas-sticky-head" data-canvas-drag="'+esc(n.id)+'" tabindex="0" role="button" aria-label="Drag note '+esc(n.title)+'"><span class="canvas-grip">⠿</span><span>DRAG TO MOVE</span></div><h3>'+esc(n.title)+'</h3><p>'+esc(n.body||'Tap Edit to add your explanation.')+'</p><div class="canvas-sticky-actions">'+textButton('canvas-edit','Edit','canvas-mini-btn','data-id="'+esc(n.id)+'"')+textButton('canvas-connect',ui.canvasLinkFrom===n.id?'Selected ✓':'Connect','canvas-mini-btn '+(ui.canvasLinkFrom===n.id?'canvas-selected':''),'data-id="'+esc(n.id)+'" aria-label="Select note to connect"')+textButton('canvas-delete','×','canvas-mini-btn canvas-delete-note','data-id="'+esc(n.id)+'" aria-label="Delete note"')+'</div></article>';}).join('');
    var note=b.nodes.length?'<span>'+b.nodes.length+' notes · '+b.links.length+' connections</span>':'<span>Start with one sticky note, or map your course topics.</span>';
    return pageTitle('Turn your notes into connections','Study Canvas','A simple, visual workspace for your own ideas. Each course has its own board.')+toolbar+
      '<div class="canvas-hint" role="status" aria-live="polite">'+(ui.canvasLinkFrom?'Now choose <strong>Connect</strong> on a second note to draw a line. '+textButton('canvas-cancel-link','Cancel','canvas-text-btn'):'Drag by the handle, choose Connect on two notes, or use Edit. On phones, swipe the board to see more.')+'</div>'+
      '<div class="canvas-scroll" aria-label="Scroll to explore your course canvas" tabindex="0"><div class="canvas-surface" id="canvas-surface"><svg aria-hidden="true" class="canvas-lines" width="'+B.WIDTH+'" height="'+B.HEIGHT+'" viewBox="0 0 '+B.WIDTH+' '+B.HEIGHT+'"><defs><marker id="canvas-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#80a096"/></marker></defs>'+lines+'</svg>'+nodes+(b.nodes.length?'':'<div class="canvas-empty"><span class="canvas-empty-icon">✦</span><strong>Your ideas start here</strong><p>Create a note, or generate a map using topics already in this course.</p>'+textButton('canvas-add','Create first note','btn-mint btn-sm')+'</div>')+'</div></div>'+
      '<div class="canvas-footer">'+note+'<span>Saved locally with your other Syllasprint data · Included in Export JSON</span></div>';
  }
  function canvasNoteDialog(note){var b=canvasBoard();if(!b)return;var n=note||{};
    openDialog(n.id?'Edit sticky note':'Add sticky note','<form data-form="canvas-note" data-id="'+esc(n.id||'')+'"><div class="field"><label for="canvas-note-title">Title *</label><input id="canvas-note-title" name="title" value="'+esc(n.title||'')+'" maxlength="80" required placeholder="e.g. Encapsulation" /></div><div class="field"><label for="canvas-note-body">Your explanation, example or question</label><textarea id="canvas-note-body" name="body" maxlength="1200" rows="6" placeholder="Explain this concept in your own words...">'+esc(n.body||'')+'</textarea></div><div class="field"><label for="canvas-note-color">Note color</label><select id="canvas-note-color" name="color">'+B.COLORS.map(function(color){return '<option value="'+color+'" '+(n.color===color?'selected':'')+'>'+color.charAt(0).toUpperCase()+color.slice(1)+'</option>';}).join('')+'</select></div><p class="hint">Tip: add one concept per note, then connect related ideas. Notes are editable and saved in this browser.</p>'+formFooter(n.id?'Save note':'Add to canvas')+'</form>');
  }
  function canvasAction(a,d){var b=canvasBoard();if(!b)return;
    if(a==='canvas-open'){ui.canvasCourseId=d.id;ui.canvasLinkFrom='';goto('canvas');return;}
    if(a==='canvas-add'){canvasNoteDialog();return;}
    if(a==='canvas-edit'){canvasNoteDialog(b.nodes.find(function(x){return x.id===d.id;}));return;}
    if(a==='canvas-delete'){if(window.confirm('Delete this note and all its connections?')){B.removeNote(b,d.id);if(ui.canvasLinkFrom===d.id)ui.canvasLinkFrom='';persist();render();toast('Note removed.');}return;}
    if(a==='canvas-connect'){if(!ui.canvasLinkFrom){ui.canvasLinkFrom=d.id;render();return;}if(ui.canvasLinkFrom===d.id){ui.canvasLinkFrom='';render();return;}var ok=B.link(b,ui.canvasLinkFrom,d.id);ui.canvasLinkFrom='';if(ok)persist();render();toast(ok?'Notes connected.':'These notes are already connected.');return;}
    if(a==='canvas-cancel-link'){ui.canvasLinkFrom='';render();return;}
    if(a==='canvas-topics'){var n=B.fromTopics(state,b.courseId);persist();render();toast(n?n+' course topic notes added.':'No new topics. Add course topics to create a map.');return;}
    if(a==='canvas-reset'){if(window.confirm('Clear all notes and connections on this course canvas? The course and practice questions will stay intact.')){b.nodes=[];b.links=[];ui.canvasLinkFrom='';persist();render();toast('Canvas cleared.');}return;}
  }
  var canvasDrag=null;
  document.addEventListener('pointerdown',function(e){var handle=e.target.closest('[data-canvas-drag]');if(!handle||ui.page!=='canvas'||e.button!==0)return;
    var id=handle.dataset.canvasDrag,b=canvasBoard(),n=b&&b.nodes.find(function(x){return x.id===id;});if(!n)return;
    canvasDrag={pointerId:e.pointerId,id:id,courseId:b.courseId,startX:e.clientX,startY:e.clientY,originalX:n.x,originalY:n.y,node:handle.closest('.canvas-sticky'),moved:false};
    if(handle.setPointerCapture)try{handle.setPointerCapture(e.pointerId);}catch(_){ }
    e.preventDefault();
  });
  document.addEventListener('pointermove',function(e){var d=canvasDrag;if(!d||e.pointerId!==d.pointerId||ui.page!=='canvas')return;
    var x=Math.max(0,Math.min(B.WIDTH-B.CARD_W,Math.round(d.originalX+e.clientX-d.startX))),y=Math.max(0,Math.min(B.HEIGHT-B.CARD_H,Math.round(d.originalY+e.clientY-d.startY)));
    if(x!==d.originalX||y!==d.originalY)d.moved=true;
    if(d.node){d.node.style.left=x+'px';d.node.style.top=y+'px';}
    var svg=el('canvas-surface');if(svg)svg.querySelectorAll('.canvas-edge line').forEach(function(line){if(line.dataset.from===d.id){line.setAttribute('x1',x+B.CARD_W/2);line.setAttribute('y1',y+B.CARD_H/2);}if(line.dataset.to===d.id){line.setAttribute('x2',x+B.CARD_W/2);line.setAttribute('y2',y+B.CARD_H/2);}});
  });
  function stopCanvasDrag(e){var d=canvasDrag;if(!d||(e&&e.pointerId!==d.pointerId))return;canvasDrag=null;
    if(!d.node||ui.page!=='canvas')return;var b=B.getBoard(state,d.courseId);if(!b)return;
    if(d.moved){B.move(b,d.id,parseFloat(d.node.style.left),parseFloat(d.node.style.top));persist();}
  }
  document.addEventListener('pointerup',stopCanvasDrag);document.addEventListener('pointercancel',stopCanvasDrag);
  document.addEventListener('keydown',function(e){var handle=e.target.closest&&e.target.closest('[data-canvas-drag]');if(!handle||ui.page!=='canvas'||!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;
    var b=canvasBoard(),n=b.nodes.find(function(x){return x.id===handle.dataset.canvasDrag;});if(!n)return;e.preventDefault();var by=e.shiftKey?30:10;
    B.move(b,n.id,n.x+(e.key==='ArrowRight'?by:e.key==='ArrowLeft'?-by:0),n.y+(e.key==='ArrowDown'?by:e.key==='ArrowUp'?-by:0));persist();render();var next=el('content').querySelector('[data-canvas-drag="'+n.id+'"]');if(next)next.focus();
  });

  function render(){renderShell();var html=ui.page==='canvas'?renderCanvas():ui.page==='commute'?renderCommuteHome():ui.page==='commute-session'?renderCommuteSession():ui.page==='commute-report'?renderCommuteReport():ui.page==='guide'?globalThis.SyllaGuide.renderHome():ui.page==='guide-session'?globalThis.SyllaGuide.renderSession():ui.page==='dashboard'?renderDashboard():ui.page==='courses'?renderCourses():ui.page==='course'?renderCourse():ui.page==='exam'?renderExamSetup():ui.page==='quiz'?renderQuiz():ui.page==='results'?renderResults():renderWeak();el('content').innerHTML=html;}
  function openDialog(title,html){var d=el('app-modal');d.innerHTML='<div class="modal-inner"><div class="modal-heading"><h2>'+title+'</h2><button type="button" class="icon-button" data-action="close-modal" aria-label="Close dialog">'+ico('close')+'</button></div>'+html+'</div>';if(!d.open)d.showModal();var first=d.querySelector('input,select,textarea,button');if(first)first.focus();}
  function closeDialog(){var d=el('app-modal');if(d.open)d.close();}
  function formFooter(submit){return '<div class="modal-footer"><button type="button" class="btn btn-light" data-action="close-modal">Cancel</button><button type="submit" class="btn btn-mint">'+esc(submit)+'</button></div>';}
  function courseDialog(c){c=c||{};openDialog(c.id?'Edit course':'Create a course','<form data-form="course" data-id="'+esc(c.id||'')+'"><div class="field"><label for="course-name">Course name *</label><input id="course-name" name="name" placeholder="e.g. Data Structures" value="'+esc(c.name||'')+'" required maxlength="100" /></div><div class="field"><label for="exam-date">Exam date (optional)</label><input id="exam-date" type="date" name="examDate" value="'+esc(c.examDate||'')+'" /></div>'+formFooter(c.id?'Save changes':'Create course')+'</form>');}
  function topicOptions(courseId,selected){var ts=state.topics.filter(function(t){return t.courseId===courseId;});return '<option value="">General</option>'+ts.map(function(t){return '<option value="'+esc(t.id)+'" '+(selected===t.id?'selected':'')+'>'+esc(t.name)+'</option>';}).join('');}
  function materialDialog(courseId){
    ui.importedPdf=false;
    var modal='<form data-form="material" data-course="'+esc(courseId)+'">'+
      '<div class="material-intro"><span class="tag tag-mint">PDF → QUESTIONS</span><p>Upload your lecture PDF or paste notes. Syllasprint extracts readable text, then creates source-linked practice questions. No account required.</p></div>'+
      '<div class="upload-panel"><div class="upload-panel-title">'+ico('upload')+' <strong>1. Choose your lecture file</strong></div><div class="field"><label for="material-file">PDF, TXT, or Markdown (.md)</label><input type="file" id="material-file" accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown" aria-describedby="pdf-status" /></div><p class="hint">Text-based PDFs up to 12 MB and 100 pages. Scanned/image-only PDFs need OCR. File content stays in this browser.</p><div id="pdf-status" class="import-status" aria-live="polite">Choose a file, or paste your lecture text in step 3.</div></div>'+
      '<div class="field"><label for="material-title">2. Give your material a title *</label><input id="material-title" name="title" required maxlength="120" placeholder="e.g. Python Lecture 7 — Object-Oriented Programming" /></div>'+
      '<div class="field"><label for="material-topic">Topic</label><select name="topicId" id="material-topic">'+topicOptions(courseId,'')+'</select></div>'+
      '<div class="field"><label for="material-newtopic">New topic (optional)</label><input id="material-newtopic" name="newTopic" maxlength="90" placeholder="e.g. Classes &amp; Inheritance" /></div>'+
      '<div class="field"><label for="material-content">3. Review extracted text or paste notes *</label><textarea id="material-content" name="content" rows="10" style="min-height:180px" required placeholder="Upload a PDF above, or paste ordinary lecture notes here. You can also use TERM :: DEFINITION or Q: ... A: ... for structured questions."></textarea><span class="hint">After saving, review the generated questions. Source-based recall cards are self-graded and may need editing.</span></div>'+
      formFooter('Save material & generate practice')+'</form>';
    openDialog('Add course material',modal);
  }
  function questionDialog(courseId,q){q=q||{};var isMcq=q.type!=='short';var opts=(q.options||[]).concat(['','','','']).slice(0,4);var answerIndex=Math.max(0,opts.indexOf(q.answer));openDialog(q.id?'Edit question':'Add practice question','<form data-form="question" data-course="'+esc(courseId)+'" data-id="'+esc(q.id||'')+'"><div class="field"><label for="question-topic">Topic</label><select id="question-topic" name="topicId">'+topicOptions(courseId,q.topicId||'')+'</select></div><div class="field"><label for="question-type">Question type</label><select id="question-type" name="type"><option value="mcq" '+(isMcq?'selected':'')+'>Multiple choice (automatic grading)</option><option value="short" '+(!isMcq?'selected':'')+'>Short answer (self-grading)</option></select></div><div class="field"><label for="question-prompt">Question *</label><textarea name="prompt" id="question-prompt" required maxlength="1500" placeholder="What is the purpose of ...?">'+esc(q.prompt||'')+'</textarea></div><div id="mcq-fields" class="'+(!isMcq?'hidden':'')+'"><div class="field"><label>Answer options (at least 2 distinct) *</label><div class="input-pair">'+opts.map(function(opt,i){return '<input aria-label="Option '+(i+1)+'" name="opt'+i+'" value="'+esc(opt)+'" placeholder="Option '+(i+1)+'" maxlength="260" />';}).join('')+'</div></div><div class="field"><label for="answer-index">Correct option</label><select id="answer-index" name="answerIndex">'+[0,1,2,3].map(function(i){return '<option value="'+i+'" '+(i===answerIndex?'selected':'')+'>Option '+(i+1)+'</option>';}).join('')+'</select></div></div><div class="field '+(isMcq?'hidden':'')+'" id="short-answer-fields"><label for="short-reference">Reference answer *</label><textarea name="reference" id="short-reference" placeholder="Answer from your notes...">'+esc(!isMcq?q.answer||'':'')+'</textarea></div><div class="field"><label for="question-explanation">Explanation</label><textarea name="explanation" id="question-explanation" placeholder="Why is this correct?">'+esc(q.explanation||'')+'</textarea></div><div class="field"><label for="question-source">Source excerpt (recommended)</label><textarea name="sourceExcerpt" id="question-source" placeholder="Paste the source passage supporting the answer">'+esc(q.sourceExcerpt||'')+'</textarea></div>'+formFooter(q.id?'Save question':'Add question')+'</form>');}
  function showSource(id){var m=state.materials.find(function(s){return s.id===id;});if(!m)return;openDialog(esc(m.title),'<div class="notice">Original text from this course · stored locally</div><pre style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;font:inherit;font-size:13px;max-height:55vh;overflow:auto">'+esc(m.content)+'</pre><div class="modal-footer">'+textButton('close-modal','Close','btn-light')+'</div>');}
  function importDialog(){openDialog('Restore a backup','<form data-form="import"><p class="hint" style="margin-bottom:17px">Importing a backup will replace the current browser-local data. Export a backup first if you want to keep it.</p><div class="field"><label for="backup-file">Syllasprint JSON file *</label><input id="backup-file" name="backup" type="file" accept=".json,application/json" required /></div>'+formFooter('Import and replace')+'</form>');}
  function exportData(){var json=JSON.stringify(state,null,2),blob=new Blob([json],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='syllasprint-backup-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url);},1000);toast('JSON backup exported.');}
  function startQuiz(courseId,count,mode,onlyIds){var list=state.questions.filter(function(q){return q.courseId===courseId;});if(onlyIds){var set=new Set(onlyIds);list=list.filter(function(q){return set.has(q.id);});}else if(mode==='weak'){list=list.filter(function(q){return C.isWeak(state,q);});}
    if(!list.length){toast('No practice questions available for that selection.',true);return;}
    var ids=C.shuffled(list).slice(0,Math.max(1,Math.min(Number(count)||5,list.length))).map(function(q){return q.id;});var sessionId=C.uid('session'),initialGaps=state.questions.filter(function(q){return q.courseId===courseId&&C.isGap(state,q);}).map(function(q){return q.id;});state.sessions.push({id:sessionId,courseId:courseId,questionIds:ids,startedAt:new Date().toISOString(),completedAt:null,initialGaps:initialGaps});persist();ui.quiz={sessionId:sessionId,courseId:courseId,questionIds:ids,index:0,choice:'',confidence:'',revealed:false,answered:false,lastAttempt:null};goto('quiz');}
  function recordAttempt(q,correctIfManual){var z=ui.quiz;if(!z||z.answered)return;var a=C.addAttempt(state,z.sessionId,q,z.choice,z.confidence,correctIfManual);z.lastAttempt=a;z.revealed=true;z.answered=true;persist();render();}
  function nextQuestion(){var z=ui.quiz;if(!z||!z.answered)return;if(z.index===z.questionIds.length-1){var s=state.sessions.find(function(x){return x.id===z.sessionId;});if(s)s.completedAt=new Date().toISOString();persist();goto('results');return;}
    z.index++;z.choice='';z.confidence='';z.revealed=false;z.answered=false;z.lastAttempt=null;render();}
  function confirmDelete(message){return window.confirm(message);}
  function action(a,d){
    if(a.startsWith('canvas-')){if(a==='canvas-pin'){var pin=state.questions.find(function(q){return q.id===d.id;});if(pin){var node=B.pinQuestion(state,pin);ui.canvasCourseId=pin.courseId;persist();goto('canvas');toast(node?'Question pinned to Study Canvas.':'Unable to pin question.');}return;}canvasAction(a,d);return;}
    if(a.startsWith('commute-')){commuteAction(a,d);return;}
    if(a.startsWith('guide-')){globalThis.SyllaGuide.act(a,d);return;}
    if(a==='navigate'){goto(d.id);return;}
    if(a==='new-course'){ui.importAfterCreate=false;courseDialog();return;}
    if(a==='quick-import'){var personal=state.courses.find(function(c){return !c.isDemo;});if(personal){materialDialog(personal.id);}else{ui.importAfterCreate=true;courseDialog();}return;}
    if(a==='close-modal'){closeDialog();return;}
    if(a==='open-course'){ui.topicFilter='all';goto('course',d.id);return;}
    if(a==='course-edit'){courseDialog(state.courses.find(function(c){return c.id===d.id;}));return;}
    if(a==='course-delete'){var c=state.courses.find(function(x){return x.id===d.id;});if(c&&confirmDelete('Delete '+c.name+' and all its notes, questions and attempts? This cannot be undone.')){C.deleteCourse(state,c.id);persist();toast('Course deleted.');goto('courses');}return;}
    if(a==='add-material'){materialDialog(d.id);return;}
    if(a==='view-material'){showSource(d.id);return;}
    if(a==='delete-material'){var m=state.materials.find(function(x){return x.id===d.id;});if(m&&confirmDelete('Delete this source? Its generated questions will remain, but will lose their source document.')){state.materials=state.materials.filter(function(x){return x.id!==d.id;});state.questions.forEach(function(q){if(q.sourceId===d.id)q.sourceId='';});persist();render();toast('Source deleted.');}return;}
    if(a==='new-question'){questionDialog(d.id);return;}
    if(a==='edit-question'){var q=state.questions.find(function(x){return x.id===d.id;});if(q)questionDialog(q.courseId,q);return;}
    if(a==='delete-question'){if(confirmDelete('Delete this question and all its attempt history?')){C.deleteQuestion(state,d.id);persist();render();toast('Question deleted.');}return;}
    if(a==='start-course-quiz'){ui.setupCourseId=d.id;ui.setupMode='all';goto('exam');return;}
    if(a==='demo'){var id=C.addDemo(state);persist();toast('Sample networking exam ready!');startQuiz(id,5,'all');return;}
    if(a==='remove-demo'){if(confirmDelete('Remove the sample networking course and its demo practice history? Personal courses stay intact.')){C.removeDemo(state);persist();toast('Sample content removed.');goto('courses');}return;}
    if(a==='export'){exportData();return;}
    if(a==='import'){importDialog();return;}
    if(a==='choose-answer'){if(ui.quiz&&!ui.quiz.answered){ui.quiz.choice=d.value;render();}return;}
    if(a==='choose-confidence'){if(ui.quiz&&!ui.quiz.answered){ui.quiz.confidence=d.value;render();}return;}
    if(a==='check-answer'){var q=getQuizQuestion();if(q&&q.type==='mcq'&&ui.quiz&&!ui.quiz.answered&&ui.quiz.choice&&ui.quiz.confidence)recordAttempt(q,false);return;}
    if(a==='reveal-short'){var q=getQuizQuestion();if(q&&q.type==='short'&&ui.quiz&&!ui.quiz.answered&&ui.quiz.choice.trim()&&ui.quiz.confidence){ui.quiz.revealed=true;render();}return;}
    if(a==='grade-short'){var q=getQuizQuestion();if(q&&q.type==='short'&&ui.quiz&&ui.quiz.revealed&&!ui.quiz.answered)recordAttempt(q,d.value==='true');return;}
    if(a==='next-question'){nextQuestion();return;}
    if(a==='retake-weak'){var id=d.id||null;var weak=C.findWeak(state,id);if(!weak.length){toast('No unresolved weak questions. Great work!');return;}var cid=id||weak[0].courseId;var selected=weak.filter(function(q){return q.courseId===cid;});startQuiz(cid,selected.length,'weak');return;}
    if(a==='retake-one'){var q=state.questions.find(function(x){return x.id===d.id;});if(q)startQuiz(q.courseId,1,'all',[q.id]);return;}
  }
  document.addEventListener('click',function(e){var b=e.target.closest('[data-action]');if(!b||b.disabled)return;action(b.dataset.action,b.dataset);});
  document.addEventListener('change',function(e){var t=e.target;
    if(t.id==='material-file'&&t.files&&t.files[0]){
      var file=t.files[0],status=el('pdf-status'),box=el('material-content'),title=el('material-title');
      if(status)status.textContent='Reading '+file.name+'…';var saveButton=t.closest('form')?.querySelector('button[type="submit"]');if(saveButton)saveButton.disabled=true;
      if(title&&!title.value)title.value=file.name.replace(/\.(txt|md|pdf)$/i,'');
      var pdf=/\.pdf$/i.test(file.name);
      if(!pdf&&file.size>1000000){if(status)status.textContent='Choose a text file smaller than 1 MB.';toast('Text file too large.',true);return;}
      var promise=pdf?globalThis.SyllaLecture.extractPdf(file):file.text().then(function(txt){return {text:txt,pages:0,characters:txt.length};});
      promise.then(function(data){if(saveButton)saveButton.disabled=false;if(!box)return;box.value=data.text;ui.importedPdf=pdf;
        var cards=C.parseMaterial(data.text,'preview','','preview').length;
        if(status)status.textContent=(pdf?data.pages+' PDF pages read. ':'Text file read. ')+data.characters.toLocaleString()+' characters · '+cards+' provisional source-grounded or structured questions. Review extracted text and save.';
        toast('Material extracted locally — review, then save.');
      }).catch(function(err){if(saveButton)saveButton.disabled=false;if(status)status.textContent=err.message;toast(err.message||'Unable to read this file.',true);});
    }
    if(t.id==='topic-filter'){ui.topicFilter=t.value;render();}
    if(t.id==='weak-course'){ui.weakFilter=t.value;render();}
    if(t.id==='canvas-course'){ui.canvasCourseId=t.value;ui.canvasLinkFrom='';render();}
    if(t.id==='commute-course'){commuteCourseId=t.value;render();}
    if(t.id==='commute-minutes'){commuteMinutes=Number(t.value);render();}
    if(t.id==='exam-course'){ui.setupCourseId=t.value;render();}
    if(t.id==='exam-mode'){ui.setupMode=t.value;render();}
    if(t.id==='question-type'){var mcq=t.value==='mcq';el('mcq-fields').classList.toggle('hidden',!mcq);el('short-answer-fields').classList.toggle('hidden',mcq);}
  });
  document.addEventListener('input',function(e){if(e.target.id==='course-search'){var start=e.target.selectionStart;ui.search=e.target.value;render();var input=el('course-search');input.focus();try{input.setSelectionRange(start,start);}catch(_){}return;}
    if(e.target.id==='free-response'&&ui.quiz&&!ui.quiz.revealed){ui.quiz.choice=e.target.value;var btn=el('content').querySelector('[data-action="reveal-short"]');if(btn)btn.disabled=!(ui.quiz.choice.trim()&&ui.quiz.confidence);}
  });
  document.addEventListener('submit',function(e){var f=e.target;if(!f.matches('[data-form]'))return;e.preventDefault();var form=new FormData(f),kind=f.dataset.form;
    try{
      if(kind==='canvas-note'){
        var b=canvasBoard(),title=String(form.get('title')||'').trim(),body=String(form.get('body')||'').trim(),color=String(form.get('color')||'cream');
        if(!b)throw new Error('Choose a course first.');
        if(f.dataset.id){B.updateNote(b,f.dataset.id,{title:title,body:body,color:color});}
        else{var index=b.nodes.length;B.addNote(b,title,body,color,50+(index%4)*275,75+(Math.floor(index/4)%3)*212);}
        if(!persist())throw new Error('Unable to save your notes. Export a backup to protect your work.');
        closeDialog();render();toast('Study note saved.');return;
      }
      if(kind==='course'){
        var name=String(form.get('name')||'').trim(),date=String(form.get('examDate')||'');if(!name)throw new Error('Course name is required.');
        var current=state.courses.find(function(x){return x.id===f.dataset.id;});if(current){current.name=name;current.examDate=date;}else{var newCourse={id:C.uid('course'),name:name,examDate:date,createdAt:new Date().toISOString(),isDemo:false};state.courses.push(newCourse);ui.courseId=newCourse.id;}
        persist();closeDialog();toast(current?'Course updated.':'Course created.');goto('course',current?current.id:ui.courseId);if(ui.importAfterCreate&&!current){ui.importAfterCreate=false;materialDialog(ui.courseId);}return;
      }
      if(kind==='material'){
        var courseId=f.dataset.course,title=String(form.get('title')||'').trim(),body=String(form.get('content')||'').trim();if(!title||!body)throw new Error('A title and material are required.');
        var topicId=String(form.get('topicId')||''),newTopic=String(form.get('newTopic')||'').trim();if(newTopic){var existing=state.topics.find(function(t){return t.courseId===courseId&&t.name.toLowerCase()===newTopic.toLowerCase();});if(existing)topicId=existing.id;else{topicId=C.uid('topic');state.topics.push({id:topicId,courseId:courseId,name:newTopic});}}
        var sourceId=C.uid('source');state.materials.push({id:sourceId,courseId:courseId,topicId:topicId,title:title,content:body,createdAt:new Date().toISOString(),isDemo:false});var qs=C.parseMaterial(body,courseId,topicId,sourceId);state.questions.push.apply(state.questions,qs);if(!persist()){state.materials=state.materials.filter(function(m){return m.id!==sourceId;});state.questions=state.questions.filter(function(q){return q.sourceId!==sourceId;});throw new Error('Storage full. Try a smaller lecture or export a backup.');}closeDialog();var sourceCount=qs.filter(function(q){return q.origin==='source-recall';}).length;toast('Saved '+qs.length+' questions'+(sourceCount?' ('+sourceCount+' source-grounded recalls)':'')+'. Review before practicing.');ui.topicFilter='all';goto('course',courseId);return;
      }
      if(kind==='question'){
        var questionId=f.dataset.id,courseId=f.dataset.course,type=String(form.get('type')||'mcq'),prompt=String(form.get('prompt')||'').trim(),options=[],answer='';if(!prompt)throw new Error('Question text is required.');
        if(type==='mcq'){options=[0,1,2,3].map(function(i){return String(form.get('opt'+i)||'').trim();}).filter(Boolean);if(options.length<2||new Set(options.map(function(x){return x.toLowerCase();})).size!==options.length)throw new Error('Add at least two distinct, nonempty options.');var answerIndex=Number(form.get('answerIndex'));var rawCorrect=String(form.get('opt'+answerIndex)||'').trim();if(!rawCorrect||!options.includes(rawCorrect))throw new Error('Choose a nonempty correct option.');answer=rawCorrect;}else{answer=String(form.get('reference')||'').trim();if(!answer)throw new Error('Provide a reference answer for short questions.');}
        var current=state.questions.find(function(x){return x.id===questionId;});var fields={courseId:courseId,topicId:String(form.get('topicId')||''),type:type,prompt:prompt,options:options,answer:answer,explanation:String(form.get('explanation')||'').trim(),sourceExcerpt:String(form.get('sourceExcerpt')||'').trim(),origin:'manual'};
        if(current){Object.assign(current,fields);}else{state.questions.push(Object.assign({id:C.uid('q'),sourceId:'',isDemo:false,createdAt:new Date().toISOString()},fields));}
        persist();closeDialog();toast(current?'Question updated.':'Question added.');render();return;
      }
      if(kind==='commute-start'){
        var cc=String(form.get('courseId')||''),minutes=Number(form.get('minutes')||10);
        commuteCourseId=cc;commuteMinutes=minutes;
        var sess=M.begin(state,cc,minutes);if(!persist()){M.ensure(state).sessions=M.ensure(state).sessions.filter(function(s){return s.id!==sess.id;});return;}
        goto('commute-session');return;
      }
      if(kind==='quiz-start'){var cid=String(form.get('courseId')||''),mode=String(form.get('mode')||'all');startQuiz(cid,Number(form.get('count')||5),mode);return;}
      if(kind==='import'){var file=form.get('backup');if(!file||!file.size)throw new Error('Choose a JSON backup first.');if(file.size>5000000)throw new Error('Choose a backup smaller than 5 MB.');
        if(!confirmDelete('Replace all existing courses, questions and exam history with this backup?'))return;
        file.text().then(function(t){try{var next=C.cleanState(JSON.parse(t));var old=state;state=next;if(!persist()){state=old;return;}ui.quiz=null;ui.courseId=null;closeDialog();goto('dashboard');toast('Backup imported successfully.');}catch(err){toast(err.message||'Could not import backup.',true);}}).catch(function(){toast('Unable to read that file.',true);});return;
      }
    }catch(err){toast(err.message||'Unable to save this form.',true);}
  });
  el('app-modal').addEventListener('click',function(e){if(e.target===el('app-modal'))closeDialog();});
  globalThis.SyllaGuide.init({getState:function(){return state;},getUI:function(){return ui;},C:C,esc:esc,ico:ico,button:textButton,persist:persist,goto:goto,render:render,toast:toast});
  render();
})();
