import "server-only";

import { supabase } from "@/lib/supabase";
import { PEOPLE, type PersonId } from "./people";

/** Private: nothing in it has a public URL, only short-lived signed ones. */
export const FACES_BUCKET = "helper-faces";

/**
 * Seconds: twelve hours. Long enough that a page opened at noon still loads
 * the album when someone scrolls to it at five. A reload signs them afresh.
 */
const SIGNED_FOR = 60 * 60 * 12;

/** A person as the page draws them. `src` is null when there's no photo
    for them in the bucket yet. */
export type Face = {
  name: string;
  tags: readonly string[];
  src: string | null;
};

export type FaceIndex = Record<PersonId, Face>;

/** Everyone in who's who, with a signed URL for each photo there is. Check
    `hasHelperAccess` first: this hands out the photos. */
export async function loadFaces(): Promise<FaceIndex> {
  const { data } = await supabase.storage
    .from(FACES_BUCKET)
    .createSignedUrls(
      PEOPLE.map((person) => `${person.id}.webp`),
      SIGNED_FOR,
    );

  // One result per path, in order. A missing photo comes back with an error
  // rather than failing the batch, and draws as the person's initial.
  const signed = new Map(
    (data ?? []).flatMap((item) =>
      item.path && !item.error && item.signedUrl
        ? [[item.path, item.signedUrl] as const]
        : [],
    ),
  );

  const faces = {} as FaceIndex;
  for (const person of PEOPLE) {
    faces[person.id] = {
      name: person.name,
      tags: "tags" in person ? person.tags : [],
      src: signed.get(`${person.id}.webp`) ?? null,
    };
  }
  return faces;
}
