'use client';
/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation isolates approved page styles. */
import { NextopiaSky } from '@/components/NextopiaSky';
import { useEffect,useState,type CSSProperties } from 'react';
import { RevealArt0, RevealArt1 } from '@/art/reveal';
import { NextopiaCompanyRoom } from '@/art/nextopia';
import { companies } from '@/lib/companies';
import { CompanyActivity } from '@/components/CompanyActivity';
import { QuizInsight } from '@/components/QuizInsight';
import { multiplayer,ServiceError,watchLobby,type Player } from '@/services/multiplayer';
type Phase='preparing'|'revealing'|'revealed'|'error';
export function ServerReveal(){
 const [phase,setPhase]=useState<Phase>('preparing'),[player,setPlayer]=useState<Player|null>(null);
 useEffect(()=>{let active=true,ready=false;let timer:ReturnType<typeof setTimeout>|undefined;
  let stopWatching:(()=>void)|undefined;
  const goToJoin=()=>{sessionStorage.removeItem('lw-initial-reveal');window.location.replace('/')};
  const tick=(start:number)=>{if(!active)return;const now=Date.now();if(now<start){setPhase('preparing');timer=setTimeout(()=>tick(start),Math.max(1,start-now))}else if(now<start+4000){setPhase('revealing');timer=setTimeout(()=>tick(start),Math.max(1,start+4000-now))}else{setPhase('revealed');sessionStorage.removeItem('lw-initial-reveal')}};
  async function load(){if(ready||!active)return;const before=Date.now();try{const own=await multiplayer.me();const after=Date.now();if(!active)return;
    if(!own.companyId){window.location.assign('/quiz');return}
    ready=true;setPlayer(own);const sharedStart=own.revealStartAt&&sessionStorage.getItem('lw-initial-reveal')===own.revealStartAt?own.revealStartAt:null;
    stopWatching=watchLobby(own.roundId,()=>{},goToJoin);
    const offset=Date.parse(own.serverTime)-(before+after)/2;
    tick(sharedStart?Date.parse(sharedStart)-offset:Date.now()+450);
   }catch(error){
    if(!active)return;
    if(error instanceof ServiceError&&error.code==='PLAYER_REQUIRED')goToJoin();else setPhase('error');
   }}
  void load();const retry=setInterval(()=>void load(),5000);window.addEventListener('online',load);
  return()=>{active=false;stopWatching?.();clearInterval(retry);clearTimeout(timer);window.removeEventListener('online',load)}
 },[]);
 useEffect(()=>{document.body.classList.remove('preparing','done','fail','celebrating');if(phase==='preparing')document.body.classList.add('preparing');if(phase==='error')document.body.classList.add('fail');let celebration:ReturnType<typeof setTimeout>|undefined;if(phase==='revealed'){document.body.classList.add('done');if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.classList.add('celebrating');celebration=setTimeout(()=>document.body.classList.remove('celebrating'),2100)}}return()=>{clearTimeout(celebration);document.body.classList.remove('preparing','done','fail','celebrating')}},[phase]);
 const company=player?.companyId,info=companies[company??'tech'];
 const style={'--company':info.color,'--company-neon':info.neon,'--soft':info.soft,'--company-ink':info.ink} as CSSProperties;
 const coords=[[0,-82,-120,0],[42,-99,-60,65],[97,-99,0,130],[155,-77,60,195],[94,-14,120,0],[121,18,-120,65],[131,65,-60,130],[115,118,0,195],[32,77,60,0],[0,106,120,65],[-52,122,-120,130],[-115,118,-60,195],[-82,41,0,0],[-121,18,60,65],[-149,-23,120,130],[-155,-77,-120,195],[-61,-63,-60,0],[-42,-99,0,65]];
 return <div style={style}><div className="shell"><header className="masthead"><div className="brand"><span className="mark" aria-hidden="true"><RevealArt0/></span><span className="nx-wordmark"><span className="nx-wordmark-name">NEXTOPIA</span><small className="nx-wordmark-sub">A Little World of Companies</small></span></div><span className="edition">CAMT DII Open House</span></header><NextopiaSky variant="reveal"/><main className="main"><p className="reveal-announcement" role="status" aria-atomic="true">{phase==='revealed'?`ยินดีต้อนรับเข้าสู่ ${info.label}`:phase==='error'?'ยังไม่สามารถยืนยันผลบริษัทได้ในขณะนี้':''}</p><div className="spin-stage"><p className="eyebrow">{phase==='preparing'?'PREPARING':'COMPANY REVEAL'}</p><h1 className="headline">ถึงเวลาแล้ว!</h1><p className="subtitle">มาดูกันว่าคุณจะได้อยู่บริษัทไหน</p><div className="star-stage"><div className="orbital"><RevealArt1/><span className="orbit-dot"/><span className="orbit-dot second"/></div></div><p className="star-caption">กำลังเปิดเผยบริษัทของคุณ...</p><p className="stage-message">คำตอบของคุณพร้อมแล้ว บริษัทจะเปิดเผยในไม่กี่วินาที</p></div><section className="reveal-stage"><div className="reveal-celebration" aria-hidden="true">{coords.map(([x,y,r,d],i)=><i key={i} className="pixel" style={{'--dx':`${x}px`,'--dy':`${y}px`,'--rot':`${r}deg`,'--delay':`${d}ms`} as CSSProperties}/>)}</div><p className="eyebrow">✦ YOUR COMPANY ✦</p><p className="subtitle">ยินดีต้อนรับเข้าสู่</p><h1 className="reveal-title">{info.label}</h1><span className="company-label">{info.subtitle}</span><div className="room-wrap"><div className="company-room" role="img" aria-label={`ภาพห้องทำงาน Pixel Art ของ ${info.label}`}><NextopiaCompanyRoom company={company??'tech'}/></div></div><p className="description">{info.desc}</p><span className="reveal-pill">✦ COMPANY ASSIGNMENT COMPLETE</span></section><CompanyActivity company={company}/><QuizInsight answers={player?.quizAnswers} company={company}/><section className="error-stage"><div className="error-star">✧</div><h1>ยังแสดงผลไม่ได้</h1><p>ยังไม่สามารถยืนยันผลบริษัทได้ในขณะนี้</p></section></main><footer className="footer"><span>✳ MADE FOR LITTLE ADVENTURES</span><span><b>COMPANY REVEAL</b></span></footer></div></div>;
}
