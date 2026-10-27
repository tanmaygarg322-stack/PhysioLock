import test from 'node:test';
import assert from 'node:assert/strict';
import {appointmentDetails,dateKey,monthCells,WEEKDAYS} from './calendar-model.mjs';
test('calendar preserves local dates, weekday alignment, leap years and year rollover',()=>{
 for(const [y,m,count] of [[2024,1,29],[2025,1,28],[2026,9,31],[2026,12,31]]){
  const cells=monthCells(y,m),dates=cells.filter(Boolean);
  assert.equal(dates.length,count);assert.equal(cells.length%7,0);
  for(let i=0;i<cells.length;i++)if(cells[i])assert.equal(cells[i].getDay(),i%7);
  assert.equal(dates[0].getDate(),1);
 }
 assert.equal(dateKey(new Date(2026,12,1)),'2027-01-01');
 assert.equal(WEEKDAYS[new Date(2026,9,26).getDay()],'Monday');
});
test('appointment accepts hour or hour:minute and distinguishes noon and midnight',()=>{
 assert.deepEqual(appointmentDetails('2026-10-26','9','AM',' Dr. Lee '),{date:'2026-10-26',time:'9:00 AM',minutes:540,physician:'Dr. Lee'});
 assert.equal(appointmentDetails('2026-10-26','12:30','AM','Lee').minutes,30);
 assert.equal(appointmentDetails('2026-10-26','12','PM','Lee').minutes,720);
 assert.equal(appointmentDetails('2026-10-26','9:45','PM','Lee').minutes,1305);
});
test('invalid appointment time and missing physician are rejected',()=>{
 for(const time of ['','0','13','9:60','-1','9:3','text'])assert.throws(()=>appointmentDetails('2026-10-26',time,'AM','Lee'));
 assert.throws(()=>appointmentDetails('2026-10-26','9','XX','Lee'));
 assert.throws(()=>appointmentDetails('2026-10-26','9','PM','  '));
});
