import type { Metadata } from "next";
import { Geist, Geist_Mono, Corinthia } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const corinthia = Corinthia({
  variable: "--font-corinthia",
  weight: ["400"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Savea and Aaron's Wedding",
  description: "We're the cooliest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${corinthia.variable} antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
