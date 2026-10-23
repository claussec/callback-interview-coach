// Callback server: serves the static app and forwards its AI requests to the Claude API.
//
// The browser app talks to the model through one seam, aiCall()/aiJson(). Inside Claude that
// seam is the artifact runtime; on its own the app finds this server via GET /api/health and
// sends POST /api/sample instead. The API key stays here and never reaches the browser.
//
// Also provides a tiny document store for the anonymous tester statistics (the same shape the
// app writes inside Claude), readable only with the admin token.
//
// Configuration (environment, see .env.example):
//   ANTHROPIC_API_KEY   required unless MOCK_AI=1
//   CLAUDE_MODEL        default claude-opus-5-5
//   ACCESS_CODE         optional: testers must enter this code before AI features work
//   ADMIN_TOKEN         optional: unlocks the owner's usage view
//   DAILY_LIMIT         max AI requests per day across all users (default 2000)
//   PER_IP_HOURLY       max AI requests per IP and hour (default 120)
//   PORT, HOST          default 8080, 127.0.0.1 (put Caddy or another proxy in front)
//   DATA_DIR            where usage documents are stored (default ./data)
//   MOCK_AI=1           canned answers, no API calls (local testing)

import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {createReadStream, statSync} from 'node:fs';
import {join, extname, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {timingSafeEqual, createHash} from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const env = process.env;
const PORT = +(env.PORT || 8080), HOST = env.HOST || '127.0.0.1';
const MODEL = env.CLAUDE_MODEL || 'claude-opus-5-5';
const MOCK = env.MOCK_AI === '1';
const DAILY_LIMIT = +(env.DAILY_LIMIT || 2000), PER_IP_HOURLY = +(env.PER_IP_HOURLY || 120);
const DATA_DIR = resolve(env.DATA_DIR || join(ROOT, 'server', 'data'));
const MAX_BODY = 400_000;

if (!MOCK && !env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY is not set (or start with MOCK_AI=1 for a dry run).');
  process.exit(1);
}
const client = MOCK ? null : new Anthropic();

// The app asks for a tier; this server maps it to effort on one model rather than switching
// models, so prompt caching keeps working across a session.
const EFFORT = {quick: 'low', default: 'medium', complex: 'high'};

/* ---------- small helpers ---------- */
const sameSecret = (given, wanted) => {
  if (!wanted) return true;
  const a = createHash('sha256').update(String(given || '')).digest();
  const b = createHash('sha256').update(wanted).digest();
  return timingSafeEqual(a, b);
};
const clientIp = req => String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
const json = (res, status, body) => {res.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store'}); res.end(JSON.stringify(body));};
async function readJson(req) {
  let size = 0; const chunks = [];
  for await (const c of req) {size += c.length; if (size > MAX_BODY) throw Object.assign(new Error('too large'), {status: 413}); chunks.push(c);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');}
  catch {throw Object.assign(new Error('bad json'), {status: 400});}
}

/* ---------- rate limits: per IP per hour, and a global daily budget ---------- */
const hits = new Map(); let day = '', dayCount = 0;
function allow(ip) {
  const now = Date.now(), today = new Date().toISOString().slice(0, 10);
  if (today !== day) {day = today; dayCount = 0;}
  if (dayCount >= DAILY_LIMIT) return 'daily';
  const list = (hits.get(ip) || []).filter(t => now - t < 3600_000);
  if (list.length >= PER_IP_HOURLY) {hits.set(ip, list); return 'ip';}
  list.push(now); hits.set(ip, list); dayCount++;
  return null;
}
setInterval(() => {const now = Date.now(); for (const [ip, l] of hits) if (!l.some(t => now - t < 3600_000)) hits.delete(ip);}, 600_000).unref();

/* ---------- AI: same input shape as the artifact runtime's sample() ---------- */
function toMessages(input) {
  if (typeof input === 'string') return [{role: 'user', content: input}];
  if (!Array.isArray(input) || !input.length) throw Object.assign(new Error('input must be a string or a message list'), {status: 400});
  const msgs = input.map(m => ({role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content ?? '')}));
  if (msgs.at(-1).role !== 'user') throw Object.assign(new Error('the last message must be from the user'), {status: 400});
  return msgs;
}

async function sample(req, res) {
  const body = await readJson(req);
  const messages = toMessages(body.input);
  const effort = EFFORT[body.modelTier] || 'medium';
  res.writeHead(200, {'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store', 'x-accel-buffering': 'no'});

  if (MOCK) {
    const last = messages.at(-1).content;
    const text = /JSON/.test(last)
      ? JSON.stringify({gesamt: 3.5, urteil: 'knapp', zusammenfassung: 'Testantwort vom Server (MOCK_AI).',
          // every criterion id the app's rubrics use, so any scorecard can be filled
          kriterien: ['klaerung', 'struktur', 'analyse', 'rechnen', 'synthese', 'kommunikation', 'substanz', 'motivation', 'wirkung', 'vorbereitung', 'argumente', 'taktik', 'fachwissen', 'anwendung', 'luecken', 'sozial', 'loesung', 'passung', 'eindruck', 'belege', 'anschreiben', 'inhalt', 'zeit'].map((id, i) => ({id, punkte: 3 + (i % 2), kommentar: 'Testkommentar.'})),
          staerken: ['Klarer Einstieg'], verbesserungen: [{punkt: 'Mehr Zahlen'}], antworten: []})
      : 'Danke. Erzählen Sie von einem Projekt, auf das Sie stolz sind. (Testantwort vom Server, MOCK_AI)';
    for (const part of text.match(/.{1,24}/gs)) {res.write(part); await new Promise(r => setTimeout(r, 15));}
    return res.end();
  }

  const ctl = new AbortController();
  res.on('close', () => {if (!res.writableEnded) ctl.abort();});
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    output_config: {effort},
    // Prompt caching: interviews resend the whole history every turn.
    cache_control: {type: 'ephemeral'},
    // On a safety decline, rerun on Anthropic's recommended fallback model instead of failing.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    messages,
  }, {signal: ctl.signal});
  for await (const ev of stream) {
    if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') res.write(ev.delta.text);
  }
  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') res.write('\n\n[Diese Anfrage wurde abgelehnt. Formuliere sie bitte anders.]');
  res.end();
}

