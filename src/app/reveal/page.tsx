import { notFound } from 'next/navigation';
import { Reveal } from '@/components/Reveal';
import '@/styles/reveal.css';
export default function Page() {
  if (process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_SESSION_MODE === 'server') notFound();
  return <Reveal/>;
}
