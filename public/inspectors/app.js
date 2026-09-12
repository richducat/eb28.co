import {CHECKS,assess,makeBrief,emailLink} from './logic.js';
let assessment=null, brief=null;
const $=id=>document.getElementById(id);
function download(name,text){
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function showAssessment(answers){
  assessment=assess(answers);
  $('check-title').textContent=assessment.title;
  $('check-actions').replaceChildren(...assessment.actions.map(action=>{const li=document.createElement('li');li.textContent=action;return li;}));
  $('check-result').hidden=false;$('check-result').focus();
  return assessment;
}
$('check-form').addEventListener('submit',event=>{
  event.preventDefault();
  const answers=Object.fromEntries(CHECKS.map(({id})=>[id,event.currentTarget.elements.namedItem(id).checked]));
  showAssessment(answers);
});
$('download-check').addEventListener('click',()=>{
  if(assessment) download('inspection-booking-checklist.txt',`EB28 booking-path self-check\n${assessment.title}\n\n${assessment.actions.map(a=>`- ${a}`).join('\n')}\n\nBased on your answers, not a scan. https://eb28.co/`);
});
$('brief-form').addEventListener('submit',event=>{
  event.preventDefault();$('brief-error').textContent='';
  try{
    brief=makeBrief(Object.fromEntries(new FormData(event.currentTarget)),assessment);
    $('brief-text').textContent=brief.text;$('email-brief').href=emailLink(brief);
    $('brief-form').hidden=true;$('brief-result').hidden=false;$('brief-result').focus();
    $('brief-status').textContent='This brief has not been sent. The email button opens your email app for review and sending.';
  }catch(error){$('brief-error').textContent=error.message;}
});
$('edit-brief').addEventListener('click',()=>{$('brief-form').hidden=false;$('brief-result').hidden=true;$('business').focus();});
$('copy-brief').addEventListener('click',async()=>{
  if(!brief) return;
  try{await navigator.clipboard.writeText(brief.text);$('brief-status').textContent='Copied to your clipboard. Nothing has been sent.';}
  catch{$('brief-status').textContent='Clipboard access was unavailable. Use Download brief, or select and copy the text above.';}
});
$('download-brief').addEventListener('click',()=>{if(brief)download('eb28-inspector-project-brief.txt',brief.text);});
// Forms stay disabled if scripts fail; no accidental query-string submission.
document.querySelectorAll('[data-script-controls]').forEach(element=>{element.disabled=false;});

const context=document.modelContext;
if(context?.registerTool){
  const lifecycle=new AbortController();
  window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  try{
    Promise.resolve(context.registerTool({
      name:'assess_inspector_booking_path',
      title:'Check the inspector booking path',
      description:'Show a local self-assessment from five user-reported website capabilities. Does not scan a website, submit a lead, send email, or take payment.',
      inputSchema:{type:'object',properties:Object.fromEntries(CHECKS.map(c=>[c.id,{type:'boolean'}])),required:CHECKS.map(c=>c.id),additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input){
        if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).length!==CHECKS.length || CHECKS.some(c=>typeof input[c.id]!=='boolean')) throw new Error('Provide exactly the five boolean answers: service, proof, mobile, routing, measurement.');
        for(const c of CHECKS) $('check-form').elements.namedItem(c.id).checked=input[c.id];
        return showAssessment(input);
      },
    },{signal:lifecycle.signal})).catch(()=>{});
  }catch{/* The normal form works without browser tool support. */}
}
