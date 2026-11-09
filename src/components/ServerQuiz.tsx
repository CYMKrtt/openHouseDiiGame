'use client';
/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation isolates approved page styles. */
import { useEffect, useState } from 'react';
import { QuizShell } from '@/components/Quiz';
import { QuizView } from '@/components/QuizView';
import { clearQuizProgress, quizProgressKey } from '@/lib/quizProgress';
import { multiplayer, ServiceError, watchSession, type Player } from '@/services/multiplayer';

export function ServerQuiz() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let stop: (() => void) | undefined;
    multiplayer.bootstrap().then(({ own }) => {
      if (!active) return;
      if (!own) { window.location.replace('/'); return; }
      if (own.phase === 'committed') { sessionStorage.removeItem('lw-initial-reveal'); window.location.assign('/reveal'); return; }
      if (own.companyId) { window.location.assign('/reveal'); return; }
      setPlayer(own);
      // If the Host closes the round mid-quiz the player already has a company; Next Round sends them back to Join.
      stop = watchSession(state => {
        if (!state || !active) return;
        if (state.roundId !== own.roundId) window.location.replace('/');
        else if (state.phase === 'committed') window.location.assign('/reveal');
      }, 5000);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; stop?.(); };
  }, []);
  if (failed) return <div className="site quiz-site"><main className="quiz-main"><div className="form-feedback quiz-feedback error" role="status">ไม่สามารถเชื่อมต่อได้ โปรดลองอีกครั้ง</div><button type="button" className="quiz-back" onClick={() => window.location.reload()}>ลองอีกครั้ง</button></main></div>;
  if (!player) return <QuizShell />;
  const key = quizProgressKey(player.roundId, player.playerId);
  return <QuizView seed={player.playerId} storageKey={key} name={player.displayName} onSubmit={async answers => {
    try {
      await multiplayer.submitQuiz(player.roundId, answers);
      clearQuizProgress(key);
      window.location.assign('/reveal');
      return null;
    } catch (error) {
      const code = error instanceof ServiceError ? error.code : '';
      if (code === 'ROUND_CHANGED' || code === 'PLAYER_REQUIRED') { window.location.replace('/'); return null; }
      if (code === 'SESSION_STARTED') { window.location.assign('/reveal'); return null; }
      return 'ส่งคำตอบไม่สำเร็จ โปรดลองอีกครั้ง';
    }
  }} />;
}
