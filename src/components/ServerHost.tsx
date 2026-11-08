'use client';
import { useEffect,useRef,useState,type KeyboardEvent } from 'react';
import { HostArt0,HostArt1 } from '@/art/host';
import { companies } from '@/lib/companies';
import { multiplayer,ServiceError,type HostSession } from '@/services/multiplayer';
type Confirmation = {action:'start'|'next-round';roundId:string};
function containTab(event:KeyboardEvent<HTMLDivElement>){
 if(event.key!=='Tab')return;
 const controls=event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)');
 const first=controls[0],last=controls[controls.length-1];
 const focused=document.activeElement;
 if(!first||!last||focused===event.currentTarget||focused===(event.shiftKey?first:last)){
  event.preventDefault();
  (event.shiftKey?last??event.currentTarget:first??event.currentTarget).focus();
 }
}
export function ServerHost(){
 const [state,setState]=useState<HostSession|null>(null),[authed,setAuthed]=useState(false),[password,setPassword]=useState('');
 const [error,setError]=useState(''),[actionError,setActionError]=useState(''),[notice,setNotice]=useState('');
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState<Confirmation|null>(null);
 const opener=useRef<HTMLButtonElement>(null),dashboardTitle=useRef<HTMLHeadingElement>(null);
 const confirmDialog=useRef<HTMLDivElement>(null),cancelButton=useRef<HTMLButtonElement>(null);
 useEffect(()=>{let active=true;async function refresh(){try{const value=await multiplayer.hostSession();if(active){setAuthed(true);setState(previous=>previous&&previous.revision>value.revision?previous:value)}}catch(e){if(active){setState(null);if(e instanceof ServiceError&&e.status===401){setAuthed(false);setConfirm(null)}}}}
  void refresh();const timer=setInterval(()=>void refresh(),5000);return()=>{active=false;clearInterval(timer)}},[]);
 useEffect(()=>{
  if(!authed||confirm||busy)return;
  const trigger=opener.current;
  opener.current=null;
  if(trigger?.isConnected&&!trigger.disabled)trigger.focus();else dashboardTitle.current?.focus();
 },[authed,confirm,busy]);
 useEffect(()=>{
  if(!confirm)return;
  if(busy)confirmDialog.current?.focus();
  else if(document.activeElement===confirmDialog.current)cancelButton.current?.focus();
 },[confirm,busy]);
 async function login(){if(busy)return;setBusy(true);try{await multiplayer.hostLogin(password);setPassword('');setState(await multiplayer.hostSession());setAuthed(true);setError('')}catch(e){setError(e instanceof ServiceError&&e.code==='RATE_LIMITED'?'ลองใหม่อีกครั้งภายหลัง':'ไม่สามารถเข้าสู่ระบบได้')}finally{setBusy(false)}}
 function openConfirmation(action:Confirmation['action'],trigger:HTMLButtonElement){
  if(!state)return;
  opener.current=trigger;
  setActionError('');setNotice('');setConfirm({action,roundId:state.roundId});
 }
 async function submitConfirmation(){
  if(!confirm||busy)return;
  if(!state||state.roundId!==confirm.roundId){
   setActionError('รอบกิจกรรมเปลี่ยนแล้ว กรุณาปิดหน้าต่างนี้และตรวจสอบสถานะล่าสุด');
   return;
  }
  setBusy(true);setActionError('');
  const next=confirm.action==='next-round';
  try{
   if(next){
    if(!state.nextRoundToken)throw new ServiceError('REVEAL_IN_PROGRESS',409);
    await multiplayer.hostNextRound(confirm.roundId,state.nextRoundToken);
    setNotice('เปิดรอบใหม่แล้ว ผู้เล่นเข้าร่วมได้จาก QR เดิม');
    setState(null);
   }else{
    await multiplayer.hostStart(confirm.roundId,state.confirmationToken);
   }
   setConfirm(null);
   const latest=await multiplayer.hostSession().catch(()=>null);
   if(latest)setState(previous=>previous&&previous.revision>latest.revision?previous:latest);
  }catch(error){
   const code=error instanceof ServiceError?error.code:'';
   setActionError(code==='ROUND_CHANGED'?'รอบกิจกรรมเปลี่ยนแล้ว กรุณาตรวจสอบสถานะล่าสุด':
    code==='REVEAL_IN_PROGRESS'?'รอให้การเปิดเผยบริษัทจบก่อน':
    code==='START_CONDITION_NOT_MET'?'รออย่างน้อย 1 Online':
    next?'ไม่สามารถเปิดรอบใหม่ได้ โปรดลองอีกครั้ง':'ไม่สามารถเริ่มได้ โปรดลองอีกครั้ง');
  }finally{setBusy(false)}
 }
 const count=state?.onlineCount,committed=state?.phase==='committed';
 return <><div className="wrap" inert={!authed||!!confirm}><header className="top"><div className="brand"><span className="mark"><HostArt0/></span><span>A LITTLE WORLD<br/>OF COMPANIES</span></div><span className="host-pill">✦ HOST VIEW</span></header><div className="intro"><div><span className="eyebrow">WORKSHOP OVERVIEW</span><h1 ref={dashboardTitle} tabIndex={-1}>ภาพรวมกิจกรรม</h1><p>ติดตามผู้เข้าร่วมและเริ่มกิจกรรมเมื่อทุกคนพร้อม</p></div><div className={'state'+(committed?' started':'')}><i/><span>{state?committed?'เปิดเผยบริษัทแล้ว':'กำลังรอผู้เล่น':'กำลังตรวจสอบการเชื่อมต่อ'}</span></div></div><div className="metrics"><div className="metric"><label>ออนไลน์ตอนนี้</label><b>{count??'—'}<small> / 15</small></b></div><div className="metric"><label>จองที่นั่งแล้ว</label><b>{state?.reservedCount??'—'}<small> / 15</small></b></div><div className="metric"><label>ออฟไลน์</label><b>{state?state.reservedCount-state.onlineCount:'—'}</b></div></div><div className="main-grid"><section className="panel"><div className="panel-head"><h2>รายชื่อผู้เข้าร่วม</h2><span className="mini">{state?.reservedCount??'—'} คนที่จองแล้ว</span></div><table className="roster"><thead><tr><th>ชื่อ</th><th>สถานะ</th><th>บริษัท</th></tr></thead><tbody>{state?.players.map((p,i)=><tr key={p.id}><td><span className="index">{String(i+1).padStart(2,'0')}</span><span className="pname">{p.displayName}</span></td><td><span className={'presence'+(p.isOnline?'':' off')}><i/>{p.isOnline?'Online':'Offline'}</span></td><td><span className={'team '+(p.companyId==='ecommerce'?'ecom':p.companyId??'')}>{p.companyId?companies[p.companyId].label:'—'}</span></td></tr>)}</tbody></table>{state?.players.length===0&&<div className="empty">ยังไม่มีผู้เล่นเข้าร่วม</div>}</section><aside className="panel aside"><h2>Host controls</h2><p>เริ่มกิจกรรมก่อนครบ 15 คนได้ เมื่อมีผู้เล่นออนไลน์อย่างน้อย 1 คน</p><button className="startbtn" onClick={event=>openConfirmation('start',event.currentTarget)} disabled={!state||committed||!count||busy}>{committed?'ผลบริษัทล็อกแล้ว ✓':'เริ่มเปิดเผยบริษัท ✦'}</button><div className="divider"/><button className="startbtn" onClick={event=>openConfirmation('next-round',event.currentTarget)} disabled={!state?.canNextRound||busy}>Next Round</button>{notice&&<p role="status">{notice}</p>}<div className="status-copy">สถานะ: {committed?'Reveal เริ่มแล้ว':count?'พร้อมให้ Host เริ่ม':'รออย่างน้อย 1 Online'}</div><div className="notice"><HostArt1/><span>ผู้เล่นที่ออฟไลน์ยังคงมีที่นั่ง และจะได้รับผลบริษัทเมื่อเริ่มกิจกรรม</span></div></aside></div></div>
 {!authed&&<div className="overlay"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="gateTitle" onKeyDown={containTab}><div className="icon">🔒</div><h2 id="gateTitle">เฉพาะผู้จัดกิจกรรม</h2><p>กรอกรหัสผ่านเพื่อดูข้อมูลผู้เล่นและควบคุมการเริ่มกิจกรรม</p><form onSubmit={event=>{event.preventDefault();void login()}}><label htmlFor="password">รหัสผ่าน Host</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} autoFocus/><div className="error" role="alert">{error}</div><button className="confirm" type="submit" disabled={busy}>เข้าสู่ Host Dashboard</button></form></div></div>}
 {authed&&confirm&&<div className="overlay"><div className="dialog" role="dialog" aria-modal="true" aria-labelledby="confirmTitle" ref={confirmDialog} tabIndex={-1} onKeyDown={event=>{
  containTab(event);
  if(event.key==='Escape'&&!busy)setConfirm(null);
 }}>
  <div className="icon">✦</div>
  <h2 id="confirmTitle">{confirm.action==='next-round'?'เปิดรอบใหม่?':'เริ่มเปิดเผยบริษัท?'}</h2>
  {confirm.action==='next-round'
   ?<p>รอบใหม่จะเริ่มด้วย 0 ที่นั่งและ 0 ผู้เล่นออนไลน์ ผลรอบเดิมจะถูกเก็บไว้ ผู้เล่นรอบใหม่ใช้ QR เดิมได้</p>
   :<p>ขณะนี้มี {state?.reservedCount} Reserved / {count} Online หากยืนยันจะสุ่มให้ทุก Reserved Seat รวมผู้เล่นที่ Offline และปิดรับผู้เล่นใหม่</p>}
  {actionError&&<div className="error" role="alert">{actionError}</div>}
  <div className="row">
   <button ref={cancelButton} className="cancel" onClick={()=>setConfirm(null)} autoFocus disabled={busy}>ยกเลิก</button>
   <button className="confirm" onClick={()=>void submitConfirmation()} disabled={busy}>{confirm.action==='next-round'?'ยืนยันเปิดรอบใหม่':'ยืนยันการเริ่ม'}</button>
  </div>
 </div></div>}
 </>;
}
