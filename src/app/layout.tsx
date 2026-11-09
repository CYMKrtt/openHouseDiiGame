import type { Metadata } from 'next';
import { Bai_Jamjuree, IBM_Plex_Sans_Thai_Looped, Silkscreen } from 'next/font/google';

// Nextopia type: Bai Jamjuree for headings, looped Plex Thai for easy reading, Silkscreen for pixel labels.
const display = Bai_Jamjuree({ weight: ['500', '600', '700'], subsets: ['thai', 'latin'], variable: '--nx-font-display', display: 'swap' });
const body = IBM_Plex_Sans_Thai_Looped({ weight: ['400', '500', '600', '700'], subsets: ['thai', 'latin'], variable: '--nx-font-body', display: 'swap' });
const pixel = Silkscreen({ weight: ['400', '700'], subsets: ['latin'], variable: '--nx-font-pixel', display: 'swap' });

export const metadata: Metadata = { title: 'Nextopia | A Little World of Companies', description: 'CAMT DII Open House: find your company in Nextopia' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="th" className={`${display.variable} ${body.variable} ${pixel.variable}`}><body>{children}</body></html>;
}
