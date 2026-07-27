import {
  CHALLENGE_PROGRESS_KEY,
} from "../data/challenges";

export const PROGRESS_CHANGE_EVENT =
  "chaos-card-progress-change";

const ACHIEVEMENT_STORAGE_KEY =
  "chaosCardsAchievements";

const ACHIEVEMENT_STATS_KEY =
  "chaosCardsAchievementStats";

const DAILY_STATE_KEY =
  "chaosCardsDailyRewards";

const LOGIN_STATE_KEY =
  "chaosCardsLoginRewards";

const FIRST_WIN_DATE_KEY =
  "chaosCardsFirstWinDate";

const ACHIEVEMENT_REWARD_KEY =
  "chaosCardsAchievementRewardClaims";

const COLLECTION_REWARD_KEY =
  "chaosCardsCollectionRewardClaims";

const CHALLENGE_BONUS_KEY =
  "chaosCardsChallengeBonusClaims";

const PROCESSED_BATTLES_KEY =
  "chaosCardsProcessedRewardBattles";

const REWARDED_BATTLE_KEYS_KEY =
  "chaosCardsRewardedBattleKeys";

const DEFAULT_ACHIEVEMENT_STATS = {
  totalBattles: 0,
  totalWins: 0,
  cpuBattles: 0,
  onlineBattles: 0,
  challengeBattles: 0,
};

function readJson(
  key,
  fallbackValue,
) {
  try {
    const saved =
      localStorage.getItem(key);

    if (!saved) {
      return fallbackValue;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.error(
      `${key}の読込エラー:`,
      error,
    );

    return fallbackValue;
  }
}

function writeJson(
  key,
  value,
) {
  localStorage.setItem(
    key,
    JSON.stringify(value),
  );
}

function writeOptionalJson(
  key,
  value,
) {
  if (
    value === null ||
    value === undefined
  ) {
    localStorage.removeItem(
      key,
    );

    return;
  }

  writeJson(
    key,
    value,
  );
}

function isPlainObject(
  value,
) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function normalizeObject(
  value,
  fallbackValue = {},
) {
  if (!isPlainObject(value)) {
    return {
      ...fallbackValue,
    };
  }

  try {
    return JSON.parse(
      JSON.stringify(value),
    );
  } catch (error) {
    console.error(
      "進行オブジェクト変換エラー:",
      error,
    );

    return {
      ...fallbackValue,
    };
  }
}

function normalizeStringArray(
  value,
  maximumLength = 500,
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return [
    ...new Set(
      value.filter(
        (item) =>
          typeof item ===
            "string" &&
          item.length > 0,
      ),
    ),
  ].slice(
    -maximumLength,
  );
}

function normalizeNumber(
  value,
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number < 0
  ) {
    return 0;
  }

  return Math.floor(
    number,
  );
}

function normalizeAchievementStats(
  value,
) {
  const source =
    isPlainObject(value)
      ? value
      : {};

  return {
    totalBattles:
      normalizeNumber(
        source.totalBattles,
      ),

    totalWins:
      normalizeNumber(
        source.totalWins,
      ),

    cpuBattles:
      normalizeNumber(
        source.cpuBattles,
      ),

    onlineBattles:
      normalizeNumber(
        source.onlineBattles,
      ),

    challengeBattles:
      normalizeNumber(
        source.challengeBattles,
      ),
  };
}

export function notifyProgressChanged() {
  window.dispatchEvent(
    new CustomEvent(
      PROGRESS_CHANGE_EVENT,
    ),
  );
}

