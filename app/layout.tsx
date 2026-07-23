import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Corinthia,
  Cormorant_Garamond,
  Raleway,
} from "next/font/google";
import { Navbar } from "@/components/NavBar/NavBar";

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

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-garamond",
  weight: ["400"],
  subsets: ["latin"],
});

const raleway = Raleway({
  variable: "--font-raleway",
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
      <meta name="apple-mobile-web-app-title" content="Hallelujan" />
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${corinthia.variable} 
          ${raleway.variable} 
          ${cormorantGaramond.variable} 
          antialiased`}
      >
        <Navbar />
        {children}
      </body>
    </html>
  );
}
