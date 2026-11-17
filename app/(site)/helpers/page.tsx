import { redirect } from "next/navigation";
import { cardsOn, helpersHref } from "@/components/helpers/cards";

/** `/helpers` is the navbar's link; it opens the open page's first tab. */
export default function HelpersPage() {
  redirect(helpersHref(null, { card: cardsOn(null)[0].id }));
}
