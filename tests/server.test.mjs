// The own-server mode: server/server.mjs started with MOCK_AI=1 (canned answers, no API key,
// no costs). Checks the access code, rate limits, what is served and what stays private.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const SERVER=fileURLToPath(new URL('../server/',import.meta.url));
const PORT=8800+Math.floor(Math.random()*150),U=`http://127.0.0.1:${PORT}`;
const CODE={'x-access-code':'test-code'},ADMIN={...CODE,'x-admin-token':'test-admin'};
let proc,data;

before(async()=>{
  data=mkdtempSync(join(tmpdir(),'callback-'));
  proc=spawn(process.execPath,['server.mjs'],{cwd:SERVER,stdio:'ignore',env:{...process.env,MOCK_AI:'1',PORT:String(PORT),ACCESS_CODE:'test-code',ADMIN_TOKEN:'test-admin',PER_IP_HOURLY:'5',DATA_DIR:data,NO_PROXY:'127.0.0.1'}});
  for(let i=0;i<50;i++){try{if((await fetch(U+'/api/health')).ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}
  throw new Error('server did not start');
});
after(()=>{proc?.kill();rmSync(data,{recursive:true,force:true});});

const get=(p,headers={})=>fetch(U+p,{headers});
const post=(p,body,headers={})=>fetch(U+p,{method:'POST',headers,body:typeof body==='string'?body:JSON.stringify(body)});

test('serves the app but never the server code or configuration',async()=>{
  assert.equal((await get('/')).status,200);
  assert.equal((await get('/content/areas.js')).status,200);
  assert.equal((await get('/vendor/mediapipe/wasm/vision_wasm_internal.wasm')).headers.get('content-type'),'application/wasm');
  for(const p of ['/server/server.mjs','/server/.env.example','/package.json','/tests/server.test.mjs','/content/..%2f..%2fserver%2fserver.mjs'])
    assert.equal((await get(p)).status,404,p);
});

test('health tells the app a server and an access code are there',async()=>{
  assert.deepEqual(await (await get('/api/health')).json(),{ok:true,code:true,mock:true});
});

test('AI requests need the access code',async()=>{
  assert.equal((await post('/api/sample',{input:'Hallo'})).status,401);
  assert.equal((await post('/api/sample',{input:'Hallo'},{'x-access-code':'wrong'})).status,401);
  const r=await post('/api/sample',{input:'Hallo',modelTier:'quick'},CODE);
  assert.equal(r.status,200);
  assert.match(await r.text(),/MOCK_AI/);
});

test('rejects malformed input and oversized bodies',async()=>{
  assert.equal((await post('/api/sample',{input:[{role:'assistant',content:'x'}]},CODE)).status,400);
  assert.equal((await post('/api/sample','{not json',CODE)).status,400);
  assert.equal((await post('/api/sample',{input:'x'.repeat(500000)},CODE)).status,413);
});

test('usage documents: anyone with the code writes their own, only the admin lists them',async()=>{
  const doc={first:'2026-10-23',days:['2026-10-23'],n:{fit:1},fb:[{r:5,t:'gut'}]};
  assert.equal((await fetch(U+'/api/usage/u123456',{method:'PUT',headers:CODE,body:JSON.stringify(doc)})).status,200);
  assert.deepEqual((await (await get('/api/usage/u123456',CODE)).json()).data,doc);
  assert.equal((await get('/api/usage/..%2fx',CODE)).status,400);
  assert.equal((await get('/api/usage',CODE)).status,403);
  assert.equal((await (await get('/api/usage',ADMIN)).json()).docs.length,1);
  assert.equal((await get('/api/admin/check',{'x-admin-token':'test-admin'})).status,200);
  assert.equal((await get('/api/admin/check',{'x-admin-token':'nope'})).status,403);
});

test('limits AI requests per IP',async()=>{
  // PER_IP_HOURLY is 5; earlier tests already used some, so the sixth request at the latest is refused.
  const codes=[];for(let i=0;i<7;i++)codes.push((await post('/api/sample',{input:'Hallo'},{...CODE,'x-forwarded-for':'10.9.9.9'})).status);
  assert.ok(codes.includes(429),codes.join(','));
});

test('routes each task to its model and logs the cost per task',async()=>{
  for(const task of ['turn','feedback','cv_profile'])assert.equal((await post('/api/sample',{input:'Hallo',task},{...CODE,'x-forwarded-for':'10.0.0.'+task.length})).status,200);
  await new Promise(r=>setTimeout(r,200));
  assert.equal((await get('/api/costs',CODE)).status,403);
  const j=await (await get('/api/costs',ADMIN)).json();
  const rows=Object.values(j.months)[0];
  const model=t=>rows.find(r=>r.task===t)?.model;
  assert.equal(model('turn'),'claude-sonnet-5-5');
  assert.equal(model('feedback'),'claude-opus-5-5');
  assert.equal(model('cv_profile'),'claude-haiku-5-5');
  assert.ok(rows.every(r=>r.usd>0&&r.n>=1));
  assert.equal(j.routes.feedback,'claude-opus-5-5');
});
