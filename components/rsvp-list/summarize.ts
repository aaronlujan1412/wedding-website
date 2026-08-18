import type { Guest, GuestGroup, DietaryType } from "@/components/rsvp/types";

/** The columns `getAllGuestRsvps` selects. */
export type RsvpGuest = Pick<
  Guest,
  | "id"
  | "name"
  | "attending"
  | "plus_one_name"
  | "group_id"
  | "dietary_type"
  | "dietary_details"
  | "song_request"
  | "notes"
  | "contact_number"
>;

export type GroupBundle = {
  key: string;
  name: string;
  address: string | null;
  members: RsvpGuest[];
  /** Attending members plus the guests they're bringing. */
  coming: number;
  awaiting: number;
};

export type DietaryTally = { label: string; count: number };

export type SongRequest = { id: number; name: string; request: string };

export type Ledger = {
  invited: number;
  attending: number;
  declined: number;
  awaiting: number;
  plusOnes: number;
  headcount: number;
  groups: GroupBundle[];
  restrictions: DietaryTally[];
  preferences: DietaryTally[];
  songs: SongRequest[];
};

const isComing = (guest: RsvpGuest) => guest.attending === true;
const hasDeclined = (guest: RsvpGuest) => guest.attending === false;
const isAwaiting = (guest: RsvpGuest) => guest.attending === null;

/** A plus-one is only a head if the guest bringing them is actually coming. */
const bringsAGuest = (guest: RsvpGuest) =>
  isComing(guest) && Boolean(guest.plus_one_name?.trim());

export function formatAddress(group: GuestGroup | undefined) {
  if (!group) return null;
  const cityState = [group.address_city?.trim(), group.address_state?.trim()]
    .filter(Boolean)
    .join(", ");
  return (
    [
      group.address_street?.trim(),
      [cityState, group.address_zip?.trim()].filter(Boolean).join(" "),
    ]
      .filter(Boolean)
      .join(" · ") || null
  );
}

/** Strips formatting so the number is dialable from a `tel:` link. */
export function telHref(contactNumber: string) {
  return `tel:${contactNumber.replace(/[^\d+]/g, "")}`;
}

function tallyDietary(
  guests: RsvpGuest[],
  type: DietaryType,
): DietaryTally[] {
  const counts = new Map<string, number>();
  for (const guest of guests) {
    if (guest.dietary_type !== type) continue;
    for (const detail of guest.dietary_details ?? []) {
      const label = detail.trim();
      if (!label) continue;
      counts.set(label, (counts.get(label) ?? 0) + 1);
    }
  }
  return Array.from(counts, ([label, count]) => ({ label, count })).sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label),
  );
}

export function summarize(
  guests: RsvpGuest[],
  groups: GuestGroup[],
): Ledger {
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const byGroup = new Map<number | null, RsvpGuest[]>();
  for (const guest of guests) {
    const members = byGroup.get(guest.group_id) ?? [];
    members.push(guest);
    byGroup.set(guest.group_id, members);
  }

  const bundles: GroupBundle[] = Array.from(byGroup, ([groupId, members]) => {
    const group = groupId === null ? undefined : groupById.get(groupId);
    return {
      key: String(groupId ?? "ungrouped"),
      name:
        groupId === null ? "No group" : (group?.name ?? `Group ${groupId}`),
      address: formatAddress(group),
      members,
      coming: members.filter(isComing).length + members.filter(bringsAGuest).length,
      awaiting: members.filter(isAwaiting).length,
    };
  });

  // Groups still owing a reply float to the top — biggest gaps first. That's
  // the only ordering that matches what this page is actually used for.
  bundles.sort(
    (a, b) => b.awaiting - a.awaiting || a.name.localeCompare(b.name),
  );

  const attending = guests.filter(isComing).length;
  const plusOnes = guests.filter(bringsAGuest).length;
  const comingGuests = guests.filter(isComing);

  return {
    invited: guests.length,
    attending,
    declined: guests.filter(hasDeclined).length,
    awaiting: guests.filter(isAwaiting).length,
    plusOnes,
    headcount: attending + plusOnes,
    groups: bundles,
    // Only the people actually at the table matter to the kitchen.
    restrictions: tallyDietary(comingGuests, "restriction"),
    preferences: tallyDietary(comingGuests, "preference"),
    songs: guests
      .filter((guest) => guest.song_request?.trim())
      .map((guest) => ({
        id: guest.id,
        name: guest.name,
        request: guest.song_request!.trim(),
      })),
  };
}
