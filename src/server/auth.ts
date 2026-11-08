import 'server-only';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export const token=()=>randomBytes(32).toString('base64url');
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
export function isToken(value:string|undefined): value is string {return !!value && /^[A-Za-z0-9_-]{43}$/.test(value);}
export async function verifyPassword(password:string) {
 const encoded=process.env.HOST_PASSWORD_SCRYPT;
 if(!encoded) throw new Error('M3_HOST_NOT_CONFIGURED');
 const [scheme,salt,digest,...rest]=encoded.split(':');
 if(scheme!=='scrypt'||!salt||!digest||rest.length || !/^[A-Za-z0-9_-]{22}$/.test(salt) || !/^[A-Za-z0-9_-]{86}$/.test(digest)) throw new Error('M3_HOST_NOT_CONFIGURED');
 const expected=Buffer.from(digest,'base64url');
 const candidate=await scrypt(password,Buffer.from(salt,'base64url'),64) as Buffer;
 return candidate.length===expected.length && timingSafeEqual(candidate,expected);
}
