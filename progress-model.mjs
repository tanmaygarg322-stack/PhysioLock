import {dateKey,WEEKDAYS} from './calendar-model.mjs';
import {profileFrom} from './questionnaire.mjs';
export const COMPLETION=['Completed','Partly completed','Skipped'];
export function localDate(value){if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;const [y,m,d]=value.split('-').map(Number),date=new Date(y,m-1,d,12);return dateKey(date)===value?date:null;}
export function weekDates(now=new Date()){const monday=new Date(now.getFullYear(),now.getMonth(),now.getDate(),12);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);return Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(d.getDate()+i);return dateKey(d);});}
export function completion(entry){return entry.completion||({'Completed my approved routine':'Completed','Partly completed':'Partly completed','Did not practice':'Skipped'}[entry.completed]);}
export function entryDate(entry){return entry.date||(Number.isNaN(new Date(entry.at).getTime())?'':dateKey(new Date(entry.at)));}
export function latestDays(entries){const days=new Map();for(const e of [...entries].sort((a,b)=>String(b.at).localeCompare(String(a.at)))){const key=entryDate(e);if(key&&!days.has(key))days.set(key,e);}return days;}
export function progressSummary(profile,entries,now=new Date()){
 const weeks=weekDates(now),days=latestDays(entries),schedule=profileFrom(profile.answers||{}).schedule;
 const planned=weeks.filter(d=>schedule.some(s=>s.day===WEEKDAYS[localDate(d).getDay()]));
 const current=weeks.map(d=>days.get(d)).filter(Boolean),done=current.filter(e=>completion(e)==='Completed');
 const plannedDone=planned.filter(d=>completion(days.get(d)||{})==='Completed').length;
 const trend=Array.from({length:6},(_,i)=>{const d=new Date(now);d.setDate(d.getDate()-(5-i)*7);const dates=weekDates(d);return {start:dates[0],completed:dates.filter(key=>completion(days.get(key)||{})==='Completed').length};});
 const allDone=[...days.values()].filter(e=>completion(e)==='Completed').length;
 return {planned:planned.length,plannedDone,completed:done.length,minutes:current.reduce((sum,e)=>sum+(Number.isFinite(e.minutes)?e.minutes:0),0),percent:planned.length?Math.round(plannedDone/planned.length*100):0,days:weeks.map(date=>({date,planned:planned.includes(date),entry:days.get(date)})),trend,achievements:[{title:'First check-in',earned:days.size>0,detail:'Record how a session went.'},{title:'Five sessions',earned:allDone>=5,detail:'Log five completed sessions, at your own pace.'},{title:'Goal reflection',earned:entries.some(e=>Object.keys(e.goalRatings||{}).length>0),detail:'Record how an everyday goal feels.'}]};
}
export function validateCheckin(form,now=new Date()){
 const date=localDate(form.date);if(!date||form.date>dateKey(now))throw new Error('Choose today or an earlier date in YYYY-MM-DD format.');
 if(!COMPLETION.includes(form.completion))throw new Error('Choose completed, partly completed, or skipped.');
 if(form.completion!=='Skipped'&&!['Easy','Manageable','Difficult'].includes(form.difficulty))throw new Error('Choose how difficult the session felt.');
 const minutes=form.completion==='Skipped'?0:Number(form.minutes);
 if(form.completion!=='Skipped'&&(!String(form.minutes).trim()||!Number.isInteger(minutes)||minutes<1||minutes>240))throw new Error('Enter actual minutes, from 1 to 240.');
 for(const key of ['before','after'])if(form[key]!==null&&form[key]!==undefined&&(!Number.isInteger(form[key])||form[key]<0||form[key]>10))throw new Error('Discomfort must be between 0 and 10, or left unanswered.');
 if(!['None reported','New or worsening symptoms','Possible emergency symptoms','I’m not sure'].includes(form.concerns))throw new Error('Choose a symptom answer.');
 if(Object.values(form.goalRatings||{}).some(value=>!Number.isInteger(value)||value<1||value>5))throw new Error('Goal ratings must be from 1 to 5.');
 return {...form,minutes,difficulty:form.completion==='Skipped'?'Did not practice':form.difficulty,notes:(form.notes||'').trim().slice(0,300),goalRatings:form.goalRatings||{}};
}
