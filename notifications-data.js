import {readPrivate} from './secure-storage';
import {notificationItems} from './notifications-model.mjs';
export async function loadNotifications(profile){
 const [appointments,progress,savedPlan,read]=await Promise.all([readPrivate('physiolock.appointments'),readPrivate('physiolock.progress'),readPrivate('physiolock.plan'),readPrivate('physiolock.notifications.read')]);
 return {items:notificationItems(profile,{appointments:Array.isArray(appointments)?appointments:[],progress:Array.isArray(progress)?progress:[],savedPlan}),read:Array.isArray(read)?read:[]};
}
