import { Landing } from '@/components/Landing';
import { ServerLanding } from '@/components/ServerLanding';
import '@/styles/landing.css';
import '@/styles/nextopia.css';
export default function Page() { return (process.env.NODE_ENV==='production'||process.env.NEXT_PUBLIC_SESSION_MODE==='server')?<ServerLanding/>:<Landing/>; }
