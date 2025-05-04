import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { NextAuthProvider } from '../components/providers/NextAuthProvider'
import UserMenu from '../components/UserMenu'

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cards on the Go",
  description: "Find and collect trading cards near you",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <NextAuthProvider>
          <div className="min-h-screen">
            <header className="bg-white shadow-sm">
              <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16">
                  <div className="flex items-center">
                    <a href="/" className="text-xl font-bold text-gray-900">
                      Cards on the Go
                    </a>
                  </div>
                  <UserMenu />
                </div>
              </nav>
            </header>
            <main>{children}</main>
          </div>
        </NextAuthProvider>
      </body>
    </html>
  );
}
