const cards = [
  // =========================
  // 既存カード 1〜31
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
    type: "multiAttack",
    damage: 4,
    hits: 2,
    rarity: "Rare",
    cost: 2,
    description: "4ダメージを2回与える"
  },

  // =========================
  // 新規カード 32〜80
  // 効果の重複を極力避けた拡張カード
  // =========================
  {
    id: 32,
    name: "気合い",
    emoji: "💪",
    type: "energyGain",
    energyGain: 2,
    rarity: "Common",
    cost: 0,
    description: "エネルギーを2回復"
  },
  {
    id: 33,
    name: "深呼吸",
    emoji: "🌬️",
    type: "energyNextTurn",
    energyNextTurn: 2,
    rarity: "Common",
    cost: 1,
    description: "次のターンの開始時、追加で2エネルギーを得る"
  },
  {
    id: 34,
    name: "応急手当",
    emoji: "⛑️",
    type: "healMissing",
    healMissingPercent: 25,
    rarity: "Rare",
    cost: 2,
    description: "失っているHPの25%を回復"
  },
  {
    id: 35,
    name: "吸血コウモリ",
    emoji: "🦇",
    type: "drain",
    damage: 6,
    healFromDamagePercent: 100,
    rarity: "Rare",
    cost: 2,
    description: "6ダメージを与え、与えた分だけ回復"
  },
  {
    id: 36,
    name: "毒霧",
    emoji: "☠️",
    type: "poison",
    poisonDamage: 2,
    poisonTurns: 3,
    rarity: "Rare",
    cost: 2,
    description: "3ターンの間、相手にターン終了時2ダメージ"
  },
  {
    id: 37,
    name: "灼熱の印",
    emoji: "♨️",
    type: "burn",
    burnDamage: 4,
    burnTurns: 2,
    rarity: "Rare",
    cost: 2,
    description: "2ターンの間、相手にターン開始時4ダメージ"
  },
  {
    id: 38,
    name: "凍結の鎖",
    emoji: "🧊",
    type: "freeze",
    freezeTurns: 1,
    rarity: "Epic",
    cost: 3,
    description: "相手は次のターン、カードを1枚しか使えない"
  },
  {
    id: 39,
    name: "沈黙の鐘",
    emoji: "🔕",
    type: "silence",
    silenceTurns: 1,
    rarity: "Epic",
    cost: 3,
    description: "相手は次のターン、特殊効果カードを使えない"
  },
  {
    id: 40,
    name: "エネルギー泥棒",
    emoji: "🦝",
    type: "stealEnergy",
    stealEnergy: 2,
    rarity: "Epic",
    cost: 2,
    description: "相手のエネルギーを2奪う"
  },
  {
    id: 41,
    name: "手札破壊",
    emoji: "🗑️",
    type: "discardRandom",
    discardCount: 1,
    rarity: "Rare",
    cost: 2,
    description: "相手の手札をランダムに1枚捨てさせる"
  },
  {
    id: 42,
    name: "強欲な壺っぽい何か",
    emoji: "🏺",
    type: "draw",
    draw: 2,
    rarity: "Rare",
    cost: 1,
    description: "カードを2枚引く"
  },
  {
    id: 43,
    name: "未来予知",
    emoji: "🔮",
    type: "drawChoose",
    lookAt: 3,
    take: 1,
    rarity: "Epic",
    cost: 2,
    description: "山札の上3枚を見て、1枚を手札に加える"
  },
  {
    id: 44,
    name: "軽量化",
    emoji: "🪶",
    type: "costReduction",
    costReduction: 1,
    durationTurns: 1,
    rarity: "Rare",
    cost: 1,
    description: "このターン、次に使うカードのコストを1減らす"
  },
  {
    id: 45,
    name: "永久機関",
    emoji: "♾️",
    type: "maxEnergyUp",
    maxEnergyUp: 1,
    rarity: "Legend",
    cost: 3,
    description: "このバトル中、自分の最大エネルギーを1増やす"
  },
  {
    id: 46,
    name: "生命の樹",
    emoji: "🌳",
    type: "maxHpUp",
    maxHpUp: 10,
    heal: 10,
    rarity: "Legend",
    cost: 3,
    description: "最大HPを10増やし、HPを10回復"
  },
  {
    id: 47,
    name: "鉄壁の構え",
    emoji: "🧱",
    type: "armor",
    armor: 3,
    armorTurns: 3,
    rarity: "Epic",
    cost: 3,
    description: "3ターンの間、受けるダメージを3減らす"
  },
  {
    id: 48,
    name: "反射鏡",
    emoji: "🪞",
    type: "reflect",
    reflectPercent: 50,
    durationHits: 1,
    rarity: "Epic",
    cost: 2,
    description: "次に受けたダメージの50%を相手に返す"
  },
  {
    id: 49,
    name: "カウンター",
    emoji: "🥋",
    type: "counter",
    counterDamage: 8,
    durationTurns: 1,
    rarity: "Rare",
    cost: 2,
    description: "次の相手ターンに攻撃されたら8ダメージを返す"
  },
  {
    id: 50,
    name: "最後の抵抗",
    emoji: "🩸",
    type: "lowHpAttack",
    damage: 8,
    bonusDamage: 10,
    hpThresholdPercent: 30,
    rarity: "Epic",
    cost: 2,
    description: "8ダメージ。自分のHPが30%以下ならさらに10ダメージ"
  },
  {
    id: 51,
    name: "処刑人",
    emoji: "🪓",
    type: "execute",
    damage: 7,
    executeThresholdPercent: 25,
    executeDamage: 20,
    rarity: "Legend",
    cost: 3,
    description: "7ダメージ。相手HPが25%以下なら20ダメージ"
  },
  {
    id: 52,
    name: "連鎖雷",
    emoji: "🌩️",
    type: "chainAttack",
    hits: 3,
    damageSequence: [6, 4, 2],
    rarity: "Epic",
    cost: 3,
    description: "6、4、2ダメージを順番に与える"
  },
  {
    id: 53,
    name: "乱れ撃ち",
    emoji: "🏹",
    type: "randomMultiAttack",
    hits: 4,
    minDamage: 1,
    maxDamage: 5,
    rarity: "Rare",
    cost: 2,
    description: "1〜5ダメージをランダムに4回与える"
  },
  {
    id: 54,
    name: "会心の一撃",
    emoji: "🎯",
    type: "criticalAttack",
    damage: 8,
    criticalChance: 35,
    criticalMultiplier: 2,
    rarity: "Rare",
    cost: 2,
    description: "8ダメージ。35%の確率で2倍ダメージ"
  },
  {
    id: 55,
    name: "サイコロ爆弾",
    emoji: "🎲",
    type: "diceDamage",
    dice: 2,
    sides: 6,
    rarity: "Rare",
    cost: 2,
    description: "6面ダイスを2個振り、合計値のダメージ"
  },
  {
    id: 56,
    name: "ギャンブラー",
    emoji: "🎰",
    type: "coinFlip",
    successDamage: 18,
    failSelfDamage: 6,
    rarity: "Epic",
    cost: 2,
    description: "50%で18ダメージ、失敗すると自分に6ダメージ"
  },
  {
    id: 57,
    name: "命の取引",
    emoji: "🫀",
    type: "selfDamageEnergy",
    selfDamage: 6,
    energyGain: 4,
    rarity: "Rare",
    cost: 0,
    description: "自分に6ダメージを与え、エネルギーを4得る"
  },
  {
    id: 58,
    name: "血の魔法",
    emoji: "🩸",
    type: "selfDamageAttack",
    selfDamage: 5,
    damage: 14,
    rarity: "Epic",
    cost: 1,
    description: "自分に5ダメージを与え、相手に14ダメージ"
  },
  {
    id: 59,
    name: "HP交換",
    emoji: "🔁",
    type: "swapHp",
    rarity: "Legend",
    cost: 5,
    description: "自分と相手の現在HPを入れ替える"
  },
  {
    id: 60,
    name: "エネルギー交換",
    emoji: "🔄",
    type: "swapEnergy",
    rarity: "Epic",
    cost: 2,
    description: "自分と相手の現在エネルギーを入れ替える"
  },
  {
    id: 61,
    name: "コピーキャット",
    emoji: "🐈",
    type: "copyLastCard",
    rarity: "Legend",
    cost: 3,
    description: "相手が直前に使ったカードの効果をコピーする"
  },
  {
    id: 62,
    name: "巻き戻し",
    emoji: "⏪",
    type: "undoLastDamage",
    rarity: "Legend",
    cost: 4,
    description: "直前に自分が受けたダメージをなかったことにする"
  },
  {
    id: 63,
    name: "浄化",
    emoji: "✨",
    type: "cleanse",
    rarity: "Rare",
    cost: 1,
    description: "自分に付いている毒・火傷・凍結・沈黙をすべて解除"
  },
  {
    id: 64,
    name: "呪い返し",
    emoji: "🧿",
    type: "transferDebuffs",
    rarity: "Epic",
    cost: 2,
    description: "自分の状態異常をすべて相手へ移す"
  },
  {
    id: 65,
    name: "再生",
    emoji: "💚",
    type: "regeneration",
    healPerTurn: 3,
    turns: 4,
    rarity: "Epic",
    cost: 3,
    description: "4ターンの間、ターン開始時にHPを3回復"
  },
  {
    id: 66,
    name: "不死鳥の羽",
    emoji: "🪶",
    type: "revive",
    reviveHp: 12,
    rarity: "Legend",
    cost: 5,
    description: "このバトル中に1度だけ、HP0になった時12で復活"
  },
  {
    id: 67,
    name: "怒り",
    emoji: "😡",
    type: "berserk",
    damageBonusPerMissingHp: 0.25,
    maxBonusDamage: 12,
    rarity: "Epic",
    cost: 2,
    description: "失っているHP4ごとに与えるダメージ+1（最大+12）"
  },
  {
    id: 68,
    name: "コンボ始動",
    emoji: "🌀",
    type: "comboStarter",
    comboBonus: 4,
    durationTurns: 1,
    rarity: "Rare",
    cost: 1,
    description: "このターン、2枚目以降の攻撃カードのダメージ+4"
  },
  {
    id: 69,
    name: "連続詠唱",
    emoji: "📜",
    type: "repeatNextCard",
    repeatCount: 1,
    rarity: "Legend",
    cost: 3,
    description: "次に使うカードの効果をもう1回発動する"
  },
  {
    id: 70,
    name: "封印",
    emoji: "🔒",
    type: "lockCardType",
    lockedType: "heal",
    turns: 1,
    rarity: "Epic",
    cost: 2,
    description: "相手は次のターン、回復カードを使えない"
  },
  {
    id: 71,
    name: "時間停止",
    emoji: "⏱️",
    type: "extraTurn",
    rarity: "Legend",
    cost: 5,
    description: "このターン終了後、もう一度自分のターンを行う"
  },
  {
    id: 72,
    name: "手札補充",
    emoji: "🃏",
    type: "refillHand",
    handSize: 5,
    rarity: "Epic",
    cost: 3,
    description: "手札が5枚になるまでカードを引く"
  },
  {
    id: 73,
    name: "山札リサイクル",
    emoji: "♻️",
    type: "shuffleDiscardIntoDeck",
    rarity: "Rare",
    cost: 1,
    description: "捨て札をすべて山札に戻してシャッフルする"
  },
  {
    id: 74,
    name: "カード徴税",
    emoji: "💸",
    type: "increaseOpponentCost",
    increaseCost: 1,
    durationTurns: 1,
    rarity: "Epic",
    cost: 2,
    description: "相手の次のターン、すべてのカードのコスト+1"
  },
  {
    id: 75,
    name: "無償化",
    emoji: "🆓",
    type: "makeNextCardFree",
    rarity: "Legend",
    cost: 3,
    description: "次に使うカードのコストを0にする"
  },
  {
    id: 76,
    name: "逆境ドロー",
    emoji: "📉",
    type: "drawWhenLowHp",
    draw: 3,
    hpThresholdPercent: 40,
    rarity: "Rare",
    cost: 1,
    description: "HPが40%以下なら3枚引く。それ以外なら1枚引く"
  },
  {
    id: 77,
    name: "完全防御",
    emoji: "🛡️",
    type: "invulnerable",
    turns: 1,
    rarity: "Legend",
    cost: 4,
    description: "次の相手ターン中、ダメージを受けない"
  },
  {
    id: 78,
    name: "貫通弾",
    emoji: "🔫",
    type: "piercingAttack",
    damage: 10,
    ignoreShield: true,
    ignoreArmor: true,
    rarity: "Epic",
    cost: 3,
    description: "盾と防御軽減を無視して10ダメージ"
  },
  {
    id: 79,
    name: "デッキ圧縮",
    emoji: "🗜️",
    type: "exhaustFromHand",
    exhaustCount: 1,
    rarity: "Rare",
    cost: 0,
    description: "手札1枚をこのバトル中デッキから除外する"
  },
  {
    id: 80,
    name: "カオスルーレット",
    emoji: "🎡",
    type: "chaosRandom",
    outcomes: [
      "damage12",
      "heal12",
      "energy3",
      "draw3",
      "selfDamage6",
      "shield"
    ],
    rarity: "Legend",
    cost: 2,
    description: "6種類の効果からランダムに1つ発動する"
  }
];

export default cards;
