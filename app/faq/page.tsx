import { getFaqs } from "../actions/faq";
import FaqAccordion from "@/components/faq/FaqAccordion";

export default async function FaqPage() {

  const { data, error } = await getFaqs();

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 pt-40 pb-24">
      <header className="mb-16 text-center md:mb-24">
        <p className="font-raleway text-xs uppercase tracking-[0.3em] text-primary">
          Frequently Asked
        </p>
        <h1 className="mt-3 font-corinthia text-7xl text-pop md:text-8xl">
          Good To Know
        </h1>
        <p className="mx-auto mt-4 max-w-xl font-garamond text-xl italic text-muted-foreground md:text-2xl">
          Everything we're hoping to avoid texts about.
        </p>
      </header>

        {error ? (
          <p className="text-muted-foreground">
            Welp. Something went wrong. Please text me.
          </p>
        ) : (
          <FaqAccordion items={data ?? []} />
        )}
    </main>
  );
}
