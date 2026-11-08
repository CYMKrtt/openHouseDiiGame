import { randomBytes, scryptSync } from 'node:crypto';
import { isMatchingProject } from './m3-target.mjs';
export function buildDevelopmentConnection(template,password,apiUrl,publicUrl){
 const marker='[YOUR-PASSWORD]';const hasMarker=template.includes(marker);
 const candidate=hasMarker?template.replace(marker,'temporary-placeholder'):template;
 const uri=new URL(candidate);
 const supplied=hasMarker?password:decodeURIComponent(uri.password);
 if(!supplied||supplied==='temporary-placeholder')throw new Error('Missing password');
 uri.password=encodeURIComponent(supplied);
 const value=uri.toString();
 if(!isMatchingProject(apiUrl,publicUrl,value))throw new Error('Project or connection mode mismatch');
 return value;
}
export function createHostHash(password){
 if(password.length<12||password.length>256)throw new Error('Host password length');
 const salt=randomBytes(16),digest=scryptSync(password,salt,64);
 return `scrypt:${salt.toString('base64url')}:${digest.toString('base64url')}`;
}
