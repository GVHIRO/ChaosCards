import achievements, {
  ACHIEVEMENT_MAP,
} from "../data/achievements";
import { supabase } from "./supabase";
import challenges, {
  CHALLENGE_PROGRESS_KEY,
} from "../data/challenges";
import {
  notifyProgressChanged,
} from "./progressStorage";
export const ACHIEVEMENT_UNLOCK_EVENT =
  "chaos-achievements-unlocked";

const ACHIEVEMENT_STORAGE_KEY =
  "chaosCardsAchievements";

const ACHIEVEMENT_STATS_KEY =
  "chaosCardsAchievementStats";

const DEFAULT_STATS = {
  totalBattles: 0,
  totalWins: 0,
  cpuBattles: 0,
  onlineBattles: 0,
  challengeBattles: 0,
};

function getSafeNumber(value) {
  const number = Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return 0;
  }

  return Math.floor(number);
}

function readStringArray(key) {
  try {
    const saved =
      localStorage.getItem(key);

    if (!saved) {
      return [];
    }

    const parsed =
      JSON.parse(saved);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (value) =>
        typeof value === "string",
    );
  } catch (error) {
    console.error(
      `${key}の読み込みエラー:`,
      error,
    );

    return [];
  }
}

export function getUnlockedAchievementIds() {
  return readStringArray(
    ACHIEVEMENT_STORAGE_KEY,
  ).filter(
    (achievementId) =>
      Boolean(
        ACHIEVEMENT_MAP[
          achievementId
        ],
      ),
  );
}

export function getUnlockedAchievements() {
  const unlockedIds =
    new Set(
      getUnlockedAchievementIds(),
    );

  return achievements.filter(
    (achievement) =>
      unlockedIds.has(
        achievement.id,
      ),
  );
}

export function getAchievementStats() {
  try {
    const saved =
      localStorage.getItem(
        ACHIEVEMENT_STATS_KEY,
      );

    if (!saved) {
      return {
        ...DEFAULT_STATS,
      };
    }

    const parsed =
      JSON.parse(saved);

    return {
      totalBattles:
        getSafeNumber(
          parsed?.totalBattles,
        ),

      totalWins:
        getSafeNumber(
          parsed?.totalWins,
        ),

      cpuBattles:
        getSafeNumber(
          parsed?.cpuBattles,
        ),

      onlineBattles:
        getSafeNumber(
          parsed?.onlineBattles,
        ),

      challengeBattles:
        getSafeNumber(
          parsed?.challengeBattles,
        ),
    };
  } catch (error) {
    console.error(
      "実績統計読込エラー:",
      error,
    );

    return {
      ...DEFAULT_STATS,
    };
  }
}

function saveAchievementStats(
  stats,
) {
  try {
    localStorage.setItem(
      ACHIEVEMENT_STATS_KEY,
      JSON.stringify(stats),
    );

    notifyProgressChanged();
  } catch (error) {
    console.error(
      "実績統計保存エラー:",
      error,
    );
  }
}

export function unlockAchievements(
  achievementIds,
) {
  const currentUnlockedIds =
    getUnlockedAchievementIds();

  const currentUnlockedSet =
    new Set(
      currentUnlockedIds,
    );

  const newlyUnlocked =
    achievementIds
      .filter(
        (achievementId) =>
          Boolean(
            ACHIEVEMENT_MAP[
              achievementId
            ],
          ),
      )
      .filter(
        (achievementId) =>
          !currentUnlockedSet.has(
            achievementId,
          ),
      )
      .map(
        (achievementId) =>
          ACHIEVEMENT_MAP[
            achievementId
          ],
      );

  if (
    newlyUnlocked.length === 0
  ) {
    return [];
  }

  const nextUnlockedIds = [
    ...currentUnlockedIds,
    ...newlyUnlocked.map(
      (achievement) =>
        achievement.id,
    ),
  ];

  try {
    localStorage.setItem(
      ACHIEVEMENT_STORAGE_KEY,
      JSON.stringify(
        nextUnlockedIds,
      ),
    );
    notifyProgressChanged();
  } catch (error) {
    console.error(
      "実績保存エラー:",
      error,
    );

    return [];
  }

  window.dispatchEvent(
    new CustomEvent(
      ACHIEVEMENT_UNLOCK_EVENT,
      {
        detail: newlyUnlocked,
      },
    ),
  );

  return newlyUnlocked;
}

export function recordBattleAchievements({
  result,
  mode,
  challengeId = null,
}) {
  const previousStats =
    getAchievementStats();

  const isVictory =
    result === "player";

  const isOnline =
    mode === "online";

  const isChallenge =
    Boolean(challengeId);

  const isNormalCpu =
    mode === "cpu" &&
    !isChallenge;

  const nextStats = {
    totalBattles:
      previousStats.totalBattles + 1,

    totalWins:
      previousStats.totalWins +
      (isVictory ? 1 : 0),

    cpuBattles:
      previousStats.cpuBattles +
      (isNormalCpu ? 1 : 0),

    onlineBattles:
      previousStats.onlineBattles +
      (isOnline ? 1 : 0),

    challengeBattles:
      previousStats.challengeBattles +
      (isChallenge ? 1 : 0),
  };

  saveAchievementStats(
    nextStats,
  );

  /*
    この宣言が必要。
    解除対象の実績IDをここへ追加する。
  */
  const achievementIds = [];

  if (isVictory) {
    achievementIds.push(
      "first-victory",
    );
  }

  if (
    isNormalCpu &&
    isVictory
  ) {
    achievementIds.push(
      "cpu-winner",
    );
  }

  if (isOnline) {
    achievementIds.push(
      "online-debut",
    );
  }

  if (
    isOnline &&
    isVictory
  ) {
    achievementIds.push(
      "online-winner",
    );
  }

  if (
    isChallenge &&
    isVictory
  ) {
    achievementIds.push(
      "challenge-clear",
    );
  }

  if (
    nextStats.totalBattles >= 10
  ) {
    achievementIds.push(
      "battle-lover",
    );
  }

  if (
    nextStats.onlineBattles >= 5
  ) {
    achievementIds.push(
      "online-fighter",
    );
  }

  if (
    isChallenge &&
    isVictory
  ) {
    const clearedChallengeIds =
      new Set(
        readStringArray(
          CHALLENGE_PROGRESS_KEY,
        ),
      );

    const allCleared =
      challenges.every(
        (challenge) =>
          clearedChallengeIds.has(
            challenge.id,
          ),
      );

    if (allCleared) {
      achievementIds.push(
        "challenge-master",
      );
    }
  }

  return unlockAchievements(
    achievementIds,
  );
}

