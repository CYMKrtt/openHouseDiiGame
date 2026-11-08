import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import pg from 'pg';
import nextEnv from '@next/env';
import { buildDevelopmentConnection,createHostHash } from './private-config-utils.mjs';

nextEnv.loadEnvConfig(process.cwd());
const file='.env.local';
const token=randomBytes(24).toString('base64url');
const template=process.env.M3_SESSION_POOLER_TEMPLATE;
if(!template?.includes('[YOUR-PASSWORD]') || process.env.M3_TEST_DISPOSABLE_DATABASE!=='yes'){
 console.error('Local development setup is incomplete.');process.exit(1);
}
const html=`<!doctype html><html lang="th"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>M3 private setup</title><style>body{font:16px system-ui,sans-serif;max-width:440px;margin:5vh auto;padding:20px;color:#202a33}label{display:block;margin:20px 0 6px}input,button{box-sizing:border-box;width:100%;font:inherit;padding:12px}button{margin-top:24px;background:#254a62;color:white;border:0;cursor:pointer}p{line-height:1.5}#status{min-height:2em}</style><h1>ตั้งค่า M3 ในเครื่อง</h1><p>กรอกข้อมูลของ Supabase project ทดสอบ ข้อมูลจะส่งถึงโปรแกรมบนเครื่องนี้เท่านั้น และจะไม่แสดงในแชต</p><form id="form" autocomplete="off"><label for="database">Database password ที่ตั้งไว้ตอนสร้าง Supabase project</label><input id="database" type="password" autocomplete="off" required><label for="host">ตั้งรหัส Host สำหรับทดสอบ (อย่างน้อย 12 ตัวอักษร)</label><input id="host" type="password" minlength="12" autocomplete="new-password" required><label for="confirm">ยืนยันรหัส Host</label><input id="confirm" type="password" minlength="12" autocomplete="new-password" required><button>ตรวจสอบและบันทึก</button></form><p id="status" role="status"></p><script>const token=${JSON.stringify(token)};document.getElementById('form').addEventListener('submit',async event=>{event.preventDefault();const form=event.currentTarget;const button=form.querySelector('button');button.disabled=true;const status=document.getElementById('status');status.textContent='กำลังตรวจสอบการเชื่อมต่อ…';try{const response=await fetch('/configure',{method:'POST',headers:{'content-type':'application/json','x-setup-token':token},body:JSON.stringify({databasePassword:document.getElementById('database').value,hostPassword:document.getElementById('host').value,confirmation:document.getElementById('confirm').value})});const result=await response.json();status.textContent=result.message;if(response.ok){form.remove()}else{button.disabled=false}}catch{status.textContent='ไม่สามารถติดต่อโปรแกรมในเครื่องได้';button.disabled=false}})</script></html>`;
let server;
server=createServer(async(req,res)=>{
 const origin=`http://127.0.0.1:${server.address().port}`;
 const send=(status,message)=>{res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store'});res.end(JSON.stringify({message}))};
 if(req.method==='GET'&&req.url==='/'){
  res.writeHead(200,{'content-type':'text/html; charset=utf-8','cache-control':'no-store','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(html);return;
 }
 if(req.method!=='POST'||req.url!=='/configure'||req.headers.origin!==origin||req.headers['x-setup-token']!==token||req.headers['content-type']!=='application/json'){
  send(403,'คำขอไม่ถูกต้อง');return;
 }
 let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){send(413,'ข้อมูลยาวเกินไป');return}}
 try{
  const {databasePassword,hostPassword,confirmation}=JSON.parse(body);
  if(typeof databasePassword!=='string'||typeof hostPassword!=='string'||hostPassword!==confirmation){send(400,'กรุณาตรวจสอบข้อมูลที่กรอก');return}
  const database=buildDevelopmentConnection(template,databasePassword,process.env.SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hash=createHostHash(hostPassword);
  const client=new pg.Client({connectionString:database,connectionTimeoutMillis:10000});
  try{await client.connect();await client.query('select 1')}catch{send(400,'เชื่อมต่อฐานข้อมูลไม่ได้ กรุณาตรวจสอบ Database password');return}finally{await client.end().catch(()=>{})}
  const original=readFileSync(file,'utf8');
  for(const key of ['M3_TEST_DATABASE_URL','HOST_PASSWORD_SCRYPT'])if(!new RegExp(`^${key}=[ \\t]*$`,'m').test(original)){send(409,'มีการตั้งค่าอยู่แล้ว กรุณาให้ผู้ช่วยตรวจสอบ');return}
  const updated=original.replace(/^M3_TEST_DATABASE_URL=[^\r\n]*$/m,()=>`M3_TEST_DATABASE_URL=${database}`).replace(/^HOST_PASSWORD_SCRYPT=[^\r\n]*$/m,()=>`HOST_PASSWORD_SCRYPT=${hash}`);
  writeFileSync(file,updated,{mode:0o600});send(200,'บันทึกสำเร็จแล้ว คุณกลับไปที่แชตได้');
  server.close();console.log('Private settings saved locally. No values were displayed.');
 }catch{send(400,'ตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง')}
});
server.listen(0,'127.0.0.1',()=>console.log(`Open http://127.0.0.1:${server.address().port}/ to finish local M3 setup.`));
