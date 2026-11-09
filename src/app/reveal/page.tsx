import { Reveal } from '@/components/Reveal';
import { ServerReveal } from '@/components/ServerReveal';
import '@/styles/reveal.css';
import '@/styles/activity.css';
import '@/styles/insight.css';
import '@/styles/nextopia.css';
export default function Page() {
  return (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SESSION_MODE === 'server')?<ServerReveal/>:<Reveal/>;
}
