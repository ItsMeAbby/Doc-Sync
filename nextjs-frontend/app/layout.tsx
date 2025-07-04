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
  description:
    "Keep your documentation up-to-date with AI-powered suggestions and automatic updates",
};

import Link from "next/link";
import { FaBook, FaHome, FaPlus, FaLightbulb } from "react-icons/fa";
import { Toaster } from "@/components/ui/toaster";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen flex flex-col`}
      >
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto px-2 sm:px-4 py-3">
            <nav className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-0">
              <Link
                href="/"
                className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-white"
              >
                <svg
                  width="28"
                  height="28"
                  viewBox="0 0 32 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="16" cy="16" r="16" fill="#2563eb" />
                  <path
                    d="M9 7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10l4-4V8a1 1 0 0 0-1-1H9z"
                    fill="white"
                  />
                  <path d="M19 20v3l3-3h-3z" fill="#2563eb" />
                  <path
                    d="M11 12h6m-6 2h4m-4 2h5"
                    stroke="#2563eb"
                    strokeWidth="1"
                    strokeLinecap="round"
                  />
                  <g transform="translate(20, 4)">
                    <circle
                      cx="4"
                      cy="4"
                      r="4"
                      fill="#10b981"
                      stroke="white"
                      strokeWidth="1"
                    />
                    <path
                      d="M2 4l1.5 1.5L6 2.5"
                      stroke="white"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </svg>
                Doc-Sync
              </Link>
              <div className="flex items-center gap-2 sm:gap-4">
                <Link
                  href="/"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <FaHome className="w-3 sm:w-4 h-3 sm:h-4" />
                  <span className="hidden sm:inline">Home</span>
                </Link>
                <Link
                  href="/documentation"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  <FaBook className="w-3 sm:w-4 h-3 sm:h-4" />
                  <span className="hidden sm:inline">Documentation</span>
                </Link>
                <div className="h-4 w-px bg-gray-300 dark:bg-gray-600"></div>
                <Link
                  href="/create-document"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
                >
                  <FaPlus className="w-3 sm:w-4 h-3 sm:h-4" />
                  Create
                </Link>
                <Link
                  href="/documentation-change"
                  className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors"
                >
                  <FaLightbulb className="w-3 sm:w-4 h-3 sm:h-4" />
                  Change
                </Link>
              </div>
            </nav>
          </div>
        </header>
        <main className="flex-grow">{children}</main>
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="container mx-auto px-2 sm:px-4 text-center text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            &copy; {new Date().getFullYear()} Doc-Sync - AI-Powered
            Documentation Updates
          </div>
        </footer>
        <Toaster />
      </body>
    </html>
  );
}
