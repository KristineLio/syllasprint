/* Source-grounded lecture extraction and deterministic recall prompts. No AI or uploads to a server. */
(function (root) {
  'use strict';
  var PDFJS_SRC='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  var PDFJS_WORKER='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  var loading;
  function loadScript(src){return new Promise(function(resolve,reject){
    var script=document.createElement('script'),finished=false;
    var watchdog=setTimeout(function(){finish(new Error('PDF reader timed out.'));},15000);
    function finish(error){if(finished)return;finished=true;clearTimeout(watchdog);if(error){script.remove();reject(error);}else resolve();}
    script.src=src;script.crossOrigin='anonymous';
    script.onload=function(){finish(root.pdfjsLib?null:new Error('PDF reader did not initialize.'));};
    script.onerror=function(){finish(new Error('Could not load PDF reader.'));};
    document.head.appendChild(script);
  });}
  function ensurePdfJs(){
    if(root.pdfjsLib) return Promise.resolve(root.pdfjsLib);
    if(loading) return loading;
    loading=loadScript(PDFJS_SRC).catch(function(){return loadScript('https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js');})
      .then(function(){if(!root.pdfjsLib)throw new Error('PDF reading library unavailable.');return root.pdfjsLib;})
      .catch(function(){loading=null;throw new Error('PDF reader could not load. Check your connection or paste the PDF text instead.');});
    return loading;
  }
  async function extractPdf(file){
    if(!file || !/\.pdf$/i.test(file.name))throw new Error('Select a PDF file.');
    if(file.size>12*1024*1024)throw new Error('PDF is larger than 12 MB. Select a smaller lecture or paste the relevant pages.');
    var pdfjs=await ensurePdfJs();pdfjs.GlobalWorkerOptions.workerSrc=PDFJS_WORKER;
    var buffer=await file.arrayBuffer();
    var doc=await pdfjs.getDocument({data:new Uint8Array(buffer)}).promise;
    if(doc.numPages>100)throw new Error('Please select a PDF with 100 pages or fewer.');
    var pages=[],total=0;
    for(var i=1;i<=doc.numPages;i++){
      var page=await doc.getPage(i);var data=await page.getTextContent();
      var lines=[],line='';
      data.items.forEach(function(item){
        var part=String(item.str||'');
        if(part){line+=(line&&!/^\s|[\s,.;:!?)]/.test(part)?' ':'')+part;}
        if(item.hasEOL){if(line.trim())lines.push(line.trim());line='';}
      });
      if(line.trim())lines.push(line.trim());
      var txt=lines.join('\n').trim();
      if(txt){total+=txt.length;pages.push('[[Page '+i+']]\n'+txt);}
      if(total>360000)throw new Error('This PDF contains too much text for browser-local storage. Import a shorter section.');
    }
    if(total<50)throw new Error('No readable text found. This may be a scanned PDF. Paste its extracted text instead; this app does not use OCR.');
    return {text:pages.join('\n\n'),pages:doc.numPages,characters:total,readablePages:pages.length};
  }
  /* Parses ordinary pages/notes into faithful self-graded prompts; no invented answers. */
  function recallCandidates(content,maxCards){
    var text=String(content||'').replace(/\r/g,'');
    var blocks=text.split(/\[\[Page\s+(\d+)\]\]/i),sourcePages=[];
    if(blocks.length>1){for(var j=1;j<blocks.length;j+=2)sourcePages.push({page:Number(blocks[j]),content:blocks[j+1]||''});}
    else sourcePages=[{page:null,content:text}];
    var candidates=[],seen=new Set();
    var boilerplate=/^(content|overview|introduction|lecture\s*\d*|python|example|task\s*\d*|references|thank you|conclusion)\s*[:.!]?$/i;
    var trivial=/^(this|that|it|we|you|there|yes|let|lets|if|the writer|the code|for example|another|some|every|one|in order|in this|when)\b/i;
    function isCode(s){return /^(>>>|\s*(?:class|def|for|while|return|print|from|import|if|elif|else|pass|break|continue)\b|\s*\w+[.\[(])/.test(s)||/[{};=]{2,}/.test(s)||/\b(?:[a-z_]+\s*=|print\s+\w+|[a-z_]+\.\w+\()/i.test(s);}
    function add(heading,answer,page){
      answer=answer.replace(/^[●•▪\-–]\s*/,'').replace(/\s+/g,' ').trim();
      if(answer.length<48||answer.length>600||isCode(answer)||/^\s*(?:http|www\.)/i.test(answer))return;
      if(trivial.test(answer)&&!(heading&&!boilerplate.test(heading)&&/^(?:this means|if we use objects)/i.test(answer)))return;
      if(boilerplate.test(answer)||/^(?:example:|conclusion:|the following|click|in the next|as shown|write a program)/i.test(answer))return;
      var key=answer.toLowerCase().replace(/\W+/g,' ').slice(0,100);
      if(seen.has(key))return;
      var lead=answer.match(/^(.{3,85}?)\s+(is|are|means|allows|provides|represents|contains|refers to|can be|is used to|are used to|has|have|uses|returns|implements)\b/i);
      var subject=lead?lead[1].replace(/^(?:the|a|an)\s+/i,'').trim():'';
      if(subject.split(/\s+/).length>10||subject.length>68||trivial.test(subject))subject='';
      var prompt='', score=0;
      if(subject){
        var verb=lead[2].toLowerCase();
        if(verb==='means'||verb==='refers to')prompt='What does '+subject+' mean?';
        else if(verb==='allows')prompt='What does '+subject+' allow?';
        else if(verb==='is used to'||verb==='are used to')prompt='What is '+subject+' used for?';
        else if(verb==='implements')prompt='What does '+subject+' implement?';
        else if(verb==='has'||verb==='have')prompt='What does '+subject+' contain or have?';
        else if(verb==='uses')prompt='What does '+subject+' use?';
        else if(verb==='returns')prompt='What does '+subject+' return?';
        else prompt='Explain the statement about '+subject+'.';
        score=3;
      } else if (heading && !boilerplate.test(heading)){
        prompt='What key idea about '+heading+' does this passage explain?';score=2;
      }
      if(!prompt)return;
      // Avoid generic filler and incomplete dangling sentences even when the heading exists.
      if(/(?:such as|as follows|like this|there are|the following|for example|this:|this\.|called|a|an|the|or|and|to|with|as|from|than|in)\s*$/i.test(answer))return;
      if(answer.length>380){answer=answer.slice(0,370).replace(/\s+\S*$/,'')+'…';}
      seen.add(key);
      candidates.push({prompt:prompt,answer:answer,sourceExcerpt:(page?'Page '+page+' · ':'')+answer,sourcePage:page||null,score:score});
    }
    sourcePages.forEach(function(section){
      var raw=section.content.split('\n').map(function(s){return s.trim();}).filter(Boolean);
      var heading='',segments=[],current='';
      function flush(){if(current.trim())segments.push({heading:heading,text:current.trim()});current='';}
      raw.forEach(function(line,idx){
        var bullet=/^[●•▪]\s*/.test(line);
        var candidateHeading=line.length<52&&!bullet&&!isCode(line)&&!/\.$/.test(line)&&!/^(?:\d+\.|[\[(])/.test(line)&&!/[!?=]/.test(line)&&!/^\s*(?:[\d]+|[-–])\s*$/.test(line);
        if(candidateHeading && idx===0){flush();if(!boilerplate.test(line))heading=line;return;}
        if(bullet){flush();current=line.replace(/^[●•▪]\s*/,'');}
        else if(!current){current=line;}
        else if(line.length<170&&!isCode(line)){current+=' '+line;}
        else flush();
      });flush();
      var perPage=[];
      segments.forEach(function(s){var old=candidates.length;add(s.heading,s.text,section.page);if(candidates.length>old)perPage.push(candidates.pop());});
      perPage.sort(function(a,b){return b.score-a.score;});
      candidates.push.apply(candidates,perPage.slice(0,2));
    });
    return candidates.slice(0,Math.max(1,maxCards||32)).map(function(c){delete c.score;return c;});
  }
  root.SyllaLecture={extractPdf:extractPdf,recallCandidates:recallCandidates};
})(globalThis);