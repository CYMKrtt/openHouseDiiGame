import 'server-only';
import { createHash, createHmac, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt=promisify(scryptCallback);
export const token=()=>randomBytes(32).toString('base64url');
export const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
type HostAction = 'start' | 'next-round';
export function hostConfirmation(hostHash:string, action:HostAction, roundId:string){
 const issued=Math.floor(Date.now()/1000);
 const secret=process.env.HOST_PASSWORD_SCRYPT;if(!secret)throw new Error('M3_HOST_NOT_CONFIGURED');
 return `${issued}.${createHmac('sha256',secret).update(`m5:${action}:${roundId}:${hostHash}:${issued}`).digest('base64url')}`;
}
export function validHostConfirmation(hostHash:string,action:HostAction,roundId:string,value:unknown){
 if(typeof value!=='string'||!/^\d{10}\.[A-Za-z0-9_-]{43}$/.test(value))return false;
 const [time,signature]=value.split('.');const issued=Number(time),now=Math.floor(Date.now()/1000);
 if(issued>now+5||issued<now-120)return false;
 const secret=process.env.HOST_PASSWORD_SCRYPT;if(!secret)return false;
 const expected=createHmac('sha256',secret).update(`m5:${action}:${roundId}:${hostHash}:${issued}`).digest();
 const supplied=Buffer.from(signature,'base64url');return supplied.length===expected.length&&timingSafeEqual(supplied,expected);
}
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
