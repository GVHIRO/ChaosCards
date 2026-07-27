export const DAILY_LOGIN_REWARDS = [
  20,
  30,
  40,
  50,
  60,
  80,
  150,
];

export const DAILY_COMPLETION_BONUS =
  50;

export const DAILY_FIRST_WIN_REWARD =
  40;

export const DAILY_MISSION_POOL = [
  {
    id: "play-battle",
    metric: "battlePlayed",
    icon: "⚔️",
    title: "バトルに参加",
    description:
      "バトルを1回最後までプレイする",
    target: 1,
    reward: 20,
  },
  {
    id: "win-battle",
    metric: "battleWins",
    icon: "🏆",
    title: "勝利をつかめ",
    description:
      "いずれかのバトルで1回勝利する",
    target: 1,
    reward: 30,
  },
  {
    id: "play-cards",
    metric: "cardsPlayed",
    icon: "🃏",
    title: "カードマスター",
    description:
      "カードを合計10枚使用する",
    target: 10,
    reward: 30,
  },
  {
    id: "open-pack",
    metric: "packsOpened",
    icon: "🎁",
    title: "パック開封",
    description:
      "カードパックを1回開封する",
    target: 1,
    reward: 20,
  },
  {
    id: "play-challenge",
    metric: "challengePlayed",
    icon: "🎯",
    title: "試練への挑戦",
    description:
      "チャレンジを1回プレイする",
    target: 1,
    reward: 30,
  },
  {
    id: "play-online",
    metric: "onlinePlayed",
    icon: "🌐",
    title: "オンライン参戦",
    description:
      "オンライン対戦を1回プレイする",
    target: 1,
    reward: 40,
  },
];

export const ACHIEVEMENT_COIN_REWARDS = {
  "first-victory": 50,
  "cpu-winner": 50,
  "online-debut": 40,
  "online-winner": 80,
  "challenge-clear": 50,
  "challenge-master": 200,
  "battle-lover": 100,
  "online-fighter": 100,
};

export const COLLECTION_REWARDS = [
  {
    threshold: 10,
    reward: 100,
  },
  {
    threshold: 20,
    reward: 150,
  },
  {
    threshold: 30,
    reward: 200,
  },
  {
    threshold: 40,
    reward: 250,
  },
  {
    threshold: 50,
    reward: 300,
  },
  {
    threshold: 60,
    reward: 500,
  },
];

export const DUPLICATE_EXCHANGE_VALUES = {
  Common: 5,
  Rare: 15,
  Epic: 40,
  Legend: 100,
};

export const DUPLICATE_KEEP_COUNTS = {
  Common: 3,
  Rare: 2,
  Epic: 1,
  Legend: 1,
};

export const CHALLENGE_BONUSES = [
  {
    id: "hp-20",
    icon: "💚",
    title: "HP20以上で勝利",
    reward: 30,
  },
  {
    id: "speed-clear",
    icon: "⚡",
    title: "10ターン以内に勝利",
    reward: 30,
  },
  {
    id: "no-heal",
    icon: "🔥",
    title: "一度も回復せずに勝利",
    reward: 40,
  },
  {
    id: "complete",
    icon: "🌟",
    title: "全条件を同時達成",
    reward: 50,
  },
];