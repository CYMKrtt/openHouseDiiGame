import { Reveal } from '@/components/Reveal';
import { ServerReveal } from '@/components/ServerReveal';
import '@/styles/reveal.css';
export default function Page() {
  return (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SESSION_MODE === 'server')?<ServerReveal/>:<Reveal/>;
}
