import { Lobby } from '@/components/Lobby';
import { ServerLobby } from '@/components/ServerLobby';
import '@/styles/lobby.css';
import '@/styles/nextopia.css';
export default function Page() { return (process.env.NODE_ENV==='production'||process.env.NEXT_PUBLIC_SESSION_MODE==='server')?<ServerLobby/>:<Lobby/>; }
