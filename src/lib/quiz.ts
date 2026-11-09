import type { CompanyId, Track } from './quizScoring';

/**
 * Quiz copy. Edit the text here; keep `track` on each option.
 * The track is never shown to players, and the option order is shuffled per player.
 */
export type QuizOption = { track: Track; text: string };
export type QuizQuestion = { prompt: string; options: QuizOption[] };

export const quizQuestions: QuizQuestion[] = [
  {
    prompt: 'หากคุณได้รับโจทย์ให้สร้างโปรเจกต์ใหม่ คุณอยากทำส่วนไหนมากที่สุด?',
    options: [
      { track: 'dev', text: 'เขียนโปรแกรมและสร้างระบบให้ทำงานได้จริง' },
      { track: 'biznet', text: 'วางแผนธุรกิจ คิดกลยุทธ์ และหาวิธีทำให้โปรเจกต์ประสบความสำเร็จ' },
      { track: 'design', text: 'ออกแบบหน้าตาและประสบการณ์การใช้งานให้สวยงาม' },
    ],
  },
  {
    prompt: 'กิจกรรมแบบไหนที่คุณรู้สึกสนุกที่สุด?',
    options: [
      { track: 'dev', text: 'การแก้ปัญหาด้วยโค้ดและเทคโนโลยี' },
      { track: 'biznet', text: 'การพูดคุย นำเสนอ และทำงานร่วมกับผู้คน' },
      { track: 'design', text: 'การวาดภาพ ออกแบบ หรือสร้างผลงานใหม่ ๆ' },
    ],
  },
  {
    prompt: 'ถ้าคุณสามารถสร้างสิ่งหนึ่งขึ้นมาได้ คุณจะเลือกอะไร?',
    options: [
      { track: 'dev', text: 'แอปพลิเคชันหรือเว็บไซต์ที่ช่วยแก้ปัญหา' },
      { track: 'biznet', text: 'ธุรกิจหรือแพลตฟอร์มที่สร้างรายได้' },
      { track: 'design', text: 'ผลงานออกแบบหรือแบรนด์ที่มีเอกลักษณ์' },
    ],
  },
  {
    prompt: 'เมื่อพบปัญหาที่ซับซ้อน คุณมักจะทำอย่างไร?',
    options: [
      { track: 'dev', text: 'วิเคราะห์ปัญหาและหาวิธีแก้ไขอย่างเป็นระบบ' },
      { track: 'biznet', text: 'มองภาพรวมและหาวิธีจัดการให้ทุกฝ่ายได้ประโยชน์' },
      { track: 'design', text: 'คิดหาวิธีใหม่ ๆ ที่แตกต่างจากเดิม' },
    ],
  },
  {
    prompt: 'คุณอยากมีบทบาทแบบไหนในการทำงานเป็นทีม?',
    options: [
      { track: 'dev', text: 'คนที่สร้างระบบและดูแลเทคนิคเบื้องหลัง' },
      { track: 'biznet', text: 'คนที่วางแผน ประสานงาน และพาทีมไปสู่เป้าหมาย' },
      { track: 'design', text: 'คนที่คิดไอเดียและดูแลหน้าตาของผลงาน' },
    ],
  },
];

/** Result-page analysis for each track. */
export type TrackInsight = { name: string; why: string; skills: string[]; camtMajors: string[] };

export const trackInsights: Record<Track, TrackInsight> = {
  dev: {
    name: 'DEV',
    why: 'คุณชอบลงมือสร้างของให้ใช้งานได้จริง สนุกกับการแก้ปัญหาทีละขั้นด้วยเหตุผลและเทคโนโลยี',
    skills: ['ฝึกเขียนโปรแกรมพื้นฐาน เช่น Python หรือ JavaScript', 'ลองทำเว็บหรือแอปเล็ก ๆ ของตัวเอง', 'ฝึกคิดเป็นขั้นตอนและแก้โจทย์ตรรกะ'],
    camtMajors: ['DII — Digital Industry Integration'],
  },
  design: {
    name: 'DESIGN',
    why: 'คุณมองเห็นความสวยงามและความรู้สึกของผู้ใช้ ชอบคิดไอเดียใหม่ ๆ แล้วเปลี่ยนให้เป็นผลงานที่จับต้องได้',
    skills: ['ฝึกวาดหรือร่างไอเดียบ่อย ๆ', 'ลองใช้เครื่องมืออย่าง Figma หรือ Canva', 'สังเกตว่าคนใช้งานแอปหรือของรอบตัวอย่างไร'],
    camtMajors: ['DII — Digital Industry Integration'],
  },
  biznet: {
    name: 'BIZNET',
    why: 'คุณมองภาพรวมเก่ง ชอบวางแผนและทำงานกับผู้คน และอยากเห็นไอเดียกลายเป็นโอกาสทางธุรกิจ',
    skills: ['ฝึกนำเสนอและเล่าเรื่องให้คนฟังเข้าใจ', 'ลองวางแผนขายของหรือทำโปรเจกต์เล็ก ๆ', 'ติดตามข่าวธุรกิจและเทคโนโลยีออนไลน์'],
    camtMajors: ['DII — Digital Industry Integration'],
  },
};

/**
 * The mini-game each company plays after the reveal (from the team's Canva decks:
 * "read code (tech)", "look for design (uxui)", "moneymoney (e-com)").
 */
export type CompanyActivityInfo = { title: string; tagline: string; steps: string[] };

export const companyActivities: Record<CompanyId, CompanyActivityInfo> = {
  tech: {
    title: 'CODE อ่านกัน!',
    tagline: 'ฝึกอ่านโค้ดแบบนักพัฒนา',
    steps: ['อ่านโค้ด', 'ตอบคำถาม', 'สะสมแสตมป์'],
  },
  design: {
    title: 'จับผิดภาพ',
    tagline: 'ฝึกสายตาแบบนักออกแบบ UX/UI',
    steps: ['ดูภาพสองภาพ', 'หาจุดที่ต่างกัน', 'เล่น 4 รอบ'],
  },
  ecommerce: {
    title: 'Circus Pitching',
    tagline: 'ความแตกต่างจะพาเราเติบโต',
    steps: ['เลือกเลข 1–10', 'คิดไอเดียที่น่าสนใจ เป็นไปได้ และสร้างสรรค์', 'Pitch ให้ได้ Bingo!'],
  },
};
