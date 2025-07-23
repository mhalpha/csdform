// src/app/layout.tsx
import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import 'react-toastify/dist/ReactToastify.css';
import Header from "@/components/Header";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Cardiac Services Directory",
  description: "This directory presents information on cardiac rehab programs offered across Australia.",
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon1.webp', type: 'image/png' },
    ]}
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-gray-50">
          <div className="flex flex-col min-h-screen">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <footer className="py-4 px-6 bg-white border-t border-gray-200 text-sm text-gray-600">
              <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
                <div className="mb-2 md:mb-0">
                  Heart Foundation is a registered charity
                </div>
                <div>
                  © 2025 National Heart Foundation of Australia ABN 98 008 419 761
                </div>
              </div>
            </footer>
          </div>
      </body>
    </html>
  );
}