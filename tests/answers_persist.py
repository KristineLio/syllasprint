from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet" href="css/style\.css(?:\?[^\"]*)?"\s*/>','<style>'+(root/'css/style.css').read_text(encoding='utf-8')+'</style>',html)
html=re.sub(r'\s*<script defer src="js/(?:core|app|lecture|guide|commute)\.js(?:\?[^\"]+)?"></script>','',html)
html=html.replace('</body>',''.join('<script>'+(root/'js'/f'{name}.js').read_text(encoding='utf-8')+'</script>' for name in ['core','lecture','guide','commute','app'])+'</body>')

with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 page=b.new_page(viewport={'width':1200,'height':850})
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 page.evaluate('''() => {let data={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}}); }''')
 page.set_content(html,wait_until='load')
 page.get_by_role('button',name='Add course').first.click()
 page.locator('#course-name').fill('OOP')
 page.locator('#app-modal button[type=submit]').click()
 page.locator('[data-action=add-material]').first.click()
 page.locator('#material-title').fill('Lecture 7')
 page.locator('#material-content').fill('''Polymorphism :: Different objects use the same interface differently.
Encapsulation :: Protects implementation details and separates data ownership.
Inheritance :: A child class can reuse behavior of a parent class.
Initialization :: The __init__ method sets state of a newly created object.''')
 page.get_by_role('button',name='Save material & generate practice').click()
 page.get_by_role('button',name='Study',exact=True).first.click()
 assert page.locator('.guide-session-head h1').inner_text()=='Understand'
 answer='My own understanding of polymorphism is that two classes may share method names but behave differently.'
 page.locator('#guide-answer').fill(answer)
 saved=page.evaluate("JSON.parse(localStorage.getItem('syllasprint_v1'))")
 sess=next(s for s in saved['sessions'] if s.get('kind')=='guided')
 assert sess['drafts']['0:0']['text']==answer, 'Typed reflection not persisted'
 page.get_by_role('button',name='Guided Study').first.click()
 page.get_by_role('button',name='Continue',exact=True).click()
 assert page.locator('#guide-answer').input_value()==answer, 'Draft not restored when resuming'
 page.get_by_role('button',name=re.compile('Continue to next')).click()
 assert answer in page.locator('.guide-journal').inner_text(), 'Saved response absent from journal'
 saved=page.evaluate("JSON.parse(localStorage.getItem('syllasprint_v1'))")
 sess=next(s for s in saved['sessions'] if s.get('kind')=='guided')
 assert any(r['response']==answer for r in sess['records']), 'Reflection absent from persistent records'
 # Simulate a page reload by creating an independent browsing page with stored state.
 second=b.new_page(viewport={'width':1200,'height':850})
 second.on('pageerror',lambda e:errors.append(str(e)))
 import json
 second.evaluate('''(serialized) => {let data={'syllasprint_v1':serialized};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}});}''',json.dumps(saved))
 second.set_content(html,wait_until='load')
 second.locator('[data-action="navigate"][data-id="guide"]').first.click()
 second.get_by_role('button',name='Continue',exact=True).click()
 assert answer in second.locator('.guide-journal').inner_text(),'Answer missing after simulated reload'
 # Ensure active free-text draft survives re-entering a lesson without submitting.
 page.locator('.guide-lesson #guide-answer').fill('My second paraphrase is more concise.')
 page.get_by_role('button',name='Guided Study').first.click()
 page.get_by_role('button',name='Continue',exact=True).click()
 assert page.locator('#guide-answer').input_value()=='My second paraphrase is more concise.'
 assert not errors,errors
 print('PASS: autosaved reflection, session resume, session journal, persisted history and simulated reload')
 b.close()
