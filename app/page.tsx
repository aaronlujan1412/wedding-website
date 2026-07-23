import RsvpModal from "@/components/rsvp/RsvpModal";
import Image from "next/image";
import { getAllGuestGroups } from "./actions/rsvp";
export const dynamic = "force-dynamic";

export default async function Home() {
  const { data } = await getAllGuestGroups();

  return (
    <main className="flex flex-col">
      <div className="relative w-full h-screen">
        <Image
          src={"/media/HuggingInForest.jpg"}
          fill
          className="object-cover"
          alt="Aaron and Savea in a forest"
        ></Image>
        <div className="absolute inset-0 bg-linear-to-b from-black/50 to-transparent" />
      </div>
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <h1 className="text-6xl font-corinthia text-stone-800">
          <div>Aaron</div>
          <div className="text-center">&</div>
          <div>Savea</div>
        </h1>
        <p>(Because who else would it be?)</p>
        <p className="mt-4 text-xl text-stone-600">12 · 01 · 2026</p>

        <RsvpModal guestGroups={data ?? []} />
      </div>
    </main>
  );
}
