import type { FaceIndex } from "./faces";
import { CIRCLES, PEOPLE } from "./people";
import { Portrait } from "./Portrait";

/** Everyone in who's who, a circle at a time: us, each family, each set of
    friends. Prints as a contact sheet. */
export function FaceAlbum({ faces }: { faces: FaceIndex }) {
  return (
    <div className="mt-6">
      <p className="font-garamond text-lg leading-relaxed text-foreground/90">
        So you can put a face to every name on the shot list.
      </p>

      <div className="mt-10 space-y-12">
        {CIRCLES.map((circle) => (
          <section key={circle.id} aria-labelledby={`faces-${circle.id}`}>
            <h3
              id={`faces-${circle.id}`}
              className="font-garamond text-2xl text-foreground"
            >
              {circle.title}
            </h3>
            <ul className="mt-4 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 md:grid-cols-5">
              {PEOPLE.filter((p) => p.circle === circle.id).map((person) => {
                const face = faces[person.id];
                return (
                  <li key={person.id} className="break-inside-avoid">
                    <figure>
                      <Portrait
                        face={face}
                        className="aspect-[3/4] w-full rounded-md text-4xl"
                      />
                      <figcaption className="mt-2">
                        <p className="font-garamond text-lg leading-tight text-foreground">
                          {face.name}
                        </p>
                        {face.tags.length > 0 && (
                          <p className="mt-0.5 font-raleway text-xs leading-snug text-muted-foreground">
                            {face.tags.join(", ")}
                          </p>
                        )}
                      </figcaption>
                    </figure>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
