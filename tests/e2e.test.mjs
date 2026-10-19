// End-to-end checks in a real browser (Chromium via Playwright).
// The page is opened straight from disk, exactly as GitHub Pages serves it.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFile} from 'node:fs';
import {createServer} from 'node:http';
import {extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

// Served over HTTP like GitHub Pages: ES modules and WebAssembly do not load from file://.
const ROOT=fileURLToPath(new URL('..',import.meta.url));
const TYPES={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.wasm':'application/wasm','.woff2':'font/woff2','.jpg':'image/jpeg'};
const server=createServer((q,r)=>{const f=join(ROOT,decodeURIComponent(q.url.split('?')[0]));readFile(f,(e,d)=>{if(e){r.writeHead(404);r.end();return;}r.writeHead(200,{'content-type':TYPES[extname(f)]||'application/octet-stream'});r.end(d);});});
let PAGE;
// Local containers ship their own Chromium; in CI Playwright installs one.
const exe=process.env.CHROMIUM_PATH||(existsSync('/opt/pw-browsers/chromium')?'/opt/pw-browsers/chromium':undefined);
let browser;
// Fake camera and microphone so the video interview can run headless.
const args=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
before(async()=>{
  await new Promise(res=>server.listen(0,'127.0.0.1',res));
  PAGE=`http://127.0.0.1:${server.address().port}/index.html`;
  browser=await chromium.launch(exe?{executablePath:exe,args}:{args});
});
after(async()=>{await browser?.close();server.close();});

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
  page.on('request',r=>{const u=r.url();if(!u.startsWith(new URL(PAGE).origin)&&!u.startsWith('data:')&&!u.startsWith('blob:'))outside.push(u);});
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
  await page.reload({waitUntil:'load'});
  await page.waitForFunction(()=>typeof Theme!=='undefined');
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
    await page.waitForTimeout(1500);
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

test('interview in video mode: camera, recording per answer, speech and body analysis, scorecard',async()=>{
  const {page,ctx,errors}=await open({settings:app({profile:'BWL',mode:'video',fitArt:'klassisch',fitN:2})});
  // Stand-ins for an own AI backend and for the browser's speech recognition.
  await page.evaluate(()=>{
    let n=0;
    const sample=async(input,opts)=>{n++;const t=n<3?'Erzählen Sie von einem Projekt, auf das Sie stolz sind.':'Danke, das war es. [ENDE]';opts?.onText?.({text:t});return {text:t};};
    sample.json=async()=>({gesamt:3.5,urteil:'knapp',zusammenfassung:'Solide.',kriterien:[{id:'struktur',punkte:4,kommentar:''},{id:'substanz',punkte:3,kommentar:''},{id:'motivation',punkte:4,kommentar:''},{id:'wirkung',punkte:3,kommentar:''}],staerken:['Klarer Einstieg'],verbesserungen:[{punkt:'Mehr Zahlen'}],antworten:[]});
    AI.sample=sample;AI.status='ready';renderAIState();
    SR.Ctor=class{start(){this.t=setTimeout(()=>this.onresult?.({resultIndex:0,results:[Object.assign([{transcript:'Also äh ich habe im Praktikum die Kostenrechnung aufgebaut und dabei zwei Tage gespart'}],{isFinal:true})]}),800);}stop(){clearTimeout(this.t);setTimeout(()=>this.onend?.(),10);}};
  });
  await page.evaluate(()=>runStep('start:fit:klassisch'));
  await page.waitForFunction(()=>document.querySelector('#fit-run [data-r="camv"]')?.srcObject?.active);
  for(let i=0;i<2;i++){
    await page.waitForFunction(()=>!REFS.fit.send.disabled);
    await page.click('#fit-run [data-r="mic"]');
    await page.waitForTimeout(2600);
    await page.click('#fit-run [data-r="mic"]');
    await page.waitForTimeout(200);
    await page.click('#fit-run [data-r="send"]');
  }
  await page.waitForFunction(()=>Object.values(Clips).flat().length===2);
  await page.evaluate(()=>runFeedback('fit'));
  await page.waitForSelector('#self-dlg:not([hidden])');
  for(const [id,n] of [['struktur',5],['substanz',4],['motivation',4],['wirkung',4]])await page.click(`[data-sv="${id}:${n}"]`);
  await page.click('[data-sf="go"]');
  await page.waitForFunction(()=>!document.getElementById('fit-result').hidden,null,{timeout:10000});
  const rec=await page.evaluate(()=>Store.list[0]);
  assert.equal(rec.kind,'fit');
  assert.equal(rec.meta.video,true);
  assert.ok(rec.speech&&rec.speech.wpm>0,'speech analysis recorded');
  assert.ok(rec.body&&rec.body.n>0,'body language sampled on the device');
  assert.equal(await page.locator('#fit-result .clips video').count(),2);
  assert.equal(await page.evaluate(()=>!Cam.stream),true,'camera is switched off after the session');
  assert.deepEqual(rec.self,{struktur:5,substanz:4,motivation:4,wirkung:4},'self-assessment is stored');
  assert.match(await page.locator('#fit-result .self-cmp').innerText(),/0,8 Punkte besser/);
  assert.equal(await page.locator('#fit-result .selfv').count(),4);
  assert.deepEqual(errors,[]);
  await ctx.close();
});

test('body language maths: a frontal face counts as eye contact',async()=>{
  const {page,ctx}=await open();
  const out=await page.evaluate(()=>{
    const pt=(x,y)=>({x,y,z:0});const f=[];f[1]=pt(.5,.5);f[234]=pt(.4,.5);f[454]=pt(.6,.5);f[10]=pt(.5,.3);f[152]=pt(.5,.72);
    Body.lm={detectForVideo:()=>({faceLandmarks:[f],faceBlendshapes:[{categories:[{categoryName:'eyeLookOutLeft',score:.1}]}]})};
    const acc={n:0,face:0,eye:0,cx:[],cy:[],size:[],light:[]};Body.acc=acc;
    const v={readyState:4};for(let i=0;i<10;i++)Body.sample(v,acc);
    return Body.stop();
  });
  assert.equal(out.face,100);
  assert.equal(out.eye,100);
  assert.equal(out.size,42);
  await ctx.close();
});
