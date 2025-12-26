import Image from "next/image";

  export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-stone-100">
      <h1 className="text-6xl font-bold text-stone-800">
        Aaron & SAVEA's Wedding (Because who else would it be?)
      </h1>
      <p className="mt-4 text-xl text-stone-600">
        October 2025 • Save the Date
      </p>

      <button className="mt-8 px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-700 transition">
        RSVP Now
      </button>
    </main>
  );
}