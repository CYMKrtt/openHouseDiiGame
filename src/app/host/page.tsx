import { Host } from '@/components/Host';
import { ServerHost } from '@/components/ServerHost';
import '@/styles/host.css';
export default function Page() { return (process.env.NODE_ENV==='production'||process.env.NEXT_PUBLIC_SESSION_MODE==='server')?<ServerHost/>:<Host/>; }
