import "./globals.css";
import type { Metadata } from "next";
import {
  Geist,
  Geist_Mono,
  Corinthia,
  Cormorant_Garamond,
  Dela_Gothic_One,
  DotGothic16,
  Raleway,
} from "next/font/google";

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
  // 500/600 are for the honeymoon board, where card titles need to hold their
  // own at small sizes; the rest of the site still uses 400.
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

/**
 * The Ring's two faces, and nowhere else on the site.
 *
 * Dela Gothic is the chunky Japanese poster face that every anime title and
 * every arcade cabinet is set in; DotGothic16 is a pixel face for the HUD, so
 * the score, the clock and the combo counter read as a game rather than as a
 * planner that has had colours thrown at it.
 *
 * Latin subsets only. Both families cover kana as well, and both are megabytes
 * if you ask for it -- the Japanese on that tab is set in the system gothic
 * stack (`--font-jp-gothic`) instead, which is what manga lettering looks like
 * anyway once it has an outline on it.
 */
const delaGothic = Dela_Gothic_One({
  variable: "--font-dela",
  weight: ["400"],
  subsets: ["latin"],
});

const dotGothic = DotGothic16({
  variable: "--font-dot",
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
    <html lang="en" className="scroll-smooth">
      <meta name="apple-mobile-web-app-title" content="Hallelujan" />
      <body
        className={`
          ${geistSans.variable} 
          ${geistMono.variable} 
          ${corinthia.variable} 
          ${raleway.variable} 
          ${cormorantGaramond.variable}
          ${delaGothic.variable}
          ${dotGothic.variable} 
          antialiased`}
      >
        {/* Chrome belongs to each section's layout: the guest site's navbar,
            footer and RSVP modal live in app/(site)/layout.tsx, and the
            honeymoon planner draws its own bar. */}
        {children}
      </body>
    </html>
  );
}
