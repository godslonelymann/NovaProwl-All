import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "../components/SessionStore";

   const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "NovaProwl",
  description: "NovaProwl - AI Analytics made easy!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={inter.className}
      >
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
