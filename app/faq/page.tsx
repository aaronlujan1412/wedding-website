import { getFaqs } from "../actions/faq";
import FaqAccordion from "@/components/faq/FaqAccordion";

export default async function FaqPage() {

  const { data, error } = await getFaqs();

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 pt-40 pb-24">
      <div className="grid gap-12 md:grid-cols-[2fr_3fr]">
        <header className="self-start md:sticky md:top-40">
          <p className="text-xs uppercase tracking-[0.3em] text-primary">
            Frequently Asked
          </p>
          <p className="mt-3 font-corinthia text-6xl text-pop">Good to know</p>
          <p className="mt-4 text-muted-foreground">
            Everything you're too polite to text us about.
          </p>
        </header>

        {error ? (
          <p className="text-muted-foreground">
            Welp. Something went wrong. Please text me.
          </p>
        ) : (
          <FaqAccordion items={data ?? []} />
        )}
      </div>
    </main>
  );
}
