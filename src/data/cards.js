const cards = [
  // =========================
  // Common：攻撃
  // =========================
  {
    id: 1,
    name: "こぶし",
    emoji: "👊",
    type: "attack",
    damage: 3,
    rarity: "Common",
    cost: 1,
    description: "相手に3ダメージ"
  },
  {
    id: 2,
    name: "石投げ",
    emoji: "🪨",
    type: "attack",
    damage: 4,
    rarity: "Common",
    cost: 1,
    description: "相手に4ダメージ"
  },
  {
    id: 3,
    name: "木の剣",
    emoji: "🗡️",
    type: "attack",
    damage: 5,
    rarity: "Common",
    cost: 1,
    description: "相手に5ダメージ"
  },
  {
    id: 4,
    name: "頭突き",
    emoji: "💥",
    type: "attack",
    damage: 6,
    rarity: "Common",
    cost: 2,
    description: "相手に6ダメージ"
  },

  // =========================
  // Common：回復・防御
  // =========================
  {
    id: 5,
    name: "ばんそうこう",
    emoji: "🩹",
    type: "heal",
    heal: 3,
    rarity: "Common",
    cost: 1,
    description: "HPを3回復"
  },
  {
    id: 6,
    name: "おにぎり",
    emoji: "🍙",
    type: "heal",
    heal: 4,
    rarity: "Common",
    cost: 1,
    description: "HPを4回復"
  },
  {
    id: 7,
    name: "木の盾",
    emoji: "🛡️",
    type: "shield",
    shield: true,
    rarity: "Common",
    cost: 1,
    description: "次に受けるダメージを半分にする"
  },

  // =========================
  // Rare：攻撃
  // =========================
  {
    id: 8,
    name: "鉄の剣",
    emoji: "⚔️",
    type: "attack",
    damage: 8,
    rarity: "Rare",
    cost: 2,
    description: "相手に8ダメージ"
  },
  {
    id: 9,
    name: "火炎弾",
    emoji: "🔥",
    type: "attack",
    damage: 9,
    rarity: "Rare",
    cost: 2,
    description: "相手に9ダメージ"
  },
  {
    id: 10,
    name: "雷撃",
    emoji: "⚡",
    type: "attack",
    damage: 10,
    rarity: "Rare",
    cost: 2,
    description: "相手に10ダメージ"
  },
  {
    id: 11,
    name: "毒ナイフ",
    emoji: "🗡️",
    type: "attack",
    damage: 7,
    rarity: "Rare",
    cost: 2,
    description: "相手に7ダメージ"
  },

  // =========================
  // Rare：回復・防御
  // =========================
  {
    id: 12,
    name: "薬草",
    emoji: "🌿",
    type: "heal",
    heal: 7,
    rarity: "Rare",
    cost: 2,
    description: "HPを7回復"
  },
  {
    id: 13,
    name: "回復ポーション",
    emoji: "🧪",
    type: "heal",
    heal: 8,
    rarity: "Rare",
    cost: 2,
    description: "HPを8回復"
  },
  {
    id: 14,
    name: "鉄の盾",
    emoji: "🛡️",
    type: "shield",
    shield: true,
    rarity: "Rare",
    cost: 1,
    description: "次に受けるダメージを半分にする"
  },

  // =========================
  // Epic：攻撃
  // =========================
  {
    id: 15,
    name: "ドラゴンブレス",
    emoji: "🐉",
    type: "attack",
    damage: 13,
    rarity: "Epic",
    cost: 3,
    description: "相手に13ダメージ"
  },
  {
    id: 16,
    name: "巨大ハンマー",
    emoji: "🔨",
    type: "attack",
    damage: 14,
    rarity: "Epic",
    cost: 3,
    description: "相手に14ダメージ"
  },
  {
    id: 17,
    name: "メテオ",
    emoji: "☄️",
    type: "attack",
    damage: 15,
    rarity: "Epic",
    cost: 3,
    description: "相手に15ダメージ"
  },
  {
    id: 18,
    name: "氷結魔法",
    emoji: "❄️",
    type: "attack",
    damage: 12,
    rarity: "Epic",
    cost: 3,
    description: "相手に12ダメージ"
  },

  // =========================
  // Epic：回復・防御
  // =========================
  {
    id: 19,
    name: "天使の羽",
    emoji: "🪽",
    type: "heal",
    heal: 12,
    rarity: "Epic",
    cost: 3,
    description: "HPを12回復"
  },
  {
    id: 20,
    name: "鋼の盾",
    emoji: "🛡️",
    type: "shield",
    shield: true,
    rarity: "Epic",
    cost: 2,
    description: "次に受けるダメージを半分にする"
  },

  // =========================
  // Legend
  // =========================
  {
    id: 21,
    name: "神の一撃",
    emoji: "🌟",
    type: "attack",
    damage: 20,
    rarity: "Legend",
    cost: 3,
    description: "相手に20ダメージ"
  },
  {
    id: 22,
    name: "終焉の剣",
    emoji: "🗡️",
    type: "attack",
    damage: 18,
    rarity: "Legend",
    cost: 3,
    description: "相手に18ダメージ"
  },
  {
    id: 23,
    name: "奇跡の聖杯",
    emoji: "🏆",
    type: "heal",
    heal: 18,
    rarity: "Legend",
    cost: 3,
    description: "HPを18回復"
  },
  {
    id: 24,
    name: "絶対防壁",
    emoji: "🏰",
    type: "shield",
    shield: true,
    rarity: "Legend",
    cost: 2,
    description: "次に受けるダメージを半分にする"
  },

  // =========================
  // ネタカード
  // =========================
  {
    id: 25,
    name: "激辛ラーメン",
    emoji: "🍜",
    type: "attack",
    damage: 7,
    rarity: "Rare",
    cost: 2,
    description: "辛さで相手に7ダメージ"
  },
  {
    id: 26,
    name: "黒板消し落とし",
    emoji: "🧽",
    type: "attack",
    damage: 5,
    rarity: "Common",
    cost: 1,
    description: "相手に5ダメージ"
  },
  {
    id: 27,
    name: "謎の給食",
    emoji: "🍛",
    type: "heal",
    heal: 6,
    rarity: "Rare",
    cost: 1,
    description: "なぜかHPを6回復"
  },
  {
    id: 28,
    name: "先生の説教",
    emoji: "📢",
    type: "attack",
    damage: 11,
    rarity: "Epic",
    cost: 3,
    description: "精神的に11ダメージ"
  },
  {
    id: 29,
    name: "無敵の段ボール",
    emoji: "📦",
    type: "shield",
    shield: true,
    rarity: "Rare",
    cost: 1,
    description: "次に受けるダメージを半分にする"
  },
  {
    id: 30,
    name: "深夜テンション",
    emoji: "🌙",
    type: "attack",
    damage: 16,
    rarity: "Legend",
    cost: 3,
    description: "勢いだけで16ダメージ"
  },
  {
  id: 31,
  name: "二連斬り",
  emoji: "⚔️",
  type: "attack",
  damage: 4,
  hits: 2,
  rarity: "Rare",
  cost: 2,
  description: "4ダメージを2回与える"
}
];

export default cards;