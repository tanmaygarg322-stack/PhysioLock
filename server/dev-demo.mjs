import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {networkInterfaces} from 'node:os';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHandler} from './index.mjs';
import {createDemoSessions} from './demo-session.mjs';
import {privateAddress} from './demo-session.mjs';
process.loadEnvFile(new URL('.env',import.meta.url));
try{process.loadEnvFile(new URL('.env.rehabmypatient',import.meta.url));}catch(error){if(error.code!=='ENOENT')throw error;}
if(!process.env.GEMINI_API_KEY||!process.env.GEMINI_MODEL)throw new Error('Gemini server settings are incomplete.');
const addresses=Object.values(networkInterfaces()).flat().filter(x=>x?.family==='IPv4'&&!x.internal&&privateAddress(x.address));const host=addresses.find(x=>x.address.startsWith('192.168.'))?.address||addresses[0]?.address;if(!host)throw new Error('Connect to your local Wi-Fi and restart.');
const code=randomBytes(12).toString('base64url'),port=8787,serverUrl=`http://${host}:${port}`;const demo=createDemoSessions(code);const server=http.createServer(createHandler({demo}));server.requestTimeout=35000;server.headersTimeout=10000;
server.listen(port,'0.0.0.0',async()=>{await mkdir('.expo',{recursive:true});await writeFile('.expo/physiolock-demo.json',JSON.stringify({serverUrl,code,expoUrl:`exp://${host}:8081/--/connect?server=${encodeURIComponent(serverUrl)}&code=${encodeURIComponent(code)}`}));console.log(`Fictional-data Gemini demo ready at ${serverUrl}. Pairing QR metadata saved locally; API key not displayed.`);});
