import { Corinthia } from "next/font/google";

const corinthia = Corinthia({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-corinthia",
});

  export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-stone-100">
      <h1 className={`${corinthia.variable} text-6xl font-corinthia text-stone-800`}>
        Aaron & Savea's Wedding
      </h1>
      <p>
        (Because who else would it be?)
      </p>
      <p className="mt-4 text-xl text-stone-600">
        October 2025 • Save the Date
      </p>

      <button className="mt-8 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition">
        RSVP Now
      </button>
    </main>
  );
}