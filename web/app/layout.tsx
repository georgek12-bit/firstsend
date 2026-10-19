import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono, Instrument_Serif } from 'next/font/google';
import { BRAND } from '@/lib/content';
import './globals.css';

const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--font-serif' });
const sans = Geist({ weight: ['400', '500', '600'], subsets: ['latin'], variable: '--font-sans' });
const mono = Geist_Mono({ weight: ['400', '500'], subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: `${BRAND} | Cold email infrastructure for new agencies`,
  description:
    'Pick how many emails a day you want to send. We set up the inboxes, domains and warmup. You send the same day. No sales call, no 400-inbox minimum.',
};

export const viewport: Viewport = {
  themeColor: '#f8f4ec',
};

// Runs before first paint so reveal elements start hidden instead of flashing in.
const motionScript = `if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('motion')`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: motionScript }} />
      </head>
      <body>
        {children}
        {/* Cloudflare Web Analytics: cookie-free page views, including in-app navigation. */}
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "c4652d126a6e47348c7e6439b2b931d4", "spa": true}' />
      </body>
    </html>
  );
}