export function getLocalProgressSnapshot() {
  const dailyRewards =
    readJson(
      DAILY_STATE_KEY,
      null,
    );

  const loginRewards =
    readJson(
      LOGIN_STATE_KEY,
      {},
    );

  return {
    version: 1,

    achievements:
      normalizeStringArray(
        readJson(
          ACHIEVEMENT_STORAGE_KEY,
          [],
        ),
      ),

    achievementStats:
      normalizeAchievementStats(
        readJson(
          ACHIEVEMENT_STATS_KEY,
          DEFAULT_ACHIEVEMENT_STATS,
        ),
      ),

    challengeClears:
      normalizeStringArray(
        readJson(
          CHALLENGE_PROGRESS_KEY,
          [],
        ),
      ),

    dailyRewards:
      isPlainObject(
        dailyRewards,
      )
        ? normalizeObject(
            dailyRewards,
          )
        : null,

    loginRewards:
      normalizeObject(
        loginRewards,
      ),

    firstWinDate:
      localStorage.getItem(
        FIRST_WIN_DATE_KEY,
      ) ?? "",

    achievementRewardClaims:
      normalizeStringArray(
        readJson(
          ACHIEVEMENT_REWARD_KEY,
          [],
        ),
      ),

    collectionRewardClaims:
      normalizeStringArray(
        readJson(
          COLLECTION_REWARD_KEY,
          [],
        ),
      ),

    challengeBonusClaims:
      normalizeStringArray(
        readJson(
          CHALLENGE_BONUS_KEY,
          [],
        ),
      ),

    processedRewardBattles:
      normalizeStringArray(
        readJson(
          PROCESSED_BATTLES_KEY,
          [],
        ),
        200,
      ),

    rewardedBattleKeys:
      normalizeStringArray(
        readJson(
          REWARDED_BATTLE_KEYS_KEY,
          [],
        ),
        100,
      ),
  };
}

export function replaceLocalProgressSnapshot(
  nextSnapshot,
) {
  const source =
    isPlainObject(
      nextSnapshot,
    )
      ? nextSnapshot
      : {};

  const snapshot = {
    version: 1,

    achievements:
      normalizeStringArray(
        source.achievements,
      ),

    achievementStats:
      normalizeAchievementStats(
        source.achievementStats,
      ),

    challengeClears:
      normalizeStringArray(
        source.challengeClears,
      ),

    dailyRewards:
      isPlainObject(
        source.dailyRewards,
      )
        ? normalizeObject(
            source.dailyRewards,
          )
        : null,

    loginRewards:
      normalizeObject(
        source.loginRewards,
      ),

    firstWinDate:
      typeof source.firstWinDate ===
        "string"
        ? source.firstWinDate
        : "",

    achievementRewardClaims:
      normalizeStringArray(
        source
          .achievementRewardClaims,
      ),

    collectionRewardClaims:
      normalizeStringArray(
        source
          .collectionRewardClaims,
      ),

    challengeBonusClaims:
      normalizeStringArray(
        source
          .challengeBonusClaims,
      ),

    processedRewardBattles:
      normalizeStringArray(
        source
          .processedRewardBattles,
        200,
      ),

    rewardedBattleKeys:
      normalizeStringArray(
        source.rewardedBattleKeys,
        100,
      ),
  };

  writeJson(
    ACHIEVEMENT_STORAGE_KEY,
    snapshot.achievements,
  );

  writeJson(
    ACHIEVEMENT_STATS_KEY,
    snapshot.achievementStats,
  );

  writeJson(
    CHALLENGE_PROGRESS_KEY,
    snapshot.challengeClears,
  );

  writeOptionalJson(
    DAILY_STATE_KEY,
    snapshot.dailyRewards,
  );

  writeJson(
    LOGIN_STATE_KEY,
    snapshot.loginRewards,
  );

  if (snapshot.firstWinDate) {
    localStorage.setItem(
      FIRST_WIN_DATE_KEY,
      snapshot.firstWinDate,
    );
  } else {
    localStorage.removeItem(
      FIRST_WIN_DATE_KEY,
    );
  }

  writeJson(
    ACHIEVEMENT_REWARD_KEY,
    snapshot
      .achievementRewardClaims,
  );

  writeJson(
    COLLECTION_REWARD_KEY,
    snapshot
      .collectionRewardClaims,
  );

  writeJson(
    CHALLENGE_BONUS_KEY,
    snapshot.challengeBonusClaims,
  );

  writeJson(
    PROCESSED_BATTLES_KEY,
    snapshot
      .processedRewardBattles,
  );

  writeJson(
    REWARDED_BATTLE_KEYS_KEY,
    snapshot.rewardedBattleKeys,
  );

  notifyProgressChanged();

  return snapshot;
}