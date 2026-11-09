import type { CSSProperties } from 'react';
import { companies } from '@/lib/companies';
import { trackInsights } from '@/lib/quiz';
import { COMPANY_TRACK, TRACKS, TRACK_COMPANY, isCompleteAnswers, scoreQuiz, type CompanyId, type Track } from '@/lib/quizScoring';

/** Post-reveal analysis: score split, why this track fits, and what to practise next. Hidden until the reveal finishes (see insight.css). */
export function QuizInsight({ answers, company }: { answers: readonly Track[] | null | undefined; company: CompanyId | null | undefined }) {
  if (!company || !isCompleteAnswers(answers)) return null;
  const result = scoreQuiz(answers);
  const track = COMPANY_TRACK[company];
  const insight = trackInsights[track];
  const tiedWith = result.tied ? result.candidates.filter(c => c !== company).map(c => trackInsights[COMPANY_TRACK[c]].name) : [];
  return <section className="quiz-insight" aria-labelledby="insightTitle">
    <p className="insight-eyebrow">✦ ผลวิเคราะห์ของคุณ ✦</p>
    <h2 id="insightTitle" className="insight-title">คุณเหมาะกับสาย <span>{insight.name}</span></h2>
    <ul className="insight-bars" aria-label="สัดส่วนคำตอบของแต่ละสาย">
      {TRACKS.map(t => {
        const info = companies[TRACK_COMPANY[t]];
        return <li key={t} className={t === track ? 'mine' : undefined}>
          <span className="bar-label">{trackInsights[t].name}<small>{info.label}</small></span>
          <span className="bar-track" aria-hidden="true"><i style={{ width: `${result.percents[t]}%`, '--bar': info.color } as CSSProperties} /></span>
          <b className="bar-value">{result.percents[t]}%</b>
        </li>;
      })}
    </ul>
    {tiedWith.length > 0 && <p className="insight-note">คะแนนของคุณสูสีกับสาย {tiedWith.join(', ')} ด้วย ลองศึกษาทั้งสองสายดูนะ</p>}
    <div className="insight-block"><h3>ทำไมถึงเหมาะกับสายนี้</h3><p>{insight.why}</p></div>
    <div className="insight-block"><h3>ทักษะที่ควรฝึก</h3><ul className="insight-list">{insight.skills.map(skill => <li key={skill}>{skill}</li>)}</ul></div>
    <div className="insight-block"><h3>สาขาของ CAMT ที่เกี่ยวข้อง</h3><ul className="insight-list">{insight.camtMajors.map(major => <li key={major}>{major}</li>)}</ul></div>
  </section>;
}
