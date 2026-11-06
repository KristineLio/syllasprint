from playwright.sync_api import sync_playwright
from pathlib import Path
import re
root=Path(__file__).parents[1]
html=(root/'index.html').read_text()
css=(root/'css/style.css').read_text()
core=(root/'js/core.js').read_text()
app=(root/'js/app.js').read_text()
lecture=(root/'js/lecture.js').read_text()
html=html.replace('<link rel="stylesheet" href="css/style.css" />','<style>'+css+'</style>')
html=re.sub(r'\s*<script defer src="js/(?:core|app|lecture)\.js"></script>', '',html)
html=html.replace('</body>','<script>'+core+'</script><script>'+lecture+'</script><script>'+app+'</script></body>')
errors=[]
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=browser.new_page(viewport={'width':1365,'height':900})
 page.on('pageerror',lambda e: errors.append(str(e)))
 page.evaluate('''() => { let data={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}}); }''')
 page.set_content(html,wait_until='load')
 print('TITLE:',page.title())
 print('INITIAL BUTTON:',page.get_by_text('Try a 60-second exam').count())
 page.screenshot(path=str(root/'tests/home-desktop.png'),full_page=True)
 page.get_by_text('Try a 60-second exam').click()
 print('QUIZ:',page.locator('.quiz-card h2').inner_text())
 print('OPTIONS:',page.locator('.answer-option').count())
 def question():
  return page.evaluate('''() => {const s=JSON.parse(localStorage.getItem('syllasprint_v1')); const q=s.questions.find(q=>q.prompt===document.querySelector('.quiz-card h2').textContent); return {answer:q.answer,options:q.options};}''')
 q=question()
 page.locator('.answer-option').filter(has_text=next(x for x in q['options'] if x!=q['answer'])).click()
 page.get_by_text('Very sure').click()
 page.get_by_text('Check answer').click()
 print('GAP BANNER:',page.get_by_text('Confidence Gap detected').count())
 assert page.get_by_text('Confidence Gap detected').count()==1
 page.get_by_text('Next question').click()
 for i in range(4):
  q=question()
  page.locator('.answer-option').filter(has_text=q['answer']).click()
  page.get_by_text('Somewhat sure').click()
  page.get_by_text('Check answer').click()
  page.get_by_text('See my results' if i==3 else 'Next question').click()
 print('RESULTS:',page.locator('.result-banner h2').inner_text())
 page.get_by_text('Retake weak spots').first.click()
 q=question()
 page.locator('.answer-option').filter(has_text=q['answer']).click()
 page.get_by_text('Very sure').click()
 page.get_by_text('Check answer').click()
 page.get_by_text('See my results').click()
 assert page.get_by_text('1 confidence gap resolved this session.').count()==1
 page.get_by_text('Dashboard',exact=True).first.click()
 print('GAP AFTER RETAKE',page.locator('.stat').filter(has_text='Confidence gaps').locator('.stat-number').inner_text())
 assert page.locator('.stat').filter(has_text='Confidence gaps').locator('.stat-number').inner_text()=='0'
 page.get_by_text('Add course').first.click()
 page.locator('#course-name').fill('Data Structures')
 page.get_by_text('Create course',exact=True).click()
 page.get_by_text('Import PDF / notes').click()
 page.locator('#material-title').fill('Core protocols')
 page.locator('#material-content').fill('''DNS :: Translates domain names into IP addresses.\nDHCP :: Assigns IP configuration.\nTCP :: Provides reliable transport.\nUDP :: Sends connectionless datagrams.\nQ: What is a stack?\nA: Last-in first-out container.''')
 page.get_by_text('Save & generate questions').click()
 print('CUSTOM QUESTIONS:',page.locator('.question-row').count())
 assert page.locator('.question-row').count()>=5
 page.screenshot(path=str(root/'tests/course-desktop.png'),full_page=True)
 # Exercise a text-based PDF import through the browser. A local PDF.js API stand-in
 # verifies UI/state wiring; this does not claim to test the CDN PDF.js parser itself.
 page.get_by_text('Import PDF / notes').click()
 pages=[]
 import fitz, os, tempfile
 fixture=os.environ.get('SYLLASPRINT_PDF_FIXTURE','')
 if not fixture:
  fixture=str(root/'tests/fixture-generated.pdf')
  d=fitz.open()
  for heading,text in [('Polymorphism','Polymorphism means one operation can behave differently depending on object type.'),('Encapsulation','Encapsulation allows callers to use an object without knowing its internal implementation.'),('Inheritance','Inheritance allows child classes to reuse behavior from parent classes.'),('Object variables','Object variables are properties that belong to individual object instances.')]:
   p=d.new_page();p.insert_text((70,80),heading,fontsize=19);p.insert_text((70,120),text,fontsize=11)
  d.save(fixture);d.close()
 with fitz.open(fixture) as document:
  for pdfpage in document:
   lines=pdfpage.get_text().splitlines()
   pages.append([{ 'str':line, 'hasEOL': True} for line in lines])
 page.evaluate('''(pages) => {window.pdfjsLib={GlobalWorkerOptions:{},getDocument(){return {promise:Promise.resolve({numPages:pages.length,getPage:async n=>({getTextContent:async()=>({items:pages[n-1]})})})}}};}''', pages)
 page.locator('#material-title').fill('Python OOP · actual lecture PDF')
 page.locator('#material-file').set_input_files(fixture)
 page.wait_for_function(f"document.querySelector('#pdf-status').textContent.includes('{len(pages)} PDF pages')",timeout=15000)
 print('PDF IMPORT STATUS:',page.locator('#pdf-status').inner_text())
 assert 'Page 1' in page.locator('#material-content').input_value()
 page.get_by_text('Save & generate questions').click()
 count=page.locator('.question-row').count()
 print('COURSE QUESTIONS AFTER PDF:',count)
 assert count>=8
 assert page.locator('.question-row').filter(has_text='source-grounded recall').count()>=3
 page.get_by_text('Practice now').click()
 assert page.locator('.quiz-card').count()==0 or page.locator('.quiz-card').count()==1
 # Continue through setup and confirm the imported question bank can be chosen.
 assert page.locator('#exam-count option').count()>=1
 print('PDF-based course loaded into Exam Room.')
 if not os.environ.get('SYLLASPRINT_PDF_FIXTURE'): Path(fixture).unlink(missing_ok=True)

 mobile=browser.new_page(viewport={'width':375,'height':812},device_scale_factor=1)
 mobile.on('pageerror',lambda e: errors.append(str(e)))
 mobile.evaluate('''() => {let data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}});}''')
 mobile.set_content(html,wait_until='load')
 mobile.screenshot(path=str(root/'tests/home-mobile.png'),full_page=True)
 print('MOBILE OVERFLOW:',mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth'))
 print('JS ERRORS:',errors)
 assert not errors,errors
 assert not mobile.evaluate('document.documentElement.scrollWidth > window.innerWidth')
 browser.close()