/* ---------- usage documents (anonymous tester statistics) ---------- */
const docPath = id => {
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(id)) throw Object.assign(new Error('bad id'), {status: 400});
  return join(DATA_DIR, 'usage', id + '.json');
};
async function usageGet(id, res) {
  try {json(res, 200, {exists: true, data: JSON.parse(await readFile(docPath(id), 'utf8'))});}
  catch (e) {if (e.status) throw e; json(res, 200, {exists: false});}
}
async function usagePut(id, req, res) {
  const data = await readJson(req);
  await mkdir(join(DATA_DIR, 'usage'), {recursive: true});
  await writeFile(docPath(id), JSON.stringify(data));
  json(res, 200, {ok: true});
}
async function usageList(res) {
  const dir = join(DATA_DIR, 'usage'); let names = [];
  try {names = (await readdir(dir)).filter(n => n.endsWith('.json')).slice(0, 2000);} catch {}
  const docs = [];
  for (const n of names) {try {docs.push(JSON.parse(await readFile(join(dir, n), 'utf8')));} catch {}}
  json(res, 200, {docs});
}

/* ---------- static files ---------- */
const TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.task': 'application/octet-stream', '.md': 'text/plain; charset=utf-8'};
const PUBLIC = ['index.html', 'content/', 'fonts/', 'vendor/', 'screenshots/', 'legal/'];
function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  if (p === '') p = 'index.html';
  const file = resolve(ROOT, p);
  if (!file.startsWith(ROOT + sep) || !PUBLIC.some(pre => p === pre || p.startsWith(pre))) {res.writeHead(404); return res.end('Not found');}
  let st; try {st = statSync(file);} catch {res.writeHead(404); return res.end('Not found');}
  if (!st.isFile()) {res.writeHead(404); return res.end('Not found');}
  res.writeHead(200, {
    'content-type': TYPES[extname(file)] || 'application/octet-stream',
    'cache-control': p === 'index.html' ? 'no-cache' : 'public, max-age=3600',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(self), microphone=(self), geolocation=()',
  });
  createReadStream(file).pipe(res);
}

/* ---------- router ---------- */
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  try {
    if (!url.pathname.startsWith('/api/')) return serveStatic(req, res);
    if (url.pathname === '/api/health') return json(res, 200, {ok: true, code: !!env.ACCESS_CODE, mock: MOCK});
    if (url.pathname === '/api/admin/check') return json(res, sameSecret(req.headers['x-admin-token'], env.ADMIN_TOKEN || '\0never') ? 200 : 403, {});

    // Everything below needs the tester access code when one is configured.
    if (!sameSecret(req.headers['x-access-code'], env.ACCESS_CODE)) return json(res, 401, {code: 'access_code'});

    if (url.pathname === '/api/sample' && req.method === 'POST') {
      const why = allow(clientIp(req));
      if (why) return json(res, 429, {code: 'rate_limited', scope: why});
      return await sample(req, res);
    }
    const m = url.pathname.match(/^\/api\/usage\/([^/]+)$/);
    if (m && req.method === 'GET') return await usageGet(m[1], res);
    if (m && req.method === 'PUT') return await usagePut(m[1], req, res);
    if (url.pathname === '/api/usage' && req.method === 'GET') {
      if (!sameSecret(req.headers['x-admin-token'], env.ADMIN_TOKEN || '\0never')) return json(res, 403, {});
      return await usageList(res);
    }
    json(res, 404, {code: 'not_found'});
  } catch (e) {
    if (res.headersSent) {res.end(); return;}
    const status = e.status && e.status < 500 ? e.status : 502;
    if (status === 502) console.error(new Date().toISOString(), e.message);
    // The rest of an oversized body is never read, so close this connection instead of reusing it.
    if (status === 413) {res.setHeader('connection', 'close'); res.on('finish', () => req.destroy());}
    json(res, status, {code: e instanceof Anthropic.RateLimitError ? 'rate_limited' : status === 502 ? 'upstream_error' : 'bad_request'});
  }
}).listen(PORT, HOST, () => console.log(`Callback on http://${HOST}:${PORT} · model ${MOCK ? 'MOCK' : MODEL}${env.ACCESS_CODE ? ' · access code on' : ''}`));
