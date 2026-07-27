const achievements = [
  {
    id: "first-victory",
    icon: "🏆",
    category: "BATTLE",
    title: "初勝利",
    description:
      "いずれかの対戦で初めて勝利する",
  },
  {
    id: "cpu-winner",
    icon: "🤖",
    category: "SOLO",
    title: "CPUキラー",
    description:
      "通常のCPU対戦で勝利する",
  },
  {
    id: "online-debut",
    icon: "🌐",
    category: "ONLINE",
    title: "対人デビュー",
    description:
      "オンライン対戦を最後までプレイする",
  },
  {
    id: "online-winner",
    icon: "⚔️",
    category: "ONLINE",
    title: "最初のライバル",
    description:
      "オンライン対戦で初めて勝利する",
  },
  {
    id: "challenge-clear",
    icon: "🎯",
    category: "CHALLENGE",
    title: "試練への一歩",
    description:
      "チャレンジを1つクリアする",
  },
  {
    id: "challenge-master",
    icon: "🌌",
    category: "CHALLENGE",
    title: "混沌を制した者",
    description:
      "すべてのチャレンジをクリアする",
  },
  {
    id: "battle-lover",
    icon: "🔥",
    category: "BATTLE",
    title: "バトル好き",
    description:
      "合計10回対戦する",
  },
  {
    id: "online-fighter",
    icon: "🛡️",
    category: "ONLINE",
    title: "オンライン戦士",
    description:
      "オンライン対戦を5回プレイする",
  },
];

export const ACHIEVEMENT_MAP =
  Object.fromEntries(
    achievements.map(
      (achievement) => [
        achievement.id,
        achievement,
      ],
    ),
  );

export default achievements;

/*
  実績機能を追加する前から遊んでいた人の
  既存データを実績へ反映する。
*/
export function syncExistingAchievements() {
  const clearedChallengeIds =
    new Set(
      readStringArray(
        CHALLENGE_PROGRESS_KEY,
      ),
    );

  const clearedCount =
    challenges.filter(
      (challenge) =>
        clearedChallengeIds.has(
          challenge.id,
        ),
    ).length;

  if (clearedCount === 0) {
    return [];
  }

  /*
    チャレンジをクリアしているなら、
    最低でも同じ回数だけ
    対戦・勝利していることになる。
  */
  const currentStats =
    getAchievementStats();

  const nextStats = {
    ...currentStats,

    totalBattles: Math.max(
      currentStats.totalBattles,
      clearedCount,
    ),

    totalWins: Math.max(
      currentStats.totalWins,
      clearedCount,
    ),

    challengeBattles: Math.max(
      currentStats.challengeBattles,
      clearedCount,
    ),
  };

  saveAchievementStats(
    nextStats,
  );

  const achievementIds = [
    "first-victory",
    "challenge-clear",
  ];

  const allChallengesCleared =
    challenges.every(
      (challenge) =>
        clearedChallengeIds.has(
          challenge.id,
        ),
    );

  if (allChallengesCleared) {
    achievementIds.push(
      "challenge-master",
    );
  }

  return unlockAchievements(
    achievementIds,
  );
}