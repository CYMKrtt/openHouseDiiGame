'use client';
/* eslint-disable @next/next/no-location-assign-relative-destination -- Full navigation isolates approved page styles. */
import { useEffect } from 'react';
import { QuizView } from '@/components/QuizView';
import { clearQuizProgress, quizProgressKey } from '@/lib/quizProgress';
import { mockSession } from '@/mock/session';
import { useMockSession } from '@/mock/useMockSession';

export function Quiz() {
  const session = useMockSession();
  const id = mockSession.currentId();
  const player = session.players.find(p => p.id === id);
  useEffect(() => {
    if (!mockSession.isLoaded()) return;
    const current = mockSession.getSnapshot();
    const own = current.players.find(p => p.id === mockSession.currentId());
    if (!own) window.location.replace('/');
    else if (current.started || own.company) window.location.assign('/reveal');
  }, [session]);
  if (!player || !id) return <QuizShell />;
  const key = quizProgressKey('mock', id);
  return <QuizView seed={id} storageKey={key} name={player.name} onSubmit={async answers => {
    const error = mockSession.submitQuiz(id, answers);
    if (error) return error;
    clearQuizProgress(key);
    window.location.assign('/reveal');
    return null;
  }} />;
}

/** Empty frame shown while the player record loads. */
export function QuizShell() { return <div className="site quiz-site"><main className="quiz-main" aria-busy="true" /></div>; }
