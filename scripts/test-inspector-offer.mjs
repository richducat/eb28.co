import test from 'node:test';
import assert from 'node:assert/strict';
import {CHECKS,assess,normalizeWebsite,makeBrief,emailLink} from '../public/inspectors/logic.js';
const values={business:'Example Inspector',area:'Brevard County',website:'example.com',need:'rebuild',note:''};
test('self-check names each missing customer step and never invents revenue',()=>{
  const r=assess({service:true,mobile:true});assert.equal(r.complete,2);assert.equal(r.actions.length,3);assert.match(r.title,/3 gaps/);
  assert.ok(r.actions.some(a=>a.includes('inbox')));assert.ok(!JSON.stringify(r).includes('$'));
});
test('completed self-check suggests verification rather than a needless rebuild',()=>{
  const r=assess(Object.fromEntries(CHECKS.map(c=>[c.id,true])));assert.equal(r.complete,5);assert.match(r.title,/covered/);assert.match(r.actions[0],/real-world check/);
});
test('website permits ordinary domain input and rejects dangerous or credential URLs',()=>{
  assert.equal(normalizeWebsite('example.com'),'https://example.com/');assert.equal(normalizeWebsite(''),'');
  for(const url of ['javascript:alert(1)','data:text/html,example.com','https://name:secret@example.com','not a website','https://localhost']) assert.throws(()=>normalizeWebsite(url));
});
test('brief requires real business context and preserves explicit pricing boundaries',()=>{
  assert.throws(()=>makeBrief({...values,business:'  '}));assert.throws(()=>makeBrief({...values,area:'\n'}));
  const b=makeBrief(values);assert.match(b.text,/\$800 one-time/);assert.match(b.text,/Not completed/);assert.match(b.text,/Hosting, domain, paid tools, ongoing support/);assert.match(b.text,/not an order or payment/);
});
test('email has fixed recipient and safely roundtrips special input',()=>{
  const b=makeBrief({...values,business:'A&B #1',note:'<img src=x onerror=alert(1)> & CEO?'});
  const u=new URL(emailLink(b));assert.equal(u.pathname,'social@eb28.co');assert.equal(u.searchParams.get('subject'),b.subject);assert.equal(u.searchParams.get('body'),b.text);assert.equal(u.searchParams.get('bcc'),null);
});
test('input lengths and control characters cannot expand the generated email unboundedly',()=>{
  const b=makeBrief({...values,business:'x'.repeat(10000),note:'n'.repeat(10000)});assert.ok(b.text.length<2200);assert.ok(!b.subject.includes('\n'));
});
