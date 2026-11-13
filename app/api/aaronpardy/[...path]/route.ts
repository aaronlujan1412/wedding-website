import { partyGameRoutes } from "@/lib/party-games";

/** Aaronpardy's saved edits and videos. See `lib/party-games.ts`. */
export const dynamic = "force-dynamic";

export const { GET, HEAD, PUT, POST, DELETE } = partyGameRoutes("aaronpardy");
