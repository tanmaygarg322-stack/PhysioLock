// User-requested one-time reset. Keep service pairing and credentials intact.
const RESET_MARKER='physiolock.answers-reset.20261026-rmp';
export async function resetDemoAnswers({getItem,setItem,deleteItem,deleteRecord}){
 if(await getItem(RESET_MARKER))return false;
 for(const key of ['physiolock.profile','physiolock.plan','physiolock.progress'])await deleteRecord(key);
 await deleteItem('physiolock-onboarding-v2');
 await setItem(RESET_MARKER,'done');
 return true;
}
