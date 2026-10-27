// Apply an explicitly saved check-in, including corrections to an earlier concern.
export function profileAfterCheckin(profile,{concerns,discomfort}){
 const allowed=['None reported','New or worsening symptoms','Possible emergency symptoms','I’m not sure'];
 if(!allowed.includes(concerns))throw new Error('Choose a symptom answer before saving.');
 const effective=discomfort==='More than usual'&&concerns==='None reported'?'New or worsening symptoms':concerns;
 return {...profile,followups:{...profile.followups,concerns:effective}};
}
