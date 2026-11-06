/* Syllasprint's framework-free, testable data and quiz engine. */
(function (root) {
  'use strict';
  var VERSION = 1;
  var STORAGE_KEY = 'syllasprint_v1';
  function uid(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10); }
  function emptyState() { return { schemaVersion: VERSION, courses: [], topics: [], materials: [], questions: [], attempts: [], sessions: [] }; }
  function cleanState(data) {
    if (!data || typeof data !== 'object' || data.schemaVersion !== VERSION) throw new Error('Not a compatible Syllasprint v1 backup.');
    var keys = ['courses', 'topics', 'materials', 'questions', 'attempts', 'sessions'];
    if (!keys.every(function (k) { return Array.isArray(data[k]); })) throw new Error('Backup is missing required collections.');
    if (keys.some(function (k) { return data[k].length > 10000; })) throw new Error('Backup is too large.');
    var clean = emptyState();
    keys.forEach(function (k) { clean[k] = JSON.parse(JSON.stringify(data[k])); });
    if (!clean.courses.every(function(c){return typeof c.id==='string' && typeof c.name==='string';}) ||
        !clean.questions.every(function(q){return typeof q.id==='string' && typeof q.courseId==='string' && typeof q.prompt==='string' && ['mcq','short'].includes(q.type);}) ||
        !clean.attempts.every(function(a){return typeof a.questionId==='string' && typeof a.correct==='boolean';})) throw new Error('Backup contains invalid records.');
    return clean;
  }
  function byCourse(items, courseId) { return courseId ? items.filter(function(x){return x.courseId===courseId;}) : items.slice(); }
  function latestAttempt(state, questionId) {
    for (var i=state.attempts.length-1;i>=0;i--) if (state.attempts[i].questionId === questionId) return state.attempts[i];
    return null;
  }
  function isWeak(state, question) { var a=latestAttempt(state,question.id); return !!a && !a.correct; }
  function isGap(state, question) { var a=latestAttempt(state,question.id); return !!a && !a.correct && a.confidence==='high'; }
  function computeStats(state, courseId) {
    var qs=byCourse(state.questions, courseId), ids=new Set(qs.map(function(q){return q.id;}));
    var attempts=state.attempts.filter(function(a){return ids.has(a.questionId);});
    var graded=attempts.filter(function(a){return a.gradingMethod==='automatic';});
    var attemptedIds=new Set(attempts.map(function(a){return a.questionId;}));
    return { courses: courseId?1:state.courses.length, questions:qs.length,
      attempted: attemptedIds.size, totalAttempts: attempts.length,
      accuracy:graded.length?Math.round(100*graded.filter(function(a){return a.correct;}).length/graded.length):null,
      coverage:qs.length?Math.round(100*attemptedIds.size/qs.length):null,
      gaps:qs.filter(function(q){return isGap(state,q);}).length,
      weak:qs.filter(function(q){return isWeak(state,q);}).length,
      sessions:state.sessions.filter(function(s){return !!s.completedAt && (!courseId||s.courseId===courseId);}).length };
  }
  function findWeak(state, courseId) { return byCourse(state.questions,courseId).filter(function(q){return isWeak(state,q);}); }
  function shuffled(items) { var a=items.slice(); for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;} return a; }
  function parseMaterial(content, courseId, topicId, materialId) {
    var lines = String(content||'').split(/\r?\n/);
    var terms=[], pairs=[];
    for (var i=0;i<lines.length;i++) {
      var line=lines[i].trim(), match=line.match(/^(.{2,90}?)\s*::\s*(.{2,})$/);
      if(match){terms.push({term:match[1].trim(),definition:match[2].trim()});continue;}
      var q=line.match(/^Q\s*:\s*(.+)$/i);
      if(q){var j=i+1;while(j<lines.length&&!lines[j].trim())j++;var a=j<lines.length?lines[j].trim().match(/^A\s*:\s*(.+)$/i):null;
        if(a){pairs.push({question:q[1].trim(),answer:a[1].trim()});i=j;}}
    }
    var unique=[], seen=new Set();
    terms.forEach(function(t){if(!seen.has(t.term.toLowerCase())){unique.push(t);seen.add(t.term.toLowerCase());}});
    var now=new Date().toISOString(), result=[];
    unique.forEach(function(t,i){
      var opts= unique.length>=4 ? [t.term].concat(unique.filter(function(d){return d.term!==t.term;}).slice(i+1).concat(unique.filter(function(d){return d.term!==t.term;}).slice(0,i+1)).slice(0,3).map(function(o){return o.term;})) : [];
      var mcq=opts.length===4;
      result.push({id:uid('q'),courseId:courseId,topicId:topicId,sourceId:materialId,type:mcq?'mcq':'short',
        prompt:'Which term matches this definition? '+t.definition,options:mcq?shuffled(opts):[],answer:t.term,
        explanation:t.term+' — '+t.definition,sourceExcerpt:t.term+' :: '+t.definition,origin:'parser',isDemo:false,createdAt:now});
    });
    pairs.forEach(function(p){result.push({id:uid('q'),courseId:courseId,topicId:topicId,sourceId:materialId,type:'short',prompt:p.question,options:[],answer:p.answer,
      explanation:'Compare your response with the answer from your notes.',sourceExcerpt:'Q: '+p.question+'\nA: '+p.answer,origin:'parser',isDemo:false,createdAt:now});});
    // Ordinary lecture slides and prose can create faithful self-graded recall prompts.
    // We never invent a multiple-choice answer from unsupported unstructured prose.
    if (result.length < 25 && root.SyllaLecture) {
      var recall=root.SyllaLecture.recallCandidates(content,Math.min(32-result.length,32));
      recall.forEach(function(item){
        if(result.length>=32)return;
        result.push({id:uid('q'),courseId:courseId,topicId:topicId,sourceId:materialId,type:'short',
          prompt:item.prompt,options:[],answer:item.answer,
          explanation:'Source-grounded recall prompt. Compare your response with the source passage and grade yourself.',
          sourceExcerpt:item.sourceExcerpt,sourcePage:item.sourcePage,origin:'source-recall',isDemo:false,createdAt:now});
      });
    }
    return result;
  }
  var demoItems = [
    ['What automatically assigns IP configuration to devices on a network?',['DNS','DHCP','FTP','HTTPS'],'DHCP','DHCP provides IP settings automatically to clients.','Addressing'],
    ['Which protocol resolves a domain name such as example.com to an IP address?',['DNS','NTP','DHCP','SSH'],'DNS','DNS answers questions about domain names and their associated records.','Addressing'],
    ['What is the main job of a network switch?',['Connect devices on a LAN using MAC addresses','Assign public IP addresses to every device','Translate hostnames into IP addresses','Encrypt all internet traffic'],'Connect devices on a LAN using MAC addresses','An Ethernet switch forwards frames in a local network using learned MAC addresses.','Devices'],
    ['Which transport protocol provides a reliable, ordered byte stream?',['UDP','IP','TCP','ARP'],'TCP','TCP uses sequencing, acknowledgements and retransmission for reliability.','Protocols'],
    ['Which protocol is connectionless and normally does not guarantee delivery?',['TCP','UDP','SSH','TLS'],'UDP','UDP sends datagrams without TCP-style delivery guarantees.','Protocols'],
    ['Which device commonly forwards packets between different IP networks?',['Router','Repeater','Hub','Patch panel'],'Router','A router chooses paths to forward IP packets between networks.','Devices'],
    ['Which address is used to deliver Ethernet frames on a local link?',['MAC address','URL','Port number','Domain name'],'MAC address','Ethernet uses link-layer MAC addresses to deliver frames across the local network.','Addressing'],
    ['Which protocol securely provides a remote command-line session?',['Telnet','FTP','SSH','HTTP'],'SSH','SSH encrypts remote terminal sessions and supports authentication.','Protocols'],
    ['What does a subnet mask help identify?',['Network and host portions of an IP address','A Wi-Fi password','A DNS mail record','An Ethernet cable type'],'Network and host portions of an IP address','The subnet mask separates the network prefix from host bits in an IPv4 address.','Addressing'],
    ['What is the purpose of a default gateway on a host?',['Reach destinations outside its local network','Replace the DNS server','Create a MAC address','Store the device hostname'],'Reach destinations outside its local network','A host sends packets for non-local destinations to its configured default gateway.','Devices']
  ];
  function addDemo(state) {
    var existing=state.courses.find(function(c){return c.isDemo;});if(existing)return existing.id;
    var createdAt=new Date().toISOString(), id=uid('course'),sourceId=uid('source');
    state.courses.push({id:id,name:'Networking Fundamentals',examDate:'',createdAt:createdAt,isDemo:true});
    var names=['Addressing','Devices','Protocols'], topicIds={};
    names.forEach(function(name){var tid=uid('topic');topicIds[name]=tid;state.topics.push({id:tid,courseId:id,name:name});});
    var content=demoItems.map(function(d){return d[0]+'\nCorrect answer: '+d[2]+'\n'+d[3];}).join('\n\n');
    state.materials.push({id:sourceId,courseId:id,topicId:'',title:'Original networking essentials — sample study notes',content:content,createdAt:createdAt,isDemo:true});
    demoItems.forEach(function(d){state.questions.push({id:uid('q'),courseId:id,topicId:topicIds[d[4]],sourceId:sourceId,type:'mcq',prompt:d[0],options:d[1],answer:d[2],explanation:d[3],sourceExcerpt:d[3],origin:'demo',isDemo:true,createdAt:createdAt});});
    return id;
  }
  function removeDemo(state) {
    var ids=new Set(state.courses.filter(function(c){return c.isDemo;}).map(function(c){return c.id;}));
    var qids=new Set(state.questions.filter(function(q){return ids.has(q.courseId);}).map(function(q){return q.id;}));
    state.courses=state.courses.filter(function(c){return !ids.has(c.id);});
    state.topics=state.topics.filter(function(x){return !ids.has(x.courseId);});
    state.materials=state.materials.filter(function(x){return !ids.has(x.courseId);});
    state.questions=state.questions.filter(function(x){return !ids.has(x.courseId);});
    state.attempts=state.attempts.filter(function(x){return !qids.has(x.questionId);});
    state.sessions=state.sessions.filter(function(x){return !ids.has(x.courseId);});
  }
  function deleteCourse(state, courseId) {
    var qids=new Set(state.questions.filter(function(q){return q.courseId===courseId;}).map(function(q){return q.id;}));
    state.courses=state.courses.filter(function(x){return x.id!==courseId;});
    state.topics=state.topics.filter(function(x){return x.courseId!==courseId;});
    state.materials=state.materials.filter(function(x){return x.courseId!==courseId;});
    state.questions=state.questions.filter(function(x){return x.courseId!==courseId;});
    state.attempts=state.attempts.filter(function(x){return !qids.has(x.questionId);});
    state.sessions=state.sessions.filter(function(x){return x.courseId!==courseId;});
  }
  function deleteQuestion(state,id) {
    state.questions=state.questions.filter(function(q){return q.id!==id;});
    state.attempts=state.attempts.filter(function(a){return a.questionId!==id;});
  }
  function addAttempt(state,sessionId,q,choice,confidence,manualResult) {
    var correct=q.type==='mcq'?choice===q.answer:!!manualResult;
    var attempt={id:uid('attempt'),questionId:q.id,sessionId:sessionId,selectedAnswer:choice,confidence:confidence,
      correct:correct,gradingMethod:q.type==='mcq'?'automatic':'self-reported',answeredAt:new Date().toISOString()};
    state.attempts.push(attempt);return attempt;
  }
  root.SyllaCore={STORAGE_KEY:STORAGE_KEY,VERSION:VERSION,uid:uid,emptyState:emptyState,cleanState:cleanState,
    latestAttempt:latestAttempt,isWeak:isWeak,isGap:isGap,computeStats:computeStats,findWeak:findWeak,
    parseMaterial:parseMaterial,addDemo:addDemo,removeDemo:removeDemo,deleteCourse:deleteCourse,deleteQuestion:deleteQuestion,
    shuffled:shuffled,addAttempt:addAttempt};
})(globalThis);