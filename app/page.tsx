import { Corinthia } from "next/font/google";
import RsvpModal from "@/components/rsvp/RsvpModal";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const corinthia = Corinthia({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-corinthia",
});

  export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-stone-100">
      <h1 className={`${corinthia.variable} text-6xl font-corinthia text-stone-800`}>
        <div>Aaron</div>
        <div className="text-center">&</div>
        <div>Savea</div>
      </h1>
      <p>
        (Because who else would it be?)
      </p>
      <p className="mt-4 text-xl text-stone-600">
        12 ·  01 · 2025
      </p>

      <RsvpModal />
    </main>
  );
}