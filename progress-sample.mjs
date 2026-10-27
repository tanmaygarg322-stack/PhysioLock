import {dateKey,WEEKDAYS} from './calendar-model.mjs';
import {weekDates,localDate} from './progress-model.mjs';
import {interpretProfile} from './plan-engine.mjs';
export function sampleProgress(profile,now=new Date()){
 const end=localDate(weekDates(now)[0]);end.setDate(end.getDate()-1);
 const goals=interpretProfile(profile).goals.length?interpretProfile(profile).goals:['Walk comfortably','Climb stairs with confidence'];
 const days=profile.answers?.days?.length?profile.answers.days:['Monday','Wednesday','Friday'];
 const sampleProfile={...profile,answers:{...profile.answers,days}};
 const entries=[];let index=0;
 for(let week=5;week>=0;week--){const anchor=new Date(end);anchor.setDate(anchor.getDate()-week*7);
  for(const date of weekDates(anchor)){if(!days.includes(WEEKDAYS[localDate(date).getDay()]))continue;
   const state=index%7===1?'Skipped':index%5===2?'Partly completed':'Completed';
   entries.push({id:`sample-${date}`,date,at:localDate(date).toISOString(),completion:state,minutes:state==='Skipped'?0:[10,15,12,20,8][index%5],difficulty:state==='Skipped'?'Did not practice':['Easy','Manageable','Manageable','Difficult'][index%4],before:state==='Skipped'?null:[2,3,4,2][index%4],after:state==='Skipped'?null:[1,2,3,2][index%4],concerns:'None reported',notes:state==='Skipped'?'Sample: Took a rest day.':'Sample: Logged a session and reflected on daily activities.',goalRatings:Object.fromEntries(goals.map((goal,i)=>[goal,Math.min(5,2+Math.floor((5-week)/2)+(i%2))]))});index++;
  }
 }
 return {profile:sampleProfile,entries,goals,now:end,period:`${weekDates(end)[0]} to ${dateKey(end)}`};
}
