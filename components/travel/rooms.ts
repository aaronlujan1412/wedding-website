export type Room = {
  name: string;
  icon: string;
  traditional: string;
  bunks?: string;
  assignedTo: string;
};

export const rooms: Room[] = [
  {
    name: "The Moose Room",
    icon: "🫎",
    traditional: "1 Queen bed",
    bunks: "1 bunk bed",
    assignedTo: "The Hull Family",
  },
  {
    name: "The Bear Room",
    icon: "🐻",
    traditional: "1 Queen bed",
    bunks: "3 bunk beds",
    assignedTo: "The Miller Family",
  },
  {
    name: "The Fishing Room",
    icon: "🎣",
    traditional: "1 Queen bed",
    bunks: "3 bunk beds",
    assignedTo: "The Lujan Family",
  },
  {
    name: "The Cabin Room",
    icon: "🛖",
    traditional: "1 Queen + 1 Double bed",
    bunks: "5 bunk beds",
    assignedTo: "The Sandidge Family",
  },
];
