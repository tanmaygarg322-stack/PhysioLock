// Optional adapter for a provider-authorized normalized export, not a web scraper.
// An operator must verify the source identifiers and content rights before importing.
import {readFile} from 'node:fs/promises';
import {isAbsolute} from 'node:path';
export default {async retrieve({patientSubject,includeCandidates}){const path=process.env.LICENSED_ACTIVITY_EXPORT_PATH;if(!path||!isAbsolute(path)||!process.env.SOURCE_LICENSE_REFERENCE)throw new Error('Authorized provider export is not configured.');const raw=await readFile(path,'utf8');if(Buffer.byteLength(raw)>2000000)throw new Error('Export too large.');const file=JSON.parse(raw);if(file.licenseReference!==process.env.SOURCE_LICENSE_REFERENCE||file.authorizationConfirmed!==true||!Array.isArray(file.activities))throw new Error('Source authorization not confirmed.');return {activities:file.activities.filter(r=>r.patientSubject===patientSubject&&(includeCandidates||r.approval?.status==='approved'))};}};
