/*
  =========================================================
  CHAOS CARDS — CARD DATA
  =========================================================

  新効果フィールド

  element
    physical / fire / water / thunder
    nature / light / dark / chaos

  pierce
    damageのうち、指定された数値が
    シールドを無視してHPへ与えられる。

  shieldBreak
    相手のシールドだけに追加ダメージを与える。
    余ったダメージはHPへ貫通しない。

  burn
    ターン終了時に与える炎上ダメージ。

  burnTurns
    炎上が続くターン数。

  draw
    使用後に引くカード枚数。

  energyGain
    使用後に自分が得るエネルギー。

  energyDrain
    相手の現在エネルギーを減らす。

  weaken
    相手が次に使う攻撃カードの
    合計ダメージを減らす。

  cleanse
    自分に付いている炎上・弱体化を解除する。

  recoil
    使用後に自分が受ける反動ダメージ。
    反動ではHPが1未満にならない予定。

  lowHpBonusDamage
    自分のHPがlowHpThreshold以下なら
    追加されるダメージ。
*/

const cards = [
  // =========================================================
  // Common
  // 種類につき3枚まで
  // =========================================================

  {
    id: 1,
    name: "こぶし",
    emoji: "👊",
    element: "physical",
    type: "attack",
    damage: 4,
    rarity: "Common",
    cost: 1,
    description: "相手に4ダメージ",
  },
  {
    id: 2,
    name: "石投げ",
    emoji: "🪨",
    element: "physical",
    type: "attack",
    damage: 3,
    shieldBreak: 3,
    rarity: "Common",
    cost: 1,
    description:
  "相手のシールドを最大3破壊してから、3ダメージ",
  },
  {
    id: 3,
    name: "木の剣",
    emoji: "🗡️",
    element: "physical",
    type: "attack",
    damage: 7,
    rarity: "Common",
    cost: 2,
    description: "相手に7ダメージ",
  },
  {
    id: 4,
    name: "頭突き",
    emoji: "💥",
    element: "chaos",
    type: "attack",
    damage: 10,
    recoil: 2,
    rarity: "Common",
    cost: 2,
    description:
      "相手に10ダメージ。自分は反動で2ダメージ受ける",
  },
  {
    id: 5,
    name: "ばんそうこう",
    emoji: "🩹",
    element: "nature",
    type: "heal",
    heal: 4,
    rarity: "Common",
    cost: 1,
    description: "HPを4回復",
  },
  {
    id: 6,
    name: "おにぎり",
    emoji: "🍙",
    element: "nature",
    type: "heal",
    heal: 7,
    rarity: "Common",
    cost: 2,
    description: "HPを7回復",
  },
  {
    id: 7,
    name: "木の盾",
    emoji: "🛡️",
    element: "light",
    type: "shield",
    shield: 5,
    rarity: "Common",
    cost: 1,
    description: "シールドを5得る",
  },
  {
    id: 8,
    name: "段ボールの壁",
    emoji: "📦",
    element: "light",
    type: "shield",
    shield: 9,
    rarity: "Common",
    cost: 2,
    description: "シールドを9得る",
  },
  {
    id: 9,
    name: "二連パンチ",
    emoji: "🥊",
    element: "physical",
    type: "multiAttack",
    damage: 2,
    hits: 2,
    rarity: "Common",
    cost: 1,
    description: "2ダメージを2回与える",
  },
  {
    id: 10,
    name: "攻防一体",
    emoji: "🤺",
    element: "light",
    type: "attack",
    damage: 3,
    shield: 4,
    rarity: "Common",
    cost: 2,
    description:
      "相手に3ダメージを与え、シールドを4得る",
  },
  {
    id: 11,
    name: "栄養ドリンク",
    emoji: "🥤",
    element: "nature",
    type: "heal",
    heal: 3,
    energyGain: 1,
    rarity: "Common",
    cost: 2,
    description:
      "HPを3回復し、エネルギーを1得る",
  },
  {
    id: 12,
    name: "黒板消し落とし",
    emoji: "🧽",
    element: "water",
    type: "attack",
    damage: 5,
    draw: 1,
    rarity: "Common",
    cost: 2,
    description:
      "相手に5ダメージを与え、カードを1枚引く",
  },
  {
    id: 49,
    name: "小さな火花",
    emoji: "🔥",
    element: "fire",
    type: "attack",
    damage: 5,
    burn: 1,
    burnTurns: 2,
    rarity: "Common",
    cost: 2,
    description:
      "相手に5ダメージ。2ターンの間、ターン終了時に1ダメージ",
  },
  {
    id: 50,
    name: "応急手当",
    emoji: "🧰",
    element: "nature",
    type: "heal",
    heal: 3,
    shield: 3,
    cleanse: true,
    rarity: "Common",
    cost: 2,
    description:
      "HPを3回復し、シールドを3得て、弱体効果を解除する",
  },
  {
    id: 51,
    name: "連続デコピン",
    emoji: "🤏",
    element: "thunder",
    type: "multiAttack",
    damage: 1,
    hits: 4,
    energyDrain: 1,
    rarity: "Common",
    cost: 2,
    description:
      "1ダメージを4回与え、相手のエネルギーを1減らす",
  },

  // =========================================================
  // Rare
  // 種類につき2枚まで
  // =========================================================

  {
    id: 13,
    name: "鉄の剣",
    emoji: "⚔️",
    element: "physical",
    type: "attack",
    damage: 9,
    rarity: "Rare",
    cost: 2,
    description: "相手に9ダメージ",
  },
  {
    id: 14,
    name: "火炎弾",
    emoji: "🔥",
    element: "fire",
    type: "attack",
    damage: 9,
    burn: 2,
    burnTurns: 2,
    rarity: "Rare",
    cost: 3,
    description:
      "相手に9ダメージ。2ターンの間、ターン終了時に2ダメージ",
  },
  {
    id: 15,
    name: "雷撃",
    emoji: "⚡",
    element: "thunder",
    type: "attack",
    damage: 7,
    energyDrain: 1,
    rarity: "Rare",
    cost: 2,
    description:
      "相手に7ダメージを与え、相手のエネルギーを1減らす",
  },
  {
    id: 16,
    name: "毒ナイフ",
    emoji: "🗡️",
    element: "dark",
    type: "attack",
    damage: 5,
    pierce: 3,
    rarity: "Rare",
    cost: 2,
    description:
      "相手に5ダメージ。このうち3ダメージはシールドを無視する",
  },
  {
    id: 17,
    name: "薬草",
    emoji: "🌿",
    element: "nature",
    type: "heal",
    heal: 9,
    rarity: "Rare",
    cost: 2,
    description: "HPを9回復",
  },
  {
    id: 18,
    name: "回復ポーション",
    emoji: "🧪",
    element: "nature",
    type: "heal",
    heal: 13,
    rarity: "Rare",
    cost: 3,
    description: "HPを13回復",
  },
  {
    id: 19,
    name: "鉄の盾",
    emoji: "🛡️",
    element: "light",
    type: "shield",
    shield: 11,
    rarity: "Rare",
    cost: 2,
    description: "シールドを11得る",
  },
  {
    id: 20,
    name: "要塞化",
    emoji: "🏯",
    element: "light",
    type: "shield",
    shield: 16,
    rarity: "Rare",
    cost: 3,
    description: "シールドを16得る",
  },
  {
    id: 21,
    name: "二連斬り",
    emoji: "⚔️",
    element: "physical",
    type: "multiAttack",
    damage: 4,
    hits: 2,
    rarity: "Rare",
    cost: 2,
    description: "4ダメージを2回与える",
  },
  {
    id: 22,
    name: "三連射",
    emoji: "🏹",
    element: "thunder",
    type: "multiAttack",
    damage: 4,
    hits: 3,
    rarity: "Rare",
    cost: 3,
    description: "4ダメージを3回与える",
  },
  {
    id: 23,
    name: "吸血コウモリ",
    emoji: "🦇",
    element: "dark",
    type: "attack",
    damage: 6,
    heal: 3,
    rarity: "Rare",
    cost: 2,
    description:
      "相手に6ダメージを与え、HPを3回復",
  },
  {
    id: 24,
    name: "盾殴り",
    emoji: "🛡️",
    element: "light",
    type: "attack",
    damage: 5,
    shield: 6,
    rarity: "Rare",
    cost: 2,
    description:
      "相手に5ダメージを与え、シールドを6得る",
  },
  {
    id: 25,
    name: "激辛ラーメン",
    emoji: "🍜",
    element: "fire",
    type: "attack",
    damage: 8,
    burn: 1,
    burnTurns: 2,
    rarity: "Rare",
    cost: 2,
    description:
      "相手に8ダメージ。2ターンの間、ターン終了時に1ダメージ",
  },
  {
    id: 26,
    name: "謎の給食",
    emoji: "🍛",
    element: "nature",
    type: "heal",
    heal: 7,
    shield: 4,
    rarity: "Rare",
    cost: 2,
    description:
      "HPを7回復し、シールドを4得る",
  },
  {
    id: 52,
    name: "水流操作",
    emoji: "🌊",
    element: "water",
    type: "shield",
    shield: 6,
    draw: 1,
    rarity: "Rare",
    cost: 2,
    description:
      "シールドを6得て、カードを1枚引く",
  },
  {
    id: 53,
    name: "放電バリア",
    emoji: "🔋",
    element: "thunder",
    type: "shield",
    shield: 7,
    energyDrain: 1,
    rarity: "Rare",
    cost: 2,
    description:
      "シールドを7得て、相手のエネルギーを1減らす",
  },
  {
    id: 54,
    name: "暴走突撃",
    emoji: "💨",
    element: "chaos",
    type: "attack",
    damage: 13,
    recoil: 4,
    rarity: "Rare",
    cost: 2,
    description:
      "相手に13ダメージ。自分は反動で4ダメージ受ける",
  },

  // =========================================================
  // Epic
  // 種類につき1枚、デッキ全体で最大4枚
  // =========================================================

  {
    id: 27,
    name: "ドラゴンブレス",
    emoji: "🐉",
    element: "fire",
    type: "attack",
    damage: 12,
    burn: 2,
    burnTurns: 2,
    rarity: "Epic",
    cost: 3,
    description:
      "相手に12ダメージ。2ターンの間、ターン終了時に2ダメージ",
  },
  {
    id: 28,
    name: "巨大ハンマー",
    emoji: "🔨",
    element: "physical",
    type: "attack",
    damage: 17,
    shieldBreak: 10,
    rarity: "Epic",
    cost: 4,
    description:
  "相手のシールドを最大10破壊してから、17ダメージ",
  },
  {
    id: 29,
    name: "メテオ",
    emoji: "☄️",
    element: "fire",
    type: "attack",
    damage: 26,
    rarity: "Epic",
    cost: 5,
    description: "相手に26ダメージ",
  },
  {
    id: 30,
    name: "天使の羽",
    emoji: "🪽",
    element: "light",
    type: "heal",
    heal: 14,
    cleanse: true,
    rarity: "Epic",
    cost: 3,
    description:
      "HPを14回復し、弱体効果をすべて解除する",
  },
  {
    id: 31,
    name: "生命の泉",
    emoji: "⛲",
    element: "nature",
    type: "heal",
    heal: 18,
    draw: 1,
    rarity: "Epic",
    cost: 4,
    description:
      "HPを18回復し、カードを1枚引く",
  },
  {
    id: 32,
    name: "鋼の盾",
    emoji: "🛡️",
    element: "light",
    type: "shield",
    shield: 19,
    rarity: "Epic",
    cost: 3,
    description: "シールドを19得る",
  },
  {
    id: 33,
    name: "鉄壁の構え",
    emoji: "🧱",
    element: "light",
    type: "shield",
    shield: 25,
    rarity: "Epic",
    cost: 4,
    description: "シールドを25得る",
  },
  {
    id: 34,
    name: "連鎖雷",
    emoji: "🌩️",
    element: "thunder",
    type: "multiAttack",
    damage: 5,
    hits: 3,
    energyDrain: 1,
    rarity: "Epic",
    cost: 3,
    description:
      "5ダメージを3回与え、相手のエネルギーを1減らす",
  },
  {
    id: 35,
    name: "乱れ撃ち",
    emoji: "🏹",
    element: "physical",
    type: "multiAttack",
    damage: 4,
    hits: 5,
    rarity: "Epic",
    cost: 4,
    description: "4ダメージを5回与える",
  },
  {
    id: 36,
    name: "聖騎士の誓い",
    emoji: "✨",
    element: "light",
    type: "attack",
    damage: 8,
    shield: 10,
    rarity: "Epic",
    cost: 3,
    description:
      "相手に8ダメージを与え、シールドを10得る",
  },
  {
    id: 37,
    name: "再生の炎",
    emoji: "🔥",
    element: "fire",
    type: "attack",
    damage: 9,
    heal: 7,
    burn: 1,
    burnTurns: 2,
    rarity: "Epic",
    cost: 3,
    description:
      "相手に9ダメージを与え、HPを7回復。さらに2ターン炎上させる",
  },
  {
    id: 38,
    name: "先生の説教",
    emoji: "📢",
    element: "light",
    type: "attack",
    damage: 10,
    weaken: 3,
    rarity: "Epic",
    cost: 3,
    description:
      "相手に10ダメージ。相手の次の攻撃ダメージを3減らす",
  },
  {
    id: 55,
    name: "反撃の大剣",
    emoji: "🗡️",
    element: "physical",
    type: "attack",
    damage: 12,
    shield: 6,
    shieldBreak: 8,
    rarity: "Epic",
    cost: 3,
    description:
  "相手のシールドを最大8破壊してから12ダメージを与え、自分はシールドを6得る",
  },
  {
    id: 56,
    name: "聖なる雨",
    emoji: "🌧️",
    element: "water",
    type: "heal",
    heal: 10,
    shield: 7,
    cleanse: true,
    rarity: "Epic",
    cost: 3,
    description:
      "HPを10回復し、シールドを7得て、弱体効果を解除する",
  },
  {
    id: 57,
    name: "六連弾",
    emoji: "🔫",
    element: "thunder",
    type: "multiAttack",
    damage: 3,
    hits: 6,
    draw: 1,
    rarity: "Epic",
    cost: 4,
    description:
      "3ダメージを6回与え、カードを1枚引く",
  },

  // =========================================================
  // Legend
  // 種類につき1枚、デッキ全体で最大2枚
  // =========================================================

  {
    id: 39,
    name: "神の一撃",
    emoji: "🌟",
    element: "light",
    type: "attack",
    damage: 16,
    pierce: 5,
    rarity: "Legend",
    cost: 3,
    description:
      "相手に16ダメージ。このうち5ダメージはシールドを無視する",
  },
  {
    id: 40,
    name: "終焉の剣",
    emoji: "🗡️",
    element: "dark",
    type: "attack",
    damage: 22,
    lowHpThreshold: 10,
    lowHpBonusDamage: 5,
    rarity: "Legend",
    cost: 4,
    description:
      "相手に22ダメージ。自分のHPが10以下なら27ダメージ",
  },
  {
    id: 41,
    name: "天地崩壊",
    emoji: "🌋",
    element: "chaos",
    type: "attack",
    damage: 31,
    recoil: 5,
    rarity: "Legend",
    cost: 5,
    description:
      "相手に31ダメージ。自分は反動で5ダメージ受ける",
  },
  {
    id: 42,
    name: "奇跡の聖杯",
    emoji: "🏆",
    element: "light",
    type: "heal",
    heal: 14,
    draw: 1,
    cleanse: true,
    rarity: "Legend",
    cost: 3,
    description:
      "HPを14回復し、カードを1枚引いて、弱体効果を解除する",
  },
  {
    id: 43,
    name: "絶対防壁",
    emoji: "🏰",
    element: "light",
    type: "shield",
    shield: 23,
    weaken: 3,
    rarity: "Legend",
    cost: 3,
    description:
      "シールドを23得て、相手の次の攻撃ダメージを3減らす",
  },
  {
    id: 44,
    name: "不死鳥の息吹",
    emoji: "🐦‍🔥",
    element: "nature",
    type: "heal",
    heal: 13,
    shield: 10,
    cleanse: true,
    rarity: "Legend",
    cost: 4,
    description:
      "HPを13回復し、シールドを10得て、弱体効果を解除する",
  },
  {
    id: 45,
    name: "審判の双剣",
    emoji: "⚔️",
    element: "physical",
    type: "multiAttack",
    damage: 8,
    hits: 2,
    shieldBreak: 12,
    rarity: "Legend",
    cost: 3,
    description:
  "相手のシールドを最大12破壊してから、8ダメージを2回与える",
  },
  {
    id: 46,
    name: "カオスノヴァ",
    emoji: "🌌",
    element: "chaos",
    type: "attack",
    damage: 12,
    heal: 7,
    shield: 7,
    draw: 1,
    rarity: "Legend",
    cost: 4,
    description:
      "相手に12ダメージを与え、HPを7回復し、シールドを7得て、カードを1枚引く",
  },
  {
    id: 47,
    name: "深夜テンション",
    emoji: "🌙",
    element: "dark",
    type: "attack",
    damage: 14,
    energyGain: 1,
    rarity: "Legend",
    cost: 3,
    description:
      "相手に14ダメージを与え、エネルギーを1得る",
  },
  {
    id: 48,
    name: "完全武装",
    emoji: "🦾",
    element: "light",
    type: "attack",
    damage: 11,
    shield: 13,
    rarity: "Legend",
    cost: 4,
    description:
      "相手に11ダメージを与え、シールドを13得る",
  },
  {
    id: 58,
    name: "太陽の槍",
    emoji: "🔱",
    element: "fire",
    type: "attack",
    damage: 15,
    burn: 3,
    burnTurns: 2,
    rarity: "Legend",
    cost: 4,
    description:
      "相手に15ダメージ。2ターンの間、ターン終了時に3ダメージ",
  },
  {
    id: 59,
    name: "世界樹の祝福",
    emoji: "🌳",
    element: "nature",
    type: "heal",
    heal: 11,
    shield: 13,
    draw: 1,
    rarity: "Legend",
    cost: 4,
    description:
      "HPを11回復し、シールドを13得て、カードを1枚引く",
  },
  {
    id: 60,
    name: "星砕き",
    emoji: "🌠",
    element: "thunder",
    type: "multiAttack",
    damage: 6,
    hits: 4,
    energyDrain: 1,
    rarity: "Legend",
    cost: 4,
    description:
      "6ダメージを4回与え、相手のエネルギーを1減らす",
  },
];

export default cards;