'use client';
import { NextopiaSky } from '@/components/NextopiaSky';
import { useEffect, useRef, useState } from 'react';
import { LandingArt0 } from '@/art/landing';
import { quizQuestions } from '@/lib/quiz';
import { emptyProgress, loadQuizProgress, saveQuizProgress, type QuizProgress } from '@/lib/quizProgress';
import { QUESTION_COUNT, optionOrder, type Track } from '@/lib/quizScoring';

type Props = {
  /** Seeds the per-player option order, so a refresh shows the same order. */
  seed: string;
  storageKey: string;
  name?: string;
  /** Returns an error message, or null when the answers were saved. */
  onSubmit: (answers: Track[]) => Promise<string | null>;
};
const LETTERS = ['A', 'B', 'C', 'D'];

export function QuizView({ seed, storageKey, name, onSubmit }: Props) {
  const [progress, setProgress] = useState<QuizProgress>(emptyProgress);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const advance = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const moved = useRef(false);

  useEffect(() => {
    const restore = setTimeout(() => { setProgress(loadQuizProgress(storageKey)); setReady(true); }, 0);
    return () => clearTimeout(restore);
  }, [storageKey]);
  useEffect(() => () => clearTimeout(advance.current), []);
  useEffect(() => { if (moved.current) heading.current?.focus(); }, [progress.index]);

  const update = (next: QuizProgress) => { setProgress(next); saveQuizProgress(storageKey, next); };
  const goTo = (index: number) => { clearTimeout(advance.current); moved.current = true; setMessage(''); update({ ...progress, index }); };
  function choose(track: Track) {
    if (busy) return;
    clearTimeout(advance.current);
    const answers = progress.answers.map((value, i) => (i === progress.index ? track : value));
    const chosen = { ...progress, answers };
    update(chosen);
    setMessage('');
    if (progress.index < QUESTION_COUNT - 1) {
      advance.current = setTimeout(() => { moved.current = true; update({ ...chosen, index: chosen.index + 1 }); }, 220);
    }
  }
  async function submit() {
    const answers = progress.answers.filter((value): value is Track => value !== null);
    if (answers.length !== QUESTION_COUNT) {
      const missing = progress.answers.findIndex(value => value === null);
      setMessage(`ยังไม่ได้ตอบข้อ ${missing + 1}`);
      goTo(missing);
      return;
    }
    setBusy(true); setMessage('');
    const error = await onSubmit(answers);
    if (error) { setMessage(error); setBusy(false); }
  }

  const question = quizQuestions[progress.index];
  const order = optionOrder(seed, progress.index, question.options.length);
  const selected = progress.answers[progress.index];
  const last = progress.index === QUESTION_COUNT - 1;

  return <div className="site quiz-site">
    <header className="masthead" aria-label="ชื่อกิจกรรม"><div className="brand"><span className="brand-logo" aria-hidden="true"><LandingArt0 /></span><span className="nx-wordmark"><span className="nx-wordmark-name">NEXTOPIA</span><small className="nx-wordmark-sub">A Little World of Companies</small></span></div><span className="episode">CAMT DII Open House</span></header>
    <main className="quiz-main" aria-busy={!ready}>
      <div className="quiz-top">
        <div className="eyebrow"><span className="dot" /> {name ? `สวัสดี ${name}` : 'ค้นหาบริษัทที่ใช่'}</div>
        <span className="quiz-count" aria-hidden="true">{progress.index + 1}/{QUESTION_COUNT}</span>
      </div>
      <div className="quiz-progress" role="progressbar" aria-label="ความคืบหน้าแบบทดสอบ" aria-valuemin={1} aria-valuemax={QUESTION_COUNT} aria-valuenow={progress.index + 1} aria-valuetext={`ข้อ ${progress.index + 1} จาก ${QUESTION_COUNT}`}>
        {Array.from({ length: QUESTION_COUNT }, (_, i) => <span key={i} className={'quiz-step' + (i < progress.index ? ' done' : i === progress.index ? ' current' : '')} />)}
      </div>
      <NextopiaSky variant="quiz" />
      {ready && <>
        <p className="quiz-number">คำถามข้อที่ {progress.index + 1}</p>
        <h1 className="quiz-question" id="quizQuestion" ref={heading} tabIndex={-1}>{question.prompt}</h1>
        <div className="quiz-options" role="radiogroup" aria-labelledby="quizQuestion">
          {order.map((optionIndex, position) => {
            const option = question.options[optionIndex];
            const checked = selected === option.track;
            return <button key={optionIndex} type="button" role="radio" aria-checked={checked} className={'quiz-option' + (checked ? ' selected' : '')} onClick={() => choose(option.track)} disabled={busy}>
              <span className="quiz-letter" aria-hidden="true">{LETTERS[position]}</span>
              <span className="quiz-text">{option.text}</span>
            </button>;
          })}
        </div>
        <div className={'form-feedback quiz-feedback' + (message ? ' error' : '')} role="status" aria-live="polite">{message}</div>
        <nav className="quiz-nav" aria-label="เปลี่ยนคำถาม">
          <button type="button" className="quiz-back" onClick={() => goTo(progress.index - 1)} disabled={progress.index === 0 || busy}><span aria-hidden="true">←</span> ย้อนกลับ</button>
          {last
            ? <button type="button" className="join-button quiz-submit" onClick={submit} disabled={busy}><span>{busy ? 'กำลังส่ง...' : 'ส่งคำตอบ'}</span><span aria-hidden="true">✦</span></button>
            : <button type="button" className="quiz-back quiz-forward" onClick={() => goTo(progress.index + 1)} disabled={!selected || busy}>ถัดไป <span aria-hidden="true">→</span></button>}
        </nav>
      </>}
    </main>
    <footer className="footer"><span>✳ MADE FOR LITTLE ADVENTURES</span><span><b>QUIZ</b> · 5 QUESTIONS</span></footer>
  </div>;
}
