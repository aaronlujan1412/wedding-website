import { redirect } from "next/navigation";

/**
 * The write-up used to live here and the tool at /me/brain. They are one page
 * now — signed out it is this essay, signed in it is the thing it describes —
 * so this address forwards rather than 404ing anyone holding the old link.
 */
export default function SecondBrainRedirect() {
  redirect("/me/brain");
}
