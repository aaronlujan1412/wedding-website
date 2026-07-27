export type ScheduleItem = {
  time: string;
  icon: string;
  title: string;
  body: string;
  note?: { title: string; body: string };
};

export const schedule: ScheduleItem[] = [
  {
    time: "3:00 PM",
    icon: "☕",
    title: "Warm Welcomes & Cocoa",
    body: "As you arrive at the lodge, shake off the cold and step into the warmth. We’ll kick things off with a cozy hot cocoa hour inside to get everyone settled.",
  },
  {
    time: "4:15 PM",
    icon: "💍",
    title: "The Ceremony",
    body: "Beneath the crisp winter sky, at the main entrance of the lodge, we’ll exchange our vows. This moment means everything to us — we’re not only joining together as husband and wife, but officially uniting our hearts as a family with our wonderful son, Daniel.",
    note: {
      title: "A Cozy Alternative",
      body: "Prefer to stay toasty? You’re welcome to watch from inside — the ceremony will be live-streamed on a projector right next to the fireplace.",
    },
  },
  {
    time: "5:00 – 9:00 PM",
    icon: "🍲",
    title: "Dinner & Dancing",
    body: "After the “I dos,” join us inside for an intimate, home-cooked reception. We’re pouring our hearts into a menu of our favorite winter comfort foods — including warm chili in sourdough bread bowls — cooked with love by us (but let’s be honest, mostly Aaron!).",
  },
];
