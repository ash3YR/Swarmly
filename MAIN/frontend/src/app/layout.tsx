import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Swarmly — No-Code LangGraph Builder',
  description: 'Build LangGraph agents visually',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-zinc-950 text-zinc-50 antialiased">
        {children}
      </body>
    </html>
  );
}
