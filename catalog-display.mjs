import {catalogEntriesForReportedAge,reportedAgeContext,catalogPool} from './catalog-policy.mjs';

// Filter the actual browse list and cached selections, not just the server's AI pool.
export function catalogDisplay(profile,suggestions,paused=false){
 const ageContext=reportedAgeContext(profile),records=catalogEntriesForReportedAge(profile);
 const savedAge=reportedAgeContext({answers:{age:suggestions?.ageGroup}}).ageGroup;
 const sameAge=ageContext.status==='recorded'&&savedAge===ageContext.ageGroup&&(ageContext.ageGroup!=='Under 13'||suggestions?.ageContext?.developmentStage===ageContext.developmentStage);
 const selected=paused||!sameAge?[]:(suggestions?.items||[]).map(item=>({record:records.find(r=>r.id===item.id),matchNote:item.matchNote})).filter(item=>item.record);
 return {ageContext,records,selected,stale:!!suggestions&&!sameAge,regions:[...new Set(records.map(r=>r.region))]};
}

export function exerciseEmptyState(profile,suggestions,{busy=false,ready=true,error='',paused=false}={}){
 if(!ready||busy)return 'Loading exercises…';
 if(error)return error;
 const pool=catalogPool(profile);
 if(paused||pool.status==='paused')return 'Exercises are paused. Review the message above.';
 if(pool.status==='needs_information')return pool.questions.length?'Complete the required details in Profile → Edit options → Therapy details and symptoms to load exercises.':'Review home-practice clearance and supervision with your care team before exercises can be selected.';
 if(pool.status==='not_applicable')return 'No movement exercises are available for this therapy type.';
 if(pool.status==='no_match')return 'No exercises in the library match this body region. Review your selected region or ask your clinician.';
 const view=catalogDisplay(profile,suggestions,paused);
 if(view.stale)return 'Your information changed. Tap Get exercises to refresh your selection.';
 if(!suggestions)return 'Exercises have not loaded. Tap Get exercises below.';
 if(!view.selected.length)return 'No suitable exercises were selected. Retry with Get exercises or review your details with your clinician.';
 return '';
}
