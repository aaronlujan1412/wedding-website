import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Faq } from "./types";

type Props = {
  items: Faq[];
};

export default function FaqAccordion({ items }: Props) {
  return (
    <Accordion type="single" collapsible className="w-full font-raleway">
      {items.map((faq) => (
        <AccordionItem key={faq.id} value={String(faq.id)}>
          <AccordionTrigger className="font-garamond text-xl text-primary hover:no-underline">
            {faq.question}
          </AccordionTrigger>

          <AccordionContent>
            {faq.aaron_take ? (
              <>
                <p className="text-base italic text-pop2">
                  {faq.aaron_take}
                  <span className="text-sm not-italic text-muted-foreground">
                    {" "}
                    - Aaron
                  </span>
                </p>

                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.25em] text-primary">
                  Translation
                </p>

                <p className="mt-1 text-base text-foreground">
                  {faq.translation}
                </p>
              </>
            ) : (
              <p className="text-base text-foreground">{faq.translation}</p>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
