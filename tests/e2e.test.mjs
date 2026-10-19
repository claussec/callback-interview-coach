// End-to-end checks in a real browser (Chromium via Playwright).
// The page is opened straight from disk, exactly as GitHub Pages serves it.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const PAGE=new URL('../index.html',import.meta.url).href;
const ROOT=fileURLToPath(new URL('..',import.meta.url));
// Local containers ship their own Chromium; in CI Playwright installs one.
const exe=process.env.CHROMIUM_PATH||(existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined);
let browser;
before(async()=>{browser=await chromium.launch(exe?{executablePath:exe}:{});});
after(async()=>{await browser?.close();});

/* open the app with a given saved state; collects page errors and outside requests */
async function open({settings={onboarded:true},history=[],width=1280,scheme='light'}={}){
  const ctx=await browser.newContext({viewport:{width,height:860},colorScheme:scheme});
  await ctx.addInitScript(([s,h])=>{
    if(sessionStorage.getItem('seeded'))return;
    localStorage.clear();
    localStorage.setItem('gp.settings.v1',JSON.stringify(s));
    localStorage.setItem('gp.history.v1',JSON.stringify(h));
    sessionStorage.setItem('seeded','1');
  },[settings,history]);
  const page=await ctx.newPage();
  const errors=[],outside=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{const u=r.url();if(!u.startsWith('file:')&&!u.startsWith('data:'))outside.push(u);});
  await page.goto(PAGE);
  await page.waitForFunction(()=>document.querySelector('#home .nx-t'));
  return {page,ctx,errors,outside};
}
const app=(over={})=>({onboarded:true,track:'trainee',apps:[{id:'a1',firm:'Nordwerk AG',position:'Trainee Finance',stage:'beworben',date:''}],activeApp:'a1',...over});
const rec=(kind,extra={})=>({id:kind+Math.random(),kind,appId:'a1',date:new Date().toISOString(),score:4,meta:{},feedback:{gesamt:4,kriterien:[]},...extra});

test('home renders without errors and loads nothing from third parties',async()=>{
  const {page,ctx,errors,outside}=await open();
  assert.ok(await page.isVisible('#go-btn'));
  assert.ok(await page.isVisible('#orb'));
  assert.deepEqual(errors,[]);
  assert.deepEqual(outside,[],'fonts and scripts must come from the repository');
  await ctx.close();
});

test('the next step follows the application journey',async()=>{
  const cases=[
    [{settings:{onboarded:true}},'cv'],
    [{settings:{onboarded:true,profile:'BWL Master, Praktikum Controlling'}},'goal'],
    [{settings:app({profile:'BWL'})},'go:docs'],
    [{settings:app({profile:'BWL'}),history:[rec('docs')]},'drill:pitch'],
    [{settings:app({profile:'BWL'}),history:[rec('docs'),rec('drill',{drill:'pitch',feedback:{punkte:4}})]},'ac:gruppe'],
  ];
  for(const [state,want] of cases){
    const {page,ctx,errors}=await open(state);
    assert.equal(await page.evaluate(()=>nextStep().act),want);
    assert.deepEqual(errors,[]);
    await ctx.close();
  }
});

test('the field of work is detected from the role',async()=>{
  const {page,ctx}=await open();
  const got=await page.evaluate(()=>[
    ['Trainee Finance','Siemens'],['Consultant','Accenture'],['Software Engineer','SAP'],
    ['Einkäufer','Lidl'],['Data Analyst','Zalando'],['Werkstudent Marketing','Henkel']
  ].map(([position,firm])=>detectArea({position,firm,jobAd:''})));
  assert.deepEqual(got,['finance','consulting','it','operations','data','marketing']);
  await ctx.close();
});

test('switching to English translates the interface',async()=>{
  const {page,ctx,errors}=await open({settings:app({profile:'BWL'})});
  await page.click('[data-lang="en"]');
  await page.waitForFunction(()=>document.documentElement.lang==='en'||/Your next step/.test(document.body.innerText));
  const text=await page.locator('#home').innerText();
  assert.match(text,/Your next step/);
  assert.doesNotMatch(text,/Dein nächster Schritt/);
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('demo mode replays an interview and ends with a scorecard',async()=>{
  const {page,ctx,errors}=await open();
  await page.click('#ai-banner [data-demo]');
  await page.waitForSelector('#demo-log .turn');
  await page.click('[data-dm="all"]');
  assert.equal(await page.locator('#demo-log .turn').count(),10);
  assert.ok(await page.isVisible('.demo-card'));
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#demo-dlg').isHidden());
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('phone width: no sideways scrolling, light and dark',async()=>{
  for(const scheme of ['light','dark']){
    const {page,ctx,errors}=await open({settings:app({profile:'BWL'}),width:390,scheme});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0);
    assert.deepEqual(errors,[]);
    await ctx.close();
  }
});

test('every section opens without errors',async()=>{
  const {page,ctx,errors}=await open({settings:app({profile:'BWL'})});
  for(const t of ['library','docs','fit','ac','case','math','history','learn'])await page.evaluate(t=>setTab(t),t);
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('dark mode choice is remembered',async()=>{
  const {page,ctx}=await open();
  await page.click('#themesw');
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await page.reload();
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),'dark');
  await ctx.close();
});

test('contact details are stripped from CV text before it reaches the model',async()=>{
  const {page,ctx}=await open();
  const out=await page.evaluate(()=>stripContacts('Max Muster\nmax.muster@example.com | +49 170 1234567 | linkedin.com/in/max https://max.dev\nPraktikum Controlling, Nordwerk AG'));
  assert.doesNotMatch(out,/@|\+49|https?:/);
  assert.match(out,/Praktikum Controlling, Nordwerk AG/);
  await ctx.close();
});
