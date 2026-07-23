const cards = [
  // Common: 基準効率。デッキに同名3枚まで。
  { id: 1, name: "こぶし", emoji: "👊", type: "attack", damage: 4, rarity: "Common", cost: 1, description: "相手に4ダメージ" },
  { id: 2, name: "石投げ", emoji: "🪨", type: "attack", damage: 4, rarity: "Common", cost: 1, description: "相手に4ダメージ" },
  { id: 3, name: "木の剣", emoji: "🗡️", type: "attack", damage: 7, rarity: "Common", cost: 2, description: "相手に7ダメージ" },
  { id: 4, name: "頭突き", emoji: "💥", type: "attack", damage: 10, rarity: "Common", cost: 3, description: "相手に10ダメージ" },
  { id: 5, name: "ばんそうこう", emoji: "🩹", type: "heal", heal: 4, rarity: "Common", cost: 1, description: "HPを4回復" },
  { id: 6, name: "おにぎり", emoji: "🍙", type: "heal", heal: 7, rarity: "Common", cost: 2, description: "HPを7回復" },
  { id: 7, name: "木の盾", emoji: "🛡️", type: "shield", shield: 5, rarity: "Common", cost: 1, description: "シールドを5得る" },
  { id: 8, name: "段ボールの壁", emoji: "📦", type: "shield", shield: 9, rarity: "Common", cost: 2, description: "シールドを9得る" },
  { id: 9, name: "二連パンチ", emoji: "🥊", type: "multiAttack", damage: 2, hits: 2, rarity: "Common", cost: 1, description: "2ダメージを2回与える" },
  { id: 10, name: "攻防一体", emoji: "🤺", type: "attack", damage: 4, shield: 3, rarity: "Common", cost: 2, description: "4ダメージを与え、シールドを3得る" },
  { id: 11, name: "栄養ドリンク", emoji: "🥤", type: "heal", heal: 4, shield: 3, rarity: "Common", cost: 2, description: "HPを4回復し、シールドを3得る" },
  { id: 12, name: "黒板消し落とし", emoji: "🧽", type: "attack", damage: 7, rarity: "Common", cost: 2, description: "相手に7ダメージ" },

  // Rare: Commonより少し高効率・個性的。同名2枚まで。
  { id: 13, name: "鉄の剣", emoji: "⚔️", type: "attack", damage: 9, rarity: "Rare", cost: 2, description: "相手に9ダメージ" },
  { id: 14, name: "火炎弾", emoji: "🔥", type: "attack", damage: 13, rarity: "Rare", cost: 3, description: "相手に13ダメージ" },
  { id: 15, name: "雷撃", emoji: "⚡", type: "attack", damage: 9, rarity: "Rare", cost: 2, description: "相手に9ダメージ" },
  { id: 16, name: "毒ナイフ", emoji: "🗡️", type: "attack", damage: 5, heal: 3, rarity: "Rare", cost: 2, description: "5ダメージを与え、HPを3回復" },
  { id: 17, name: "薬草", emoji: "🌿", type: "heal", heal: 9, rarity: "Rare", cost: 2, description: "HPを9回復" },
  { id: 18, name: "回復ポーション", emoji: "🧪", type: "heal", heal: 13, rarity: "Rare", cost: 3, description: "HPを13回復" },
  { id: 19, name: "鉄の盾", emoji: "🛡️", type: "shield", shield: 11, rarity: "Rare", cost: 2, description: "シールドを11得る" },
  { id: 20, name: "要塞化", emoji: "🏯", type: "shield", shield: 16, rarity: "Rare", cost: 3, description: "シールドを16得る" },
  { id: 21, name: "二連斬り", emoji: "⚔️", type: "multiAttack", damage: 5, hits: 2, rarity: "Rare", cost: 2, description: "5ダメージを2回与える" },
  { id: 22, name: "三連射", emoji: "🏹", type: "multiAttack", damage: 4, hits: 3, rarity: "Rare", cost: 3, description: "4ダメージを3回与える" },
  { id: 23, name: "吸血コウモリ", emoji: "🦇", type: "attack", damage: 6, heal: 4, rarity: "Rare", cost: 2, description: "6ダメージを与え、HPを4回復" },
  { id: 24, name: "盾殴り", emoji: "🛡️", type: "attack", damage: 5, shield: 6, rarity: "Rare", cost: 2, description: "5ダメージを与え、シールドを6得る" },
  { id: 25, name: "激辛ラーメン", emoji: "🍜", type: "attack", damage: 9, rarity: "Rare", cost: 2, description: "辛さで相手に9ダメージ" },
  { id: 26, name: "謎の給食", emoji: "🍛", type: "heal", heal: 9, rarity: "Rare", cost: 2, description: "なぜかHPを9回復" },

  // Epic: 強力だが同名1枚、デッキ全体で最大4枚。
  { id: 27, name: "ドラゴンブレス", emoji: "🐉", type: "attack", damage: 16, rarity: "Epic", cost: 3, description: "相手に16ダメージ" },
  { id: 28, name: "巨大ハンマー", emoji: "🔨", type: "attack", damage: 21, rarity: "Epic", cost: 4, description: "相手に21ダメージ" },
  { id: 29, name: "メテオ", emoji: "☄️", type: "attack", damage: 26, rarity: "Epic", cost: 5, description: "相手に26ダメージ" },
  { id: 30, name: "天使の羽", emoji: "🪽", type: "heal", heal: 16, rarity: "Epic", cost: 3, description: "HPを16回復" },
  { id: 31, name: "生命の泉", emoji: "⛲", type: "heal", heal: 21, rarity: "Epic", cost: 4, description: "HPを21回復" },
  { id: 32, name: "鋼の盾", emoji: "🛡️", type: "shield", shield: 19, rarity: "Epic", cost: 3, description: "シールドを19得る" },
  { id: 33, name: "鉄壁の構え", emoji: "🧱", type: "shield", shield: 25, rarity: "Epic", cost: 4, description: "シールドを25得る" },
  { id: 34, name: "連鎖雷", emoji: "🌩️", type: "multiAttack", damage: 5, hits: 3, rarity: "Epic", cost: 3, description: "5ダメージを3回与える" },
  { id: 35, name: "乱れ撃ち", emoji: "🏹", type: "multiAttack", damage: 4, hits: 5, rarity: "Epic", cost: 4, description: "4ダメージを5回与える" },
  { id: 36, name: "聖騎士の誓い", emoji: "✨", type: "attack", damage: 8, shield: 10, rarity: "Epic", cost: 3, description: "8ダメージを与え、シールドを10得る" },
  { id: 37, name: "再生の炎", emoji: "🔥", type: "attack", damage: 9, heal: 8, rarity: "Epic", cost: 3, description: "9ダメージを与え、HPを8回復" },
  { id: 38, name: "先生の説教", emoji: "📢", type: "attack", damage: 16, rarity: "Epic", cost: 3, description: "精神的に16ダメージ" },

  // Legend: 最高効率。同名1枚、デッキ全体で最大2枚。
  { id: 39, name: "神の一撃", emoji: "🌟", type: "attack", damage: 19, rarity: "Legend", cost: 3, description: "相手に19ダメージ" },
  { id: 40, name: "終焉の剣", emoji: "🗡️", type: "attack", damage: 25, rarity: "Legend", cost: 4, description: "相手に25ダメージ" },
  { id: 41, name: "天地崩壊", emoji: "🌋", type: "attack", damage: 31, rarity: "Legend", cost: 5, description: "相手に31ダメージ" },
  { id: 42, name: "奇跡の聖杯", emoji: "🏆", type: "heal", heal: 19, rarity: "Legend", cost: 3, description: "HPを19回復" },
  { id: 43, name: "絶対防壁", emoji: "🏰", type: "shield", shield: 23, rarity: "Legend", cost: 3, description: "シールドを23得る" },
  { id: 44, name: "不死鳥の息吹", emoji: "🐦‍🔥", type: "heal", heal: 14, shield: 10, rarity: "Legend", cost: 4, description: "HPを14回復し、シールドを10得る" },
  { id: 45, name: "審判の双剣", emoji: "⚔️", type: "multiAttack", damage: 10, hits: 2, rarity: "Legend", cost: 3, description: "10ダメージを2回与える" },
  { id: 46, name: "カオスノヴァ", emoji: "🌌", type: "attack", damage: 14, heal: 8, shield: 8, rarity: "Legend", cost: 4, description: "14ダメージを与え、HPを8回復し、シールドを8得る" },
  { id: 47, name: "深夜テンション", emoji: "🌙", type: "attack", damage: 19, rarity: "Legend", cost: 3, description: "勢いだけで19ダメージ" },
  { id: 48, name: "完全武装", emoji: "🦾", type: "attack", damage: 12, shield: 14, rarity: "Legend", cost: 4, description: "12ダメージを与え、シールドを14得る" },
];

export default cards;
