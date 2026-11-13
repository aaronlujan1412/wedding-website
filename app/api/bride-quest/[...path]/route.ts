import { partyGameRoutes } from "@/lib/party-games";

/** Bride Quest's live state, saved edits and proof photos. See `lib/party-games.ts`. */
export const dynamic = "force-dynamic";

export const { GET, HEAD, PUT, POST, DELETE } = partyGameRoutes("bride-quest");