/*
  この位置に置く。
  recordBattleAchievementsの中へ入れない。
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

/* =========================================================
   装備中の称号
========================================================= */

export const EQUIPPED_TITLE_CHANGE_EVENT =
  "chaos-equipped-title-change";

const EQUIPPED_TITLE_STORAGE_KEY =
  "chaosCardsEquippedAchievementTitle";

/*
  IDから実績データを取得する。
  オンライン相手の称号取得にも使用する。
*/
export function getAchievementById(
  achievementId,
) {
  if (
    typeof achievementId !== "string" ||
    !achievementId
  ) {
    return null;
  }

  return (
    ACHIEVEMENT_MAP[
      achievementId
    ] ?? null
  );
}

/*
  装備中の実績IDを取得する。

  Supabaseから同期された称号は、
  この端末で実績データを持っていなくても
  表示できるようにする。
*/
export function getEquippedAchievementId() {
  try {
    const savedId =
      localStorage.getItem(
        EQUIPPED_TITLE_STORAGE_KEY,
      );

    if (!savedId) {
      return null;
    }

    const achievement =
      getAchievementById(savedId);

    if (!achievement) {
      localStorage.removeItem(
        EQUIPPED_TITLE_STORAGE_KEY,
      );

      return null;
    }

    return savedId;
  } catch (error) {
    console.error(
      "装備称号読込エラー:",
      error,
    );

    return null;
  }
}

/*
  装備中の実績データ全体を返す。
*/
export function getEquippedAchievement() {
  const achievementId =
    getEquippedAchievementId();

  return getAchievementById(
    achievementId,
  );
}

/*
  Supabaseで取得したプロフィール称号を
  この端末へ反映する。
*/
export function applyEquippedAchievementFromProfile(
  achievementId,
) {
  try {
    const achievement =
      getAchievementById(
        achievementId,
      );

    if (achievement) {
      localStorage.setItem(
        EQUIPPED_TITLE_STORAGE_KEY,
        achievement.id,
      );
    } else {
      localStorage.removeItem(
        EQUIPPED_TITLE_STORAGE_KEY,
      );
    }

    window.dispatchEvent(
      new CustomEvent(
        EQUIPPED_TITLE_CHANGE_EVENT,
        {
          detail: achievement,
        },
      ),
    );

    return achievement;
  } catch (error) {
    console.error(
      "プロフィール称号反映エラー:",
      error,
    );

    return null;
  }
}

/*
  ログイン中の正式アカウントへ
  装備称号を保存する。

  ゲストの場合は端末保存だけを使用する。
*/
async function saveEquippedTitleToCloud(
  achievementId,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw userError;
  }

  if (
    !user ||
    user.is_anonymous
  ) {
    return;
  }

  const { error: updateError } =
    await supabase
      .from("profiles")
      .update({
        equipped_title_id:
          achievementId || null,
      })
      .eq("id", user.id);

  if (updateError) {
    throw updateError;
  }
}

/*
  解除済み実績を称号として装備する。

  nullを渡した場合は称号を外す。
  画面には即時反映し、
  Supabaseへの保存は非同期で行う。
*/
export function equipAchievementTitle(
  achievementId,
) {
  try {
    if (!achievementId) {
      localStorage.removeItem(
        EQUIPPED_TITLE_STORAGE_KEY,
      );

      window.dispatchEvent(
        new CustomEvent(
          EQUIPPED_TITLE_CHANGE_EVENT,
          {
            detail: null,
          },
        ),
      );

      void saveEquippedTitleToCloud(
        null,
      ).catch((error) => {
        console.error(
          "称号のクラウド解除エラー:",
          error,
        );
      });

      return null;
    }

    const achievement =
      getAchievementById(
        achievementId,
      );

    const unlockedIds =
      new Set(
        getUnlockedAchievementIds(),
      );

    /*
      実績画面から新しく装備するときは、
      解除済みであることを確認する。
    */
    if (
      !achievement ||
      !unlockedIds.has(
        achievementId,
      )
    ) {
      console.warn(
        "未解除の実績は称号にできません:",
        achievementId,
      );

      return null;
    }

    localStorage.setItem(
      EQUIPPED_TITLE_STORAGE_KEY,
      achievementId,
    );

    window.dispatchEvent(
      new CustomEvent(
        EQUIPPED_TITLE_CHANGE_EVENT,
        {
          detail: achievement,
        },
      ),
    );

    void saveEquippedTitleToCloud(
      achievementId,
    ).catch((error) => {
      console.error(
        "称号のクラウド保存エラー:",
        error,
      );
    });

    return achievement;
  } catch (error) {
    console.error(
      "称号装備エラー:",
      error,
    );

    return null;
  }
}