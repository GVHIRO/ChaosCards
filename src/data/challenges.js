export const CHALLENGE_PROGRESS_KEY =
  "chaosCardsChallengeClears";

const challenges = [
  {
    id: "rookie-trial",
    number: 1,
    icon: "⚔️",
    english: "ROOKIE TRIAL",
    title: "新人試験",
    difficulty: "EASY",

    description:
      "少し弱ったCPUを倒して、基本的な戦い方を確認しよう。",

    playerHp: 40,
    enemyHp: 32,

    playerShield: 0,
    enemyShield: 0,

    playerEnergy: 3,
    enemyEnergy: 3,

    enemyName: "訓練用CPU",

    rules: [
      "自分のHP：40",
      "敵のHP：32",
      "通常ルール",
    ],
  },

  {
    id: "iron-fortress",
    number: 2,
    icon: "🏰",
    english: "IRON FORTRESS",
    title: "鉄壁要塞",
    difficulty: "NORMAL",

    description:
      "大量のシールドを持つCPUを突破しよう。",

    playerHp: 40,
    enemyHp: 40,

    playerShield: 0,
    enemyShield: 15,

    playerEnergy: 3,
    enemyEnergy: 3,

    enemyName: "要塞CPU",

    rules: [
      "敵はシールド15で開始",
      "シールド破壊・貫通が有効",
      "敵のHP：40",
    ],
  },

  {
    id: "energy-crisis",
    number: 3,
    icon: "⚡",
    english: "ENERGY CRISIS",
    title: "エネルギー危機",
    difficulty: "HARD",

    description:
      "少ない初期エネルギーで、全力状態のCPUに挑め。",

    playerHp: 35,
    enemyHp: 40,

    playerShield: 0,
    enemyShield: 0,

    playerEnergy: 2,
    enemyEnergy: 5,

    enemyName: "過充電CPU",

    rules: [
      "自分の初期エネルギー：2",
      "敵の初期エネルギー：5",
      "自分のHP：35",
    ],
  },

  {
    id: "chaos-final",
    number: 4,
    icon: "🌌",
    english: "CHAOS FINAL",
    title: "混沌の最終試験",
    difficulty: "EXTREME",

    description:
      "不利な状態から、強化されたCPUを撃破せよ。",

    playerHp: 25,
    enemyHp: 40,

    playerShield: 0,
    enemyShield: 12,

    playerEnergy: 2,
    enemyEnergy: 5,

    enemyName: "カオスCPU",

    rules: [
      "自分のHP：25",
      "敵はシールド12で開始",
      "敵の初期エネルギー：5",
    ],
  },
];

export default challenges;