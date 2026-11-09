import { Quiz } from '@/components/Quiz';
import { ServerQuiz } from '@/components/ServerQuiz';
import '@/styles/landing.css';
import '@/styles/quiz.css';
import '@/styles/nextopia.css';
export default function Page() { return (process.env.NODE_ENV==='production'||process.env.NEXT_PUBLIC_SESSION_MODE==='server')?<ServerQuiz/>:<Quiz/>; }
