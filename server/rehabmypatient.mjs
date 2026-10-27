// Read-only, server-owned patient mapping. Never accept provider IDs from the client or model.
const BASE='https://www.rehabmypatient.com/apiV2';
const id=value=>typeof value==='string'&&/^[1-9]\d{0,17}$/.test(value);
export function createRehabMyPatient({env=process.env,fetcher=fetch}={}){
 async function get(path,signal){
  const res=await fetcher(BASE+path,{method:'GET',headers:{'RMP-API-KEY':env.RMP_API_KEY,Accept:'application/json','User-Agent':'PhysioLock'},redirect:'error',signal});
  if(!res.ok)throw new Error('Provider unavailable');
  const text=await res.text();if(text.length>250000)throw new Error('Provider response too large');
  return JSON.parse(text);
 }
 return {async context(user){
  if(!env.RMP_API_KEY)return {status:'not_configured',plans:[]};
  let mapping;
  try{mapping=JSON.parse(env.RMP_PATIENT_LINKS||'{}');}catch{return {status:'configuration_error',plans:[]};}
  if(!mapping||Array.isArray(mapping)||typeof mapping!=='object'||!user?.sub)return {status:'configuration_error',plans:[]};
  const link=Object.hasOwn(mapping,user.sub)?mapping[user.sub]:null;
  if(!link||!id(link.patientId)||(user.demo&&link.synthetic!==true))return {status:'not_linked',plans:[]};
  try{
   const signal=AbortSignal.timeout(5000);
   const listing=await get('/patientPlans/'+link.patientId,signal);
   if(!Array.isArray(listing.plans)||listing.plans.length>100)throw new Error('Invalid plans');
   // A bounded first page; never follow provider-supplied URLs or cross-patient records.
   const eligible=listing.plans.filter(p=>id(String(p.id))&&String(p.patient_id)===link.patientId);
   const selected=link.planId?eligible.filter(p=>String(p.id)===link.planId):eligible;
   const plans=[];
   for(const entry of selected.slice(0,3)){
    const result=await get('/patientPlan/'+String(entry.id),signal);
    if(String(result.plan?.patient_id)!==link.patientId||String(result.plan?.id)!==String(entry.id)||!Array.isArray(result.exercises)||result.exercises.length>60)throw new Error('Plan mismatch');
    const exercises=result.exercises.map((exercise,index)=>{
     if(typeof exercise.name!=='string'||!exercise.name.trim()||exercise.name.length>300||typeof exercise.desc!=='string'||exercise.desc.length>6000)throw new Error('Invalid activity');
     return {reference:`plan:${entry.id}:item:${index+1}`,name:exercise.name,instructions:exercise.desc};
    });
    plans.push({source:'Rehab My Patient',reference:'plan:'+entry.id,exercises,approvalStatus:'Imported assigned plan · Home-practice approval not verified',mediaStatus:'No demonstration media supplied by this integration'});
   }
   return {status:'connected',plans,limited:selected.length>3||!!listing.links?.next||!!listing.pagination?.next};
  }catch{return {status:'unavailable',plans:[]};}
 }};
}
// No names, contacts, DOB, practitioner details, plan notes, credentials or client IDs enter the model context.
export function rehabModelContext(context){return {status:context.status,plans:context.plans.map(p=>({source:p.source,reference:p.reference,approvalStatus:p.approvalStatus,exercises:p.exercises}))};}
