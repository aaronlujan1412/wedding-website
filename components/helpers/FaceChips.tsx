import type { FaceIndex } from "./faces";
import type { PersonId } from "./people";
import { Portrait } from "./Portrait";

/** The faces under a shot, so "Savea’s mom, Mike, Connor…" is people you
    can pick out of a room rather than names you have to ask about. */
export function FaceChips({
  people,
  faces,
}: {
  people: PersonId[];
  faces: FaceIndex;
}) {
  return (
    <ul aria-label="Who’s in it" className="mt-1.5 mb-1 flex flex-wrap gap-1.5">
      {people.map((id) => {
        const face = faces[id];
        return (
          <li
            key={id}
            className="inline-flex items-center gap-1.5 rounded-full bg-secondary py-0.5 pr-2.5 pl-0.5 font-raleway text-xs text-foreground/80"
          >
            <Portrait face={face} className="size-8 rounded-full text-xs" />
            {face.name}
          </li>
        );
      })}
    </ul>
  );
}
