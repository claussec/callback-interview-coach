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
// Fake camera and microphone so the video interview can run headless.
const args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
before(async()=>{browser=await chromium.launch(exe?{executablePath:exe,args}:{args});});
after(async()=>{await browser?.close();});

/* open the app with a given saved state; collects page errors and outside requests */
async function open({settings={onboarded:true},history=[],width=1280,scheme='light'}={}){
  const ctx=await browser.newContext({viewport:{width,height:860},colorScheme:scheme,permissions:['camera','microphone']});
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

test('speech analysis counts pace and filler words',async()=>{
  const {page,ctx}=await open();
  const de=await page.evaluate(()=>speechStats('Also, äh, ich habe ähm im Praktikum halt die Kostenrechnung aufgebaut.',6,'de'));
  assert.equal(de.wpm,110);
  assert.equal(de.fillN,4);
  const en=await page.evaluate(()=>speechStats('Um, I basically built the, you know, cost reporting.',6,'en'));
  assert.deepEqual(Object.keys(en.fill).sort(),['basically','um','you know']);
  await ctx.close();
});

test('video interview: camera recording, review, self-rating, saved to history',async()=>{
  const {page,ctx,errors}=await open({settings:app({profile:'BWL'})});
  await page.evaluate(()=>{VIDEO_TIMING.prep=1;runStep('video');});
  await page.click('[data-v="start"]');
  for(let i=0;i<3;i++){
    await page.waitForSelector('[data-v="done"]');
    await page.waitForTimeout(600);
    await page.click('[data-v="done"]');
  }
  await page.waitForSelector('.v-list');
  assert.equal(await page.locator('.v-item video').count(),3,'each answer is recorded with the camera');
  for(const id of ['inhalt','struktur','wirkung','zeit'])await page.click(`[data-vs="${id}:4"]`);
  await page.click('[data-v="save"]');
  await page.waitForSelector('.v-card .scorecard');
  assert.equal(await page.evaluate(()=>Store.list[0].kind),'video');
  assert.ok(await page.isVisible('#fbq'),'first finished exercise asks for feedback');
  await page.keyboard.press('Escape');
  await page.click('[data-fq="5"]');
  await page.click('[data-fq="send"]');
  assert.equal(await page.evaluate(()=>settings.fb.answers[0].r),5);
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('video interview falls back to written answers',async()=>{
  const {page,ctx,errors}=await open();
  await page.evaluate(()=>{VIDEO_TIMING.prep=1;runStep('video');});
  await page.click('[data-v="text"]');
  await page.waitForSelector('[data-v="done"]');
  await page.fill('#v-text','Ich würde äh zuerst die Struktur klären.');
  await page.click('[data-v="done"]');
  assert.equal(await page.evaluate(()=>Video.st.items[0].av),'text');
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('progress shows the change per criterion',async()=>{
  const crit=(a,b,c,d)=>[['struktur',a],['substanz',b],['motivation',c],['wirkung',d]].map(([id,p])=>({id,label:id,punkte:p,kommentar:''}));
  const mk=(i,score,k)=>({id:'f'+i,kind:'fit',date:new Date(Date.now()-(10-i)*864e5).toISOString(),title:'x',score,verdict:'knapp',meta:{art:'klassisch',n:4,lang:'de'},feedback:{gesamt:score,urteil:'knapp',kriterien:k,staerken:[],verbesserungen:[]}});
  const history=[mk(1,2.8,crit(3,2,3,3)),mk(2,3.0,crit(3,2,3,4)),mk(3,3.6,crit(4,3,4,4)),mk(4,3.9,crit(4,4,4,4))].reverse();
  const {page,ctx,errors}=await open({history});
  await page.evaluate(()=>setTab('history'));
  const delta=await page.locator('.pg-delta').first().innerText();
  assert.match(delta,/2,9 → 3,8 \+0,9/);
  assert.equal(await page.locator('.pgl .pt').count(),4);
  assert.deepEqual(errors,[]);
  await ctx.close();
});
