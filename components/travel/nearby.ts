export type Attraction = {
  icon: string;
  title: string;
  description: string;
};

export const attractions: Attraction[] = [
  {
    icon: "☕",
    title: "Grab a Coffee",
    description:
      "The Corner Station in Fairview pours great coffee and warm food inside a historic 1921 gas station. A few minutes south, The Coffee Depot in Mount Pleasant is another favorite.",
  },
  {
    icon: "🏂",
    title: "Explore Skyline Drive",
    description:
      "Highway 31 climbs straight out of Fairview Canyon into Skyline Drive — a world-famous winter destination for snowmobiling and snowkiting.",
  },
  {
    icon: "🦣",
    title: "See a Real Mammoth",
    description:
      "The Fairview Museum of History and Art is free to visit and home to a nearly complete Columbian mammoth skeleton unearthed right nearby.",
  },
];
