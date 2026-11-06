from pathlib import Path
import re
from playwright.sync_api import sync_playwright
root=Path(__file__).parents[1]
html=(root/'index.html').read_text(encoding='utf-8')
html=re.sub(r'<link rel="stylesheet" href="css/style\.css(?:\?[^\"]*)?"\s*/>','<style>'+(root/'css/style.css').read_text(encoding='utf-8')+'</style>',html)
html=re.sub(r'\s*<script defer src="js/(?:core|app|lecture|guide)\.js(?:\?[^\"]+)?"></script>','',html)
html=html.replace('</body>',''.join('<script>'+(root/'js'/f'{name}.js').read_text(encoding='utf-8')+'</script>' for name in ['core','lecture','guide','app'])+'</body>')
errors=[]
with sync_playwright() as p:
  b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  page=b.new_page(viewport={'width':1260,'height':900})
  page.on('pageerror', lambda e: errors.append(str(e)))
  page.evaluate('''() => { let data={}; Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}}); }''')
  page.set_content(html,wait_until='load')
  page.get_by_role('button',name='Add course').first.click()
  page.locator('#course-name').fill('Python Object-Oriented Programming')
  page.locator('#app-modal button[type=submit]').click()
  page.locator('[data-action=add-material]').first.click()
  page.locator('#material-title').fill('OOP Lecture')
  page.locator('#material-content').fill('''Polymorphism :: Different types implement operations differently.
Encapsulation :: Hides internal implementation details behind an interface.
Inheritance :: A child class can reuse behavior of a parent class.
Initialization :: The __init__ method sets initial instance state.

class SchoolMember:
    def __init__(self, name):
        self.name = name

class Student(SchoolMember):
    def __init__(self, name, year):
        super().__init__(name)
        self.year = year
''')
  page.get_by_role('button',name='Save material & generate practice').click()
  assert page.locator('.question-row').count() >= 4
  page.get_by_role('button',name='Study',exact=True).first.click()
  assert page.locator('.guide-session-head h1').inner_text()=='Understand'
  for _ in range(5):
    if page.locator('.guide-session-head h1').inner_text()!='Understand':break
    page.get_by_role('button',name=re.compile('I understand')).click()
  assert page.locator('.guide-session-head h1').inner_text()=='Active recall'
  first=None
  for _ in range(6):
    if page.locator('.guide-session-head h1').inner_text()!='Active recall':break
    qtext=page.locator('.guide-lesson h2').inner_text()
    page.locator('.answer-option').first.click()
    page.get_by_role('button',name='Very sure').click()
    page.get_by_role('button',name=re.compile('Check answer')).click()
    if first is None:first=qtext
    if page.get_by_role('button',name='I got it',exact=True).count():page.get_by_role('button',name='I got it',exact=True).click()
    page.get_by_role('button',name=re.compile('Next step')).click()
  assert page.locator('.guide-session-head h1').inner_text()=='Apply'
  page.locator('#guide-answer').fill('A student inherits the parent attribute for name and uses methods from its parent to reduce duplication.')
  page.get_by_role('button',name=re.compile('Compare with source')).click()
  page.get_by_role('button',name='Meets the rubric').click()
  page.get_by_role('button',name=re.compile('Continue')).click()
  assert page.locator('.guide-session-head h1').inner_text()=='Debug / test'
  assert 'class SchoolMember' in page.locator('.guide-code').inner_text()
  page.locator('#guide-answer').fill('Check that calling the constructor with an empty name sets the state as expected.')
  page.get_by_role('button',name=re.compile('Compare with source')).click()
  page.get_by_role('button',name='Needs work').click()
  page.get_by_role('button',name=re.compile('Continue')).click()
  assert page.locator('.guide-session-head h1').inner_text()=='Revision'
  for _ in range(5):
    if page.locator('.guide-session-head h1').count()==0 or page.locator('.guide-session-head h1').inner_text()!='Revision':break
    page.locator('.answer-option').first.click()
    page.get_by_role('button',name='Somewhat sure').click()
    page.get_by_role('button',name=re.compile('Check answer')).click()
    page.get_by_role('button',name=re.compile('Next step')).click()
  assert 'You finished the study path' in page.locator('h1').inner_text()
  saved=page.evaluate('''() => {let s=JSON.parse(localStorage.getItem('syllasprint_v1'));return {sessions:s.sessions.filter(s=>s.kind==='guided'),attempts:s.attempts.length}}''')
  assert len(saved['sessions'])==1 and saved['sessions'][0]['completedAt'] and saved['attempts']>=4, saved
  page.get_by_role('button',name='Choose another lecture').click()
  assert 'Study tracker' in page.locator('#content').inner_text()
  page.get_by_role('button',name='View report').click()
  assert 'You finished the study path' in page.locator('h1').inner_text()
  page.screenshot(path=str(root/'tests/guide-complete.png'),full_page=True)
  print('Guided learning journey: 5 stages completed; attempts and learning tracker persisted',saved['attempts'])
  assert not errors, errors
  b.close()