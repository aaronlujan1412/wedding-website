export type PartyMember = {
  name: string;
  role: string;
  relationship?: string;
};

export const weddingParty: PartyMember[] = [
  { name: "Brenna", role: "Maid of Honor", relationship: "Savea’s sister" },
  { name: "Easton", role: "Best Man", relationship: "Aaron’s brother" },
  { name: "Alaysha", role: "Wombsman", relationship: "Aaron’s sister" },
  { name: "Adrian", role: "Officiant", relationship: "Best friend" },
];
