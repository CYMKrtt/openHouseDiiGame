import pg from 'pg';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { createClient } from '@supabase/supabase-js';
import { isMatchingProject } from './m3-target.mjs';
nextEnv.loadEnvConfig(process.cwd());
const p=process.env;
let sql,realtime,channel;
let stage='configuration';
try{
 if(p.M3_TEST_DISPOSABLE_DATABASE!=='yes'||!isMatchingProject(p.SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_URL,p.M3_TEST_DATABASE_URL))throw new Error('target');
 sql=new pg.Client({connectionString:p.M3_TEST_DATABASE_URL,connectionTimeoutMillis:10000});await sql.connect();
 realtime=createClient(p.NEXT_PUBLIC_SUPABASE_URL,p.NEXT_PUBLIC_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 stage='Realtime subscription';
 let receive;
 const event=new Promise(resolve=>receive=resolve);
 channel=realtime.channel('m3-probe-'+randomUUID()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'m3_revision_notice'},payload=>receive(payload));
 await Promise.race([new Promise((resolve,reject)=>channel.subscribe(status=>{if(status==='SUBSCRIBED')resolve();else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('subscription'))})),new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),15000))]);
 stage='Realtime notification';
 await sql.query('select public.m3_bump_revision()');
 const payload=await Promise.race([event,new Promise((_,reject)=>setTimeout(()=>reject(new Error('timeout')),15000))]);
 if(Object.keys(payload.new).sort().join(',')!=='revision,singleton')throw new Error('payload');
 console.log('Realtime subscription and revision notification passed.');
}catch{console.error(`Realtime probe failed during ${stage}; private details withheld.`);process.exitCode=1}
finally{if(channel&&realtime)await Promise.race([realtime.removeChannel(channel),new Promise(resolve=>setTimeout(resolve,1000))]).catch(()=>{});realtime?.realtime.disconnect();if(sql)await sql.end().catch(()=>{})}
process.exit(process.exitCode||0);
