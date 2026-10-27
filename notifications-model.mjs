import {dateKey,WEEKDAYS} from './calendar-model.mjs';
import {localDate,latestDays,weekDates,entryDate} from './progress-model.mjs';
import {profileFrom} from './questionnaire.mjs';
import {safetyState} from './plan-engine.mjs';
import {catalogPool} from './catalog-policy.mjs';
import {restorePlan} from './plan-cache.mjs';
export function notificationItems(profile,{appointments=[],progress=[],savedPlan=null}={},now=new Date()){
 const items=[],today=dateKey(now),plan=restorePlan(profile,savedPlan),safety=safetyState(profile);
 for(const visit of appointments){const date=localDate(visit.date);if(!date||!Number.isInteger(visit.minutes)||visit.minutes<0||visit.minutes>=1440)continue;date.setHours(Math.floor(visit.minutes/60),visit.minutes%60,0,0);if(date<now)continue;
  items.push({id:`appointment-${visit.id}-${visit.date}-${visit.minutes}-${visit.physician}`,category:'Appointments',title:`Appointment with ${visit.physician}`,at:date.toISOString(),text:'Added to your calendar. Bring your questions and any instructions you want to discuss.',target:'Calendar',action:'View calendar',priority:1});
 }
 const schedule=profileFrom(profile.answers||{}).schedule;
 if(!safety.paused){for(let offset=0;offset<7;offset++){const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+offset,12),day=schedule.find(d=>d.day===WEEKDAYS[date.getDay()]);if(!day)continue;const match=/^(\d{1,2}) (AM|PM)$/.exec(day.time);if(!match||Number(match[1])<1||Number(match[1])>12)continue;date.setHours(Number(match[1])%12+(match[2]==='PM'?12:0),0,0,0);if(date<now)continue;
  items.push({id:`exercise-${dateKey(date)}-${day.time}-${day.durationMinutes}`,category:'Exercises',title:'Your exercise time',at:date.toISOString(),text:`${day.durationMinutes||'Your preferred'} minutes set aside. ${plan.catalogSuggestions?.items?.length?'Your exercise draft is available for clinician review.':'Open Exercises to review your plan.'}`,target:'Exercises',action:'View exercises',priority:2});
 }}else items.push({id:`safety-${profile.followups?.concerns}-${profile.answers?.currentDiscomfort}`,category:'Updates',title:'Review your symptom report',text:safety.message,target:'Exercises',action:'Review report',priority:0});
 const todaySession=schedule.find(d=>d.day===WEEKDAYS[now.getDay()]);
 if(todaySession&&!latestDays(progress).has(today))items.push({id:`checkin-${today}`,category:'Updates',title:'How are you feeling today?',text:'You can log completion, difficulty, discomfort, or a rest day. Check-ins are optional.',target:'Progress',action:'Open progress',priority:3});
 if(catalogPool(profile).status==='needs_information')items.push({id:'profile-needed',category:'Updates',title:'Finish your exercise profile',text:'Some details are needed before exercises can be selected.',target:'Exercises',action:'Review details',priority:3});
 if(plan.catalogSuggestions?.items?.length&&!safety.paused)items.push({id:`review-${plan.catalogSuggestions.items.map(x=>x.id).join('-')}`,category:'Updates',title:'Exercises ready for review',text:'Review the exercise names, images, and descriptions with your clinician before guided practice.',target:'Exercises',action:'View exercises',priority:3});
 const week=weekDates(now);if(progress.some(e=>week.includes(entryDate(e))))items.push({id:`weekly-${week[0]}`,category:'Updates',title:'Your weekly progress',text:'See your session history and reflect on your everyday goals. Rest days do not break a streak.',target:'Progress',action:'View progress',priority:4});
 return items.sort((a,b)=>a.priority-b.priority||(a.at||'').localeCompare(b.at||''));
}
