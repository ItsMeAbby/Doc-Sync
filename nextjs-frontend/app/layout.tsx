import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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
  title: "Doc-Sync - AI-Powered Documentation Updates",
  description: "Keep your documentation up-to-date with AI-powered suggestions and automatic updates",
};

import Link from "next/link";
import { FaBook, FaHome } from "react-icons/fa";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`}>
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-4 py-3">
            <nav className="flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white">
                <span className="bg-blue-100 dark:bg-blue-900 p-1 rounded">
                  <FaBook className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </span>
                Doc-Sync
              </Link>
              <div className="flex items-center gap-6">
                <Link href="/" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  <FaHome className="w-4 h-4" />
                  Home
                </Link>
                <Link href="/documentation" className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400">
                  <FaBook className="w-4 h-4" />
                  Documentation
                </Link>
              </div>
            </nav>
          </div>
        </header>
        <main className="flex-grow">
          {children}
        </main>
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="container mx-auto px-4 text-center text-sm text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Doc-Sync - AI-Powered Documentation Updates
          </div>
        </footer>
      </body>
    </html>
  );
}
