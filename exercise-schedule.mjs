import {profileFrom} from './questionnaire.mjs';
import {catalogDisplay} from './catalog-display.mjs';

export const EXERCISE_MINUTES=3;
export function clockLabel(minutes){
 const hour=Math.floor(minutes/60)%24;
 return `${hour%12||12}:${String(minutes%60).padStart(2,'0')} ${hour>=12?'PM':'AM'}`;
}
function startMinutes(value){
 const match=/^(\d{1,2}) (AM|PM)$/.exec(value||'');
 if(!match)return null;
 const hour=Number(match[1]);
 if(hour<1||hour>12)return null;
 const h=hour%12+(match[2]==='PM'?12:0);
 return h>=5&&h<=21?h*60:null;
}

// Recompute from saved answers and age-filtered matches, including after edits.
// These are review-only time estimates, never treatment dosage or approval.
export function exerciseSchedule(profile,suggestions,paused=false){
 const {selected}=catalogDisplay(profile,suggestions,paused);
 const candidates=[...new Map(selected.map(item=>[item.record.id,item])).values()];
 let cursor=0;
 return profileFrom(profile?.answers||{}).schedule.map(day=>{
  const start=startMinutes(day.time),valid=start!==null&&[5,10,15,20].includes(day.durationMinutes);
  const capacity=valid?Math.floor(day.durationMinutes/EXERCISE_MINUTES):0;
  const count=Math.min(capacity,candidates.length);
  const activities=Array.from({length:count},(_,index)=>({
   ...candidates[(cursor+index)%candidates.length],
   start:clockLabel(start+index*EXERCISE_MINUTES),
   end:clockLabel(start+(index+1)*EXERCISE_MINUTES),
   estimatedMinutes:EXERCISE_MINUTES,canPractice:false,
  }));
  cursor+=count;
  return {...day,status:!valid?'missing_information':paused?'paused':!count?'awaiting_matches':'draft',
   start:valid?clockLabel(start):null,end:valid?clockLabel(start+day.durationMinutes):null,
   capacity,activities,unusedMinutes:valid?day.durationMinutes-count*EXERCISE_MINUTES:null};
 });
}
