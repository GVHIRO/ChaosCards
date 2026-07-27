export const RARITY_RANK = {
  Common: 0,
  Rare: 1,
  Epic: 2,
  Legend: 3,
};

const packs = [
  {
    id: "chaos-basic-pack",

    name: "CHAOS BASIC PACK",

    japaneseName:
      "カオス・ベーシックパック",

    icon: "🎁",

    price: 100,

    cardCount: 5,

    guaranteedRarity: "Rare",

    pityEpicAfter: 10,

    description:
      "5枚入り。最後の1枚はRare以上確定。",

    odds: {
      Common: 70,
      Rare: 23,
      Epic: 6,
      Legend: 1,
    },
  },
];

export const BASIC_PACK = packs[0];

export default packs;