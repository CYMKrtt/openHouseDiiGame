'use client';
/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation isolates approved page styles. */
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LandingArt0, LandingArt1 } from '@/art/landing';
import { multiplayer, ServiceError } from '@/services/multiplayer';
export function ServerLanding(){
 const [name,setName]=useState('');const [message,setMessage]=useState('กรอกชื่อแล้วเข้าร่วมโลกบริษัทใบเล็กได้เลย');const [error,setError]=useState(false);const [busy,setBusy]=useState(true);
 const [roundId,setRoundId]=useState<string|null>(null);
 const [invalidName,setInvalidName]=useState(false);
 const nameInput=useRef<HTMLInputElement>(null);
 useEffect(()=>{if(invalidName&&!busy)nameInput.current?.focus()},[invalidName,busy]);
 useEffect(()=>{let active=true;multiplayer.bootstrap().then(({own,state})=>{if(!active)return;if(own){if(own.phase==='committed')sessionStorage.removeItem('lw-initial-reveal');window.location.assign(own.phase==='committed'?'/reveal':'/lobby');return}setRoundId(state.roundId);setBusy(false)}).catch(()=>{if(active){setBusy(false);setError(true);setMessage('ไม่สามารถเชื่อมต่อได้ โปรดลองอีกครั้ง')}});return()=>{active=false}},[]);
 async function join(e:FormEvent){
  e.preventDefault();
  if(!roundId){window.location.reload();return}
  setBusy(true);setError(false);setInvalidName(false);
  try{await multiplayer.join(roundId,name);window.location.assign('/lobby')}
  catch(e){
   if(e instanceof ServiceError&&e.code==='ROUND_CHANGED'){window.location.reload();return}
   const nameRejected=e instanceof ServiceError&&e.code==='INVALID_NAME';
   setInvalidName(nameRejected);
   setError(true);setMessage(nameRejected?'กรุณากรอกชื่อผู้เล่น 1–30 ตัวอักษร':e instanceof ServiceError && e.code==='CAPACITY_FULL'?'กิจกรรมเต็ม 15 ที่นั่งแล้ว':e instanceof ServiceError && e.code==='SESSION_STARTED'?'กิจกรรมเริ่มแล้ว':'ไม่สามารถเชื่อมต่อได้ โปรดลองอีกครั้ง');setBusy(false)
  }
 }
 return <div className="site"><header className="masthead" aria-label="ชื่อกิจกรรม"><div className="brand"><span className="brand-logo" aria-hidden="true"><LandingArt0/></span><span>A LITTLE WORLD<br/>OF COMPANIES</span></div><span className="episode">✦ WORKSHOP EDITION</span></header><main className="main" id="landing"><div className="eyebrow"><span className="dot"/> WELCOME TO OUR LITTLE WORLD</div><h1 className="headline">ยินดีต้อนรับสู่<br/><span className="highlight">โลกบริษัทใบเล็ก!</span></h1><p className="subtitle">มาสนุกกับโลกการทำงานสุดน่ารัก<br/>แล้วค้นพบว่าคุณจะได้อยู่บริษัทไหน</p><div className="scene-wrap" role="img" aria-label="ภาพ Pixel Art ห้องทำงานกลาง"><LandingArt1/></div><form className="join-inline" onSubmit={join} noValidate><label htmlFor="playerName" className="join-label">ก่อนเริ่มกิจกรรม บอกชื่อของคุณหน่อย!</label><div className="join-row"><input ref={nameInput} id="playerName" className="name-input" autoComplete="nickname" placeholder="ชื่อของคุณ..." aria-describedby="joinFeedback" aria-invalid={invalidName} value={name} onChange={e=>{setName(e.target.value);setInvalidName(false)}} disabled={busy}/><button className="join-button" type="submit" disabled={busy}><span>{busy?'กำลังเข้า...':'Join'}</span><span aria-hidden="true">↗</span></button></div><div id="joinFeedback" className={'form-feedback'+(error?' error':'')} role="status" aria-live="polite">{message}</div><div className="join-meta">15 PLAYERS <span className="star">✦</span> 3 COMPANIES</div></form></main><footer className="footer"><span>✳ MADE FOR LITTLE ADVENTURES</span><span><b>LANDING + JOIN</b></span></footer></div>;
}
