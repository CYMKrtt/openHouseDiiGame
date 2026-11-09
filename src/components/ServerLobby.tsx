'use client';
import { NextopiaSky } from '@/components/NextopiaSky';
import { useEffect,useState } from 'react';
import { LobbyArt0,LobbyArt1 } from '@/art/lobby';
import { multiplayer } from '@/services/multiplayer';
/** Results are shown as soon as the quiz is done, so the lobby only forwards old links: result, quiz or Join. */
export function ServerLobby(){
 const [connectionIssue,setConnectionIssue]=useState(false);
 useEffect(()=>{
  let active=true;
  multiplayer.bootstrap().then(({own})=>{
   if(!active)return;
   sessionStorage.removeItem('lw-initial-reveal');
   window.location.replace(!own?'/':own.companyId||own.phase==='committed'?'/reveal':'/quiz');
  }).catch(()=>{if(active)setConnectionIssue(true)});
  return()=>{active=false};
 },[]);
 return <div className="shell"><header className="masthead"><div className="brand"><span className="mark" aria-hidden="true"><LobbyArt0/></span><span className="nx-wordmark"><span className="nx-wordmark-name">NEXTOPIA</span><small className="nx-wordmark-sub">A Little World of Companies</small></span></div><span className="edition">CAMT DII Open House</span></header><NextopiaSky variant="lobby"/><main className="main"><div className="eyebrow"><span className="spark">✦</span> EVERYONE&apos;S GETTING READY <span className="spark">✦</span></div><h1 className="headline">กำลังพาไปต่อ...</h1><div className="scene-wrap" role="img" aria-label="ภาพสำนักงานส่วนกลาง Pixel Art"><LobbyArt1/></div><div className={'offline-banner'+(connectionIssue?' active':'')} role="alert">การเชื่อมต่อขัดข้อง โปรดลองอีกครั้ง</div></main><footer className="footer"><span>✳ MADE FOR LITTLE ADVENTURES</span><span><b>WAITING LOBBY</b></span></footer></div>;
}
