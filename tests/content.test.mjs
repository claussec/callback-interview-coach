// Content checks: the data in content/*.js must be internally consistent.
// Runs in plain Node, no browser. A broken reference here would surface as a blank
// setup screen or a missing recommendation in the app.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const files=['interviews','drills','examples','areas','i18n-en'];
const src=files.map(f=>readFileSync(new URL(`../content/${f}.js`,import.meta.url),'utf8')).join('\n;\n');
const C=vm.runInNewContext(src+`
;({CASE_TYPES,LEVELS,STYLES,TRACKS,FIT_ARTS,AC_TYPES,CASE_CRIT,FIT_CRIT,GEHALT_CRIT,FACH_CRIT,AC_CRIT,DOCS_CRIT,
  CRIT_DRILL,FRAMEWORKS,DRILLS,CRIT_TO_DRILL,EXAMPLE_CASE,EXAMPLE_CASE_EN,EXAMPLE_INTERVIEW,AREAS,TRACK_AREA,EN_DICT})`);

const ids=list=>list.map(x=>Array.isArray(x)?x[0]:x.id);
const unique=(list,what)=>assert.equal(new Set(list).size,list.length,`duplicate ${what}: ${list.filter((x,i)=>list.indexOf(x)!==i)}`);

test('every application goal points to interview types that exist',()=>{
  for(const [id,t] of Object.entries(C.TRACKS)){
    assert.ok(t.label&&t.desc,`${id} needs label and desc`);
    for(const sim of t.sims){
      const [kind,x]=sim.split(':');
      if(kind==='fit')assert.ok(C.FIT_ARTS[x],`${id}: unknown interview type ${x}`);
      else if(kind==='ac')assert.ok(C.AC_TYPES[x],`${id}: unknown AC exercise ${x}`);
      else assert.equal(kind,'case',`${id}: unknown simulation ${sim}`);
    }
  }
});

test('interview types and AC exercises carry instructions for the AI',()=>{
  for(const [id,a] of Object.entries(C.FIT_ARTS)){
    assert.ok(['fit','fach','gehalt'].includes(a.crit),`${id}: unknown rubric ${a.crit}`);
    assert.ok(a.rule.length>80,`${id}: rule too short to steer the interviewer`);
  }
  for(const [id,a] of Object.entries(C.AC_TYPES)){
    assert.ok(a.min>0&&a.steps.length>=2&&a.rule.length>80,`${id} is incomplete`);
  }
});

test('rubrics have unique criteria',()=>{
  for(const name of ['CASE_CRIT','FIT_CRIT','GEHALT_CRIT','FACH_CRIT','AC_CRIT','DOCS_CRIT'])unique(ids(C[name]),`${name} id`);
});

test('every weak criterion maps to a drill that exists',()=>{
  const ok=id=>id==='math'||C.DRILLS[id];
  for(const [kind,map] of Object.entries(C.CRIT_DRILL))
    for(const [crit,drill] of Object.entries(map))assert.ok(ok(drill),`CRIT_DRILL.${kind}.${crit} → ${drill} missing`);
  for(const [crit,drill] of Object.entries(C.CRIT_TO_DRILL))assert.ok(ok(drill),`CRIT_TO_DRILL.${crit} → ${drill} missing`);
});

test('fields of work are complete and keywords are lower case',()=>{
  unique(ids(C.AREAS),'area id');
  for(const a of C.AREAS){
    assert.ok(a.de&&a.en,`${a.id} needs German and English names`);
    assert.ok(a.kw.length>=3,`${a.id} needs keywords`);
    for(const k of a.kw)assert.equal(k,k.toLowerCase(),`${a.id}: keyword "${k}" must be lower case`);
  }
  for(const [track,area] of Object.entries(C.TRACK_AREA)){
    assert.ok(C.TRACKS[track],`TRACK_AREA: unknown track ${track}`);
    assert.ok(C.AREAS.some(a=>a.id===area),`TRACK_AREA: unknown area ${area}`);
  }
});

test('example interview matches in both languages and fits the rubric',()=>{
  const {de,en}=C.EXAMPLE_INTERVIEW;
  assert.equal(de.turns.length,en.turns.length);
  de.turns.forEach((t,i)=>assert.equal(t.who,en.turns[i].who,`turn ${i} speaker differs`));
  for(const ex of [de,en]){
    assert.equal(Object.keys(ex.score.kriterien).sort().join(),ids(C.FIT_CRIT).sort().join());
    for(const v of Object.values(ex.score.kriterien))assert.ok(v>=1&&v<=5);
  }
  assert.equal(C.EXAMPLE_CASE.length,C.EXAMPLE_CASE_EN.length);
});

test('English dictionary has a translation for every entry',()=>{
  const entries=Object.entries(C.EN_DICT);
  assert.ok(entries.length>500);
  for(const [de,en] of entries)assert.ok(typeof en==='string'&&en.trim(),`no translation for "${de.slice(0,60)}"`);
});
