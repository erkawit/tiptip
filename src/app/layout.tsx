import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'TipTip — LiveStream Donation & Alert Notification Platform',
  description: 'Precision LiveStream Alert and Donation Platform for modern creators. Deep Forest & Emerald aesthetic, zero-latency OBS browser source alerts, Stripe, PromptPay & TrueMoney integration.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-obsidian-950 text-slate-100 antialiased selection:bg-neon-500 selection:text-obsidian-950">
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
