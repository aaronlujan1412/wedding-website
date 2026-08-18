import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { dietaryLabels } from "@/components/rsvp/types";
import { StatusMark, DetailLine } from "./LedgerParts";
import { telHref, type GroupBundle, type RsvpGuest } from "./summarize";

function GuestEntry({ guest }: { guest: RsvpGuest }) {
  const dietary =
    guest.dietary_type && guest.dietary_type !== "none"
      ? guest.dietary_type
      : null;

  return (
    <li className="flex gap-3 border-b border-border/60 py-4 last:border-b-0 last:pb-0">
      <span className="pt-1">
        <StatusMark attending={guest.attending} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <p className="font-garamond text-lg text-foreground">{guest.name}</p>
          <a
            href={telHref(guest.contact_number)}
            className="rounded-sm font-mono text-xs tabular-nums slashed-zero text-muted-foreground underline-offset-4 transition-colors hover:text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {guest.contact_number}
          </a>
        </div>

        {guest.plus_one_name && (
          <p className="mt-0.5 font-garamond text-base text-muted-foreground">
            bringing {guest.plus_one_name}
          </p>
        )}

        {(dietary || guest.song_request || guest.notes) && (
          <dl className="mt-3 space-y-2">
            {dietary && (
              <DetailLine label={dietaryLabels[dietary]}>
                {(guest.dietary_details ?? []).join(", ") || "Not specified"}
              </DetailLine>
            )}
            {guest.song_request && (
              <DetailLine label="Song">{guest.song_request}</DetailLine>
            )}
            {guest.notes && (
              <DetailLine label="Note">{guest.notes}</DetailLine>
            )}
          </dl>
        )}
      </div>
    </li>
  );
}

/**
 * Only the halves that carry information. A group nobody has answered for
 * reads "5 to reply", not "0 coming · 5 to reply".
 */
function summaryParts(group: GroupBundle) {
  const parts: { text: string; tone: string }[] = [];
  if (group.coming > 0) {
    parts.push({ text: `${group.coming} coming`, tone: "text-primary" });
  }
  if (group.awaiting > 0) {
    parts.push({
      text: `${group.awaiting} to reply`,
      tone: "text-muted-foreground",
    });
  }
  if (parts.length === 0) {
    parts.push({ text: "none coming", tone: "text-muted-foreground" });
  }
  return parts;
}

export function GroupPanel({ group }: { group: GroupBundle }) {
  return (
    <AccordionItem
      value={group.key}
      className="border-b border-border last:border-b-0"
    >
      <AccordionTrigger className="gap-4 py-5 hover:no-underline">
        <span className="flex flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-garamond text-xl text-foreground">
            {group.name}
          </span>
          <span className="font-mono text-xs tabular-nums slashed-zero">
            {summaryParts(group).map((part, index) => (
              <span key={part.text} className={part.tone}>
                {index > 0 && " · "}
                {part.text}
              </span>
            ))}
          </span>
        </span>
      </AccordionTrigger>

      <AccordionContent className="pb-6">
        {group.address && (
          <p className="mb-3 font-garamond text-sm text-muted-foreground">
            {group.address}
          </p>
        )}
        <ul>
          {group.members.map((guest) => (
            <GuestEntry key={guest.id} guest={guest} />
          ))}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
}
