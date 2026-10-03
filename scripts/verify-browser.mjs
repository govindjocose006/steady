// Optional read-only checks in an explicitly supplied, already authenticated browser.
// This never supplies identity headers, saves test records, persists auth, or deploys.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),origin=process.env.STEADY_BROWSER_ORIGIN,endpoint=process.env.STEADY_BROWSER_CDP;
let playwright;
try{playwright=require(process.env.STEADY_PLAYWRIGHT_MODULE||'playwright');}catch{}
const missing=[];
if(process.env.SITES_MANAGED_LINUX_CONTAINER==='1')missing.push('This managed Sites environment requires its supported control-browser capability.');
if(!playwright)missing.push('Playwright is not installed in the verification environment.');
if(process.env.STEADY_BROWSER_TEST_SESSION!=='1')missing.push('Use a dedicated verification browser and acknowledge that its connection closes after checks.');
if(!origin||!endpoint)missing.push('An explicit test origin and an already signed-in CDP browser are required.');
if(missing.length){console.log('NOT VERIFIED: authenticated browser suite. '+missing.join(' '));process.exit(2);}
const target=new URL(origin);assert.ok(['http:','https:'].includes(target.protocol)&&target.origin===origin,'Use an exact origin without a path.');
const browser=await playwright.chromium.connectOverCDP(endpoint),context=browser.contexts()[0];assert.ok(context,'Supply an existing signed-in browser context.');
const page=await context.newPage(),errors=[];page.on('pageerror',()=>errors.push('Browser runtime error'));
const records=state=>JSON.stringify(Object.fromEntries(Object.entries(state).filter(([key])=>!['serverNow','today'].includes(key))));
async function savedState(){const response=await page.request.get(origin+'/api/tasks');assert.equal(response.status(),200,'The real private account must already be signed in.');return response.json();}
async function navigate(label){
 const desktop=page.getByRole('navigation',{name:'Main navigation',exact:true});
 if(await desktop.isVisible()){await desktop.getByRole('button',{name:label,exact:true}).click();return;}
 const mobile=page.getByRole('navigation',{name:'Mobile navigation',exact:true}),short=label==='Applications'?'PhD':label;
 const direct=mobile.getByRole('button',{name:short,exact:true});if(await direct.count()){await direct.click();return;}
 await mobile.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('navigation',{name:'More navigation',exact:true}).getByRole('button',{name:label,exact:true}).click();
}
try{
 await page.goto(origin,{waitUntil:'load'});const before=records(await savedState());let checks=0;
 for(const viewport of [{width:1366,height:900},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  for(const label of ['Applications','Study','Research','Habits','Rewards','Review','History','Upcoming','Today']){
   await navigate(label);await page.locator('#page-title').waitFor({state:'visible'});await page.waitForFunction(()=>!document.querySelector('.loading-state'));
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),'No horizontal clipping at '+viewport.width+' on '+label);checks++;
  }
  await page.getByRole('button',{name:'Add task',exact:true}).click();await page.getByLabel('Task name',{exact:true}).fill('Unsaved browser check — discard');
  await page.getByRole('button',{name:'Close task form',exact:true}).click();await page.getByRole('button',{name:'Keep editing',exact:true}).click();
  assert.equal(await page.getByLabel('Task name',{exact:true}).inputValue(),'Unsaved browser check — discard');checks++;
  await page.getByRole('button',{name:'Close task form',exact:true}).click();await page.getByRole('button',{name:'Discard edits',exact:true}).click();
  await navigate('Applications');await page.goBack();await page.waitForFunction(()=>document.querySelector('#page-title')?.textContent==='Today');await page.goForward();await page.waitForFunction(()=>document.querySelector('#page-title')?.textContent==='Applications');checks++;
  await navigate('Today');await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>document.activeElement!==document.body),'Keyboard reaches a control');checks++;
 }
 await page.reload({waitUntil:'load'});assert.equal(records(await savedState()),before,'Navigation, draft discard, viewport changes and reload preserve records, points and history');assert.equal(errors.length,0,'No page runtime errors');
 console.log(`PASS: ${checks+2} authenticated browser checks (page access, laptop/phone clipping, draft Keep/Discard, Back/Forward, keyboard reachability, refresh and read-only data preservation).`);
}finally{await page.close();await browser.close();}
