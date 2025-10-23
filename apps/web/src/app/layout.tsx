import './globals.css';
import { Inter } from 'next/font/google';
import React from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'WinCVEx',
  description: 'Training‑only cyber lab',
};

// RootLayout wraps all pages in the application.  It applies a full
// height background and font.  Note that the body uses Tailwind
// classes defined in globals.css and tailwind.config.js.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} h-full bg-primary text-white overflow-hidden`}
      >
        {children}
      </body>
    </html>
  );
}