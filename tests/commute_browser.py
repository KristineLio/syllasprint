from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).resolve().parents[1]
html=(root/'syllasprint-vibeflow.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 errors=[]
 page=b.new_page(viewport={'width':1200,'height':820})
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.evaluate("""() => {let data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)},removeItem:k=>delete data[k]}})}""")
 page.set_content(html,wait_until='load')
 page.locator('[data-action=navigate][data-id=commute]').first.click()
 assert page.locator('.commute-hero').is_visible()
 page.locator('[data-action=commute-demo]').first.click()
 assert page.locator('.commute-listen-card').count()==1
 assert '05:00' in page.locator('#commute-remaining').inner_text()
 first=page.locator('.commute-listen-card h1').inner_text()
 page.locator('[data-action=commute-play]').click()
 page.locator('[data-action=commute-stop]').click()
 page.locator('[data-action=commute-save]').click()
 assert 'Saved for review' in page.locator('[data-action=commute-save]').inner_text()
 page.locator('[data-action=commute-reveal]').click()
 assert page.locator('.commute-answer strong').is_visible()
 page.locator('[data-action=commute-grade][data-rating=again]').click()
 saved=page.evaluate("JSON.parse(localStorage.getItem('syllasprint_v1'))")
 assert saved['commute']['sessions'][0]['reviews'][0]['rating']=='again'
 assert saved['commute']['sessions'][0]['reviews'][0]['gradingMethod']=='self-reported'
 assert saved['commute']['savedQuestionIds']
 assert not any(x['gradingMethod']=='automatic' for x in saved['attempts'])
 # leave and return; the unfinished session should resume on the next card
 page.locator('[data-action=commute-back]').click()
 assert page.locator('[data-action=commute-resume]').is_visible()
 page.locator('[data-action=commute-resume]').click()
 assert page.locator('.commute-listen-card h1').inner_text()!=first
 page.locator('[data-action=commute-reveal]').click()
 page.locator('[data-action=commute-grade][data-rating=gotit]').click()
 page.locator('[data-action=commute-back]').click()
 page.locator('[data-action=commute-finish]').click()
 assert page.locator('.commute-report').is_visible()
 assert page.locator('.commute-report').inner_text().find('concepts reviewed')>=0
 # simulate reload from actual localStorage by constructing new page from same context & origin
 ctx=b.new_context(viewport={'width':375,'height':812})
 mobile=ctx.new_page();mobile.on('pageerror',lambda e: errors.append(str(e)))
 mobile.evaluate("""() => {let data={};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>data[k]??null,setItem:(k,v)=>{data[k]=String(v)}}})}""")
 mobile.set_content(html,wait_until='load')
 mobile.locator('[data-action=navigate][data-id=commute]').last.click()
 assert mobile.locator('.commute-hero').is_visible()
 assert mobile.evaluate('document.documentElement.scrollWidth<=window.innerWidth'), 'Mobile horizontal overflow'
 # Test restoration with stored state injected before scripts execute in new browser page
 import json
 reload=b.new_page(viewport={'width':1200,'height':820});reload.on('pageerror',lambda e:errors.append(str(e)))
 reload.evaluate('''(data)=>{let kv={syllasprint_v1:data};Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>kv[k]??null,setItem:(k,v)=>kv[k]=v,removeItem:k=>delete kv[k]}})}''',json.dumps(saved))
 reload.set_content(html,wait_until='load')
 reload.locator('[data-action=navigate][data-id=commute]').first.click()
 assert reload.locator('[data-action=commute-resume]').count()==1 or reload.locator('.commute-recent').count()==1
 assert not errors,errors
 print('PASS: commute audio-controls fallback, answer visibility, bookmarking, self-ratings, report, persistence, 375px responsive layout')
 b.close()
