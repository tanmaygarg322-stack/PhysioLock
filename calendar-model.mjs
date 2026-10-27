export const WEEKDAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
export const dateKey=date=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function monthCells(year,month){
 const offset=new Date(year,month,1).getDay(),count=new Date(year,month+1,0).getDate();
 return Array.from({length:Math.ceil((offset+count)/7)*7},(_,i)=>i<offset||i>=offset+count?null:new Date(year,month,i-offset+1));
}
export function appointmentDetails(date,time,period,physician){
 const match=/^(\d{1,2})(?::(\d{2}))?$/.exec(time.trim());
 if(!match||Number(match[1])<1||Number(match[1])>12||Number(match[2]||0)>59||!['AM','PM'].includes(period))throw new Error('Enter a time from 1 to 12, such as 9 or 9:30, and choose AM or PM.');
 if(!physician.trim())throw new Error('Enter the physician’s name.');
 return {date,time:`${Number(match[1])}:${match[2]||'00'} ${period}`,minutes:(Number(match[1])%12+(period==='PM'?12:0))*60+Number(match[2]||0),physician:physician.trim()};
}
