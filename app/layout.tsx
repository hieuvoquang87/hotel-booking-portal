import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { Icon } from '@/components/Icon';
import { AppProvider } from '@/stores/AppProvider';
import { QueryProvider } from '@/stores/QueryProvider';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: { default: 'Stayfinder — Find your stay', template: '%s · Stayfinder' },
  description: 'Find your stay — browse hotels by destination.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-slate-50">
        <QueryProvider>
          <AppProvider>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow"
            >
              Skip to content
            </a>
            <header className="sticky top-0 z-40 h-14 border-b border-slate-200 bg-white/95 backdrop-blur md:h-16">
              <div className="mx-auto flex h-full max-w-7xl items-center px-4 md:px-6 lg:px-8">
                <span className="flex items-center gap-2 text-lg font-bold text-slate-900">
                  <Icon name="pin" size={22} className="text-blue-600" /> Stayfinder
                </span>
              </div>
            </header>
            <main id="main" className="flex-1">
              {children}
            </main>
            <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
              Stayfinder · Phase 1
            </footer>
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
