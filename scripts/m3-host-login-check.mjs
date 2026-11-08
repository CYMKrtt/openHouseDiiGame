import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomBytes } from 'node:crypto';
import nextEnv from '@next/env';
import { createHostHash } from './private-config-utils.mjs';
nextEnv.loadEnvConfig(process.cwd());
const require=createRequire(import.meta.url),origin='http://127.0.0.1:3102';
const password=randomBytes(24).toString('base64url');
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'dev','--hostname','127.0.0.1','--port','3102'],{
 env:{...process.env,APP_ORIGIN:origin,NEXT_PUBLIC_SESSION_MODE:'server',HOST_PASSWORD_SCRYPT:createHostHash(password),M3_TEST_DIST_DIR:'.next-host-check'},
 stdio:'ignore',windowsHide:true,
});
let stage='starting the isolated test server';
try{
 let ready=false;
 for(let i=0;i<50;i++){
  if(child.exitCode!==null)throw new Error('server exited');
  try{const response=await fetch(origin+'/api/v1/session',{signal:AbortSignal.timeout(1500)});if(response.status===200){ready=true;break}}catch{}
  await new Promise(resolve=>setTimeout(resolve,500));
 }
 if(!ready)throw new Error('server unavailable');
 stage='positive Host authentication';
 const login=await fetch(origin+'/api/v1/host/login',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify({password})});
 if(login.status!==200)throw new Error('login failed');
 const cookie=login.headers.get('set-cookie');
 if(!cookie?.startsWith('lw_host=')||!cookie.includes('HttpOnly')||!cookie.includes('SameSite=strict'))throw new Error('cookie flags');
 const session=await fetch(origin+'/api/v1/host/session',{headers:{cookie:cookie.split(';')[0]}});
 if(session.status!==200)throw new Error('host session');
 const data=await session.json();if(data.reservedCount!==15||!Array.isArray(data.players)||data.players.length!==15)throw new Error('host roster');
 stage='Host logout and revocation';
 const logout=await fetch(origin+'/api/v1/host/logout',{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookie.split(';')[0]},body:'{}'});
 if(logout.status!==200)throw new Error('logout');
 const revoked=await fetch(origin+'/api/v1/host/session',{headers:{cookie:cookie.split(';')[0]}});
 if(revoked.status!==401)throw new Error('revocation');
 console.log('Positive Host login, protected roster, cookie flags, logout and revocation passed.');
}catch{console.error(`Host login check failed during ${stage}; private details withheld.`);process.exitCode=1}
finally{child.kill('SIGTERM')}
process.exit(process.exitCode||0);
