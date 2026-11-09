import { companyActivities } from '@/lib/quiz';
import type { CompanyId } from '@/lib/quizScoring';

/** Post-reveal card for the company's mini-game, themed after its Canva deck. Hidden until the reveal finishes (see activity.css). */
export function CompanyActivity({ company }: { company: CompanyId | null | undefined }) {
  if (!company) return null;
  const activity = companyActivities[company];
  return <section className={`company-activity activity-${company}`} aria-labelledby="activityTitle">
    <span className="activity-deco" aria-hidden="true" />
    <p className="activity-eyebrow">✦ กิจกรรมที่รอคุณอยู่ ✦</p>
    <h2 id="activityTitle" className="activity-title">{activity.title}</h2>
    <p className="activity-tagline">{activity.tagline}</p>
    <ol className="activity-steps">
      {activity.steps.map((step, i) => <li key={step}><span className="activity-num" aria-hidden="true">{i + 1}</span><span>{step}</span></li>)}
    </ol>
  </section>;
}
