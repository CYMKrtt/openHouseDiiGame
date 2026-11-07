import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'A Little World of Companies', description: 'A little workshop world' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th"><body>{children}</body></html>;
}
