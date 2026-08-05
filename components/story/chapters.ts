export type Chapter = {
  label: string;
  title: string;
  body: string;
  direction: "left" | "right";
  isLast?: boolean;
  photo?: { src: string; alt: string; caption: string };
};

export const chapters: Chapter[] = [
  {
    label: "Salt Lake City · Halloween",
    title: "Green Paint & Good Timing",
    direction: "right",
    body: "The story of Savea and Aaron began in the colorful, loud chaos of a Halloween rave, an event neither of them either expected to ever attend. With mutual friends, they had dressed up as the Teen Titans—Savea as Raven, and Aaron as Beast Boy. Before the night even truly began, Savea was tasked with transforming Aaron’s face with the goopiest green paint they had ever seen. As they leaned in close, struggling to make the disastrous makeup work, a quiet bubble seemed to form around them. They couldn’t stop laughing. It was messy, entirely unexpected, and the perfect, beautiful beginning to their forever.",
    photo: {
      src: "/media/RavenAndBeastboy.jpg",
      alt: "Aaron and Savea being silly at Christmas",
      caption: "Savea is a true makeup artist",
    },
  },
  {
    label: "The real beginning",
    title: "The Second Night",
    direction: "left",
    body: "Their first night out was a blur of missed signals, and they ended up parting ways early. Yet, in the quiet that followed, neither could shake the magnetic pull they felt toward one another. Determined not to let the connection slip away, they met up the following evening, and everything fell perfectly into place. Aaron tenderly explained that his initial hesitation was born out of a desire to be a perfect gentleman, while Savea’s heart soared to know the profound attraction was entirely mutual. Later, as they danced, the rest of the room seemed to fade away. He reached out and gently took her hand. For both of them, the sparks were undeniable—a sudden, electric rush that told them nothing would ever be the same.",
    photo: {
      src: "/media/RaveLove.jpg",
      alt: "Aaron and Savea being silly at Christmas",
      caption: "Aaron is a true makeup artist ;)",
    },
  },
  {
    label: "Utah ⇄ Washington",
    title: "Five-Page Texts",
    direction: "right",
    body: "At the time, Savea was living in Washington and only visiting Utah for the weekend. After that spark, they stretched her trip to the absolute limit, savoring every stolen second together. When Savea finally had to fly home, the physical miles between them vanished into endless, five-page text messages and late-night FaceTimes as they eagerly bared their souls to one another. It wasn’t long before Aaron, driven by a heart that couldn’t bear the distance, took a massive leap of faith. He boarded an airplane for the very first time in his life just to be by her side.",
    photo: {
      src: "/media/LongDistance.jpg",
      alt: "Aaron and Savea video calling",
      caption: "Savea. Charge your phone so I can talk to you longer",
    },
  },
  {
    label: "Seattle · Vancouver",
    title: "The Week We Fell",
    direction: "left",
    body: "That week in Washington was pure magic; it was the week they fell deeply and irrevocably in love. They gathered fresh pizza ingredients at Pike Place Market, built cozy pillow forts, skated hand-in-hand across the ice in Vancouver, Savea serenaded him with a song on her ukulele and Aaron belted out the entire 12 Days of Christmas under the Seattle streetlights. But true devotion is often found in the most unglamorous moments. When Toby brought fleas back from daycare, Savea’s apartment unexpectedly needed to be bug-bombed, Aaron didn’t hesitate. Without a single complaint, he jumped right into the chaos. Together, they stripped beds, washed linens, and bravely bathed a deeply unenthusiastic cat. Tackling the absurd mess side-by-side, they looked at each other and simply knew: they had found their partner in everything.",
    photo: {
      src: "/media/ChristmasLove.jpg",
      alt: "Aaron and Savea being silly at Christmas",
      caption:
        "Mariah Carey would be prould. All I want for Christmas is you, Savea",
    },
  },
  {
    label: "Salt Lake City",
    title: "Building a Home",
    direction: "right",
    body: "Unable to imagine a life apart, Savea moved to Salt Lake City just a few months later. They moved in together shortly after and have been inseparable ever since. Today, their lives are beautifully intertwined. They work side-by-side, sharing quiet mornings, late-night video games, and the shared triumph of their DIY projects. At the very heart of their world is their eleven-year-old son, Daniel. The boundless love they share for him anchors their family and makes their home complete.",
    photo: {
      src: "/media/FamilyTogether.jpg",
      alt: "Aaron and Savea hugging in a forest",
      caption: "Inseparable ever since",
    },
  },
  {
    label: "X marks the spot",
    title: "Granny’s Apple Tree",
    direction: "right",
    isLast: true,
    body: "When it was time to promise forever, Aaron planned a proposal as thoughtful as his love for her. He created a custom map, guiding Savea on a scavenger hunt to a few of the locations that meant the most to their love story. The journey ended right in front of Granny’s apple tree. There, standing in a place deeply rooted in family and history, he asked her to marry him—securing a lifetime of shared laughter, unwavering teamwork, and that same, undeniable electric touch.",
    photo: {
      src: "/media/UnderTheAppleTree.jpg",
      alt: "Aaron proposing to Savea at Granny’s apple tree",
      caption: "Only the strongest of roots",
    },
  },
];
