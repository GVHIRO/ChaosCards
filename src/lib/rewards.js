import cards from "../data/cards";
import achievements from
  "../data/achievements";
import challenges from
  "../data/challenges";
  import {
  notifyProgressChanged,
} from "./progressStorage";
import {
  ACHIEVEMENT_COIN_REWARDS,
  CHALLENGE_BONUSES,
  COLLECTION_REWARDS,
  DAILY_COMPLETION_BONUS,
  DAILY_FIRST_WIN_REWARD,
  DAILY_LOGIN_REWARDS,
  DAILY_MISSION_POOL,
  DUPLICATE_EXCHANGE_VALUES,
  DUPLICATE_KEEP_COUNTS,
} from "../data/rewards";

import {
  getUnlockedAchievementIds,
} from "./achievements";

import {
  addCoins,
  getCardCollection,
  getCoins,
  getOwnedUniqueCardCount,
  removeOwnedCardCopies,
  recordBattleCoinReward,
} from "./collection";

export const REWARD_CHANGE_EVENT =
  "chaos-reward-change";

export const REWARD_TOAST_EVENT =
  "chaos-reward-toast";

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

function saveJson(
  key,
  value,
) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify(value),
    );

    notifyProgressChanged();

    return true;
  } catch (error) {
    console.error(
      `${key}の保存エラー:`,
      error,
    );

    return false;
  }
}

function getLocalDateKey() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1,
    ).padStart(2, "0");

  const day =
    String(
      now.getDate(),
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function emitRewardChange() {
  window.dispatchEvent(
    new CustomEvent(
      REWARD_CHANGE_EVENT,
    ),
  );
}

function emitRewardToast(
  label,
  amount,
) {
  window.dispatchEvent(
    new CustomEvent(
      REWARD_TOAST_EVENT,
      {
        detail: {
          label,
          amount,
        },
      },
    ),
  );
}

function grantCoins(
  amount,
  label,
  options = {},
) {
  const {
    showToast = true,
  } = options;

  const safeAmount =
    Math.max(
      0,
      Math.floor(
        Number(amount) || 0,
      ),
    );

  if (safeAmount <= 0) {
    return 0;
  }

  addCoins(
    safeAmount,
  );

  if (showToast) {
    emitRewardToast(
      label,
      safeAmount,
    );
  }

  emitRewardChange();

  return safeAmount;
}

function createSeed(
  text,
) {
  let value = 0;

  for (
    let index = 0;
    index < text.length;
    index += 1
  ) {
    value =
      (
        value * 31 +
        text.charCodeAt(index)
      ) >>> 0;
  }

  return value;
}

function createRandom(
  seed,
) {
  let value =
    seed || 1;

  return () => {
    value =
      (
        value * 1664525 +
        1013904223
      ) >>> 0;

    return (
      value /
      4294967296
    );
  };
}

export function getTodayMissions() {
  const date =
    getLocalDateKey();

  const random =
    createRandom(
      createSeed(date),
    );

  const shuffled = [
    ...DAILY_MISSION_POOL,
  ];

  for (
    let index =
      shuffled.length - 1;
    index > 0;
    index -= 1
  ) {
    const targetIndex =
      Math.floor(
        random() *
          (index + 1),
      );

    [
      shuffled[index],
      shuffled[targetIndex],
    ] = [
      shuffled[targetIndex],
      shuffled[index],
    ];
  }

  return shuffled.slice(
    0,
    3,
  );
}

function createDailyState() {
  return {
    date:
      getLocalDateKey(),

    progress: {},

    claimedMissionIds: [],

    completionBonusClaimed:
      false,
  };
}

function getDailyState() {
  const today =
    getLocalDateKey();

  const saved =
    readJson(
      DAILY_STATE_KEY,
      null,
    );

  if (
    !saved ||
    saved.date !== today
  ) {
    const nextState =
      createDailyState();

    saveJson(
      DAILY_STATE_KEY,
      nextState,
    );

    return nextState;
  }

  return {
    date: today,

    progress:
      saved.progress &&
      typeof saved.progress ===
        "object"
        ? saved.progress
        : {},

    claimedMissionIds:
      Array.isArray(
        saved.claimedMissionIds,
      )
        ? saved.claimedMissionIds
        : [],

    completionBonusClaimed:
      Boolean(
        saved.completionBonusClaimed,
      ),
  };
}

function saveDailyState(
  state,
) {
  saveJson(
    DAILY_STATE_KEY,
    state,
  );

  emitRewardChange();
}

function addDailyProgress(
  metrics,
) {
  const state =
    getDailyState();

  const missions =
    getTodayMissions();

  const nextProgress = {
    ...state.progress,
  };

  missions.forEach(
    (mission) => {
      const increase =
        Math.max(
          0,
          Number(
            metrics[
              mission.metric
            ] || 0,
          ),
        );

      if (increase <= 0) {
        return;
      }

      nextProgress[
        mission.id
      ] = Math.min(
        mission.target,
        Number(
          nextProgress[
            mission.id
          ] || 0,
        ) + increase,
      );
    },
  );

  saveDailyState({
    ...state,
    progress:
      nextProgress,
  });
}

export function recordRewardActivity({
  type,
  amount = 1,
}) {
  const metricMap = {
    packOpened:
      "packsOpened",
  };

  const metric =
    metricMap[type];

  if (!metric) {
    return;
  }

  addDailyProgress({
    [metric]:
      Math.max(
        0,
        Number(amount) || 0,
      ),
  });
}

export function getDailyMissionStatus() {
  const state =
    getDailyState();

  return getTodayMissions().map(
    (mission) => {
      const progress =
        Math.min(
          mission.target,
          Math.max(
            0,
            Number(
              state.progress[
                mission.id
              ] || 0,
            ),
          ),
        );

      const completed =
        progress >=
        mission.target;

      const claimed =
        state.claimedMissionIds.includes(
          mission.id,
        );

      return {
        ...mission,
        progress,
        completed,
        claimed,
        canClaim:
          completed &&
          !claimed,
      };
    },
  );
}

export function claimDailyMission(
  missionId,
  options = {},
) {
  const state =
    getDailyState();

  const mission =
    getDailyMissionStatus().find(
      (currentMission) =>
        currentMission.id ===
        missionId,
    );

  if (!mission) {
    return {
      ok: false,
      message:
        "ミッションが見つかりません",
    };
  }

  if (!mission.completed) {
    return {
      ok: false,
      message:
        "まだ達成していません",
    };
  }

  if (mission.claimed) {
    return {
      ok: false,
      message:
        "受け取り済みです",
    };
  }

  saveDailyState({
    ...state,

    claimedMissionIds: [
      ...state.claimedMissionIds,
      mission.id,
    ],
  });

grantCoins(
  mission.reward,
  mission.title,
  options,
);

  return {
    ok: true,
    amount:
      mission.reward,
    message:
      `${mission.reward}コインを受け取りました`,
  };
}

export function getDailyCompletionStatus() {
  const state =
    getDailyState();

  const missions =
    getDailyMissionStatus();

  const completed =
    missions.length > 0 &&
    missions.every(
      (mission) =>
        mission.completed,
    );

  return {
    completed,
    claimed:
      state.completionBonusClaimed,
    canClaim:
      completed &&
      !state.completionBonusClaimed,
    reward:
      DAILY_COMPLETION_BONUS,
  };
}

export function claimDailyCompletionBonus(
  options = {},
) {
  const state =
    getDailyState();

  const status =
    getDailyCompletionStatus();

  if (!status.completed) {
    return {
      ok: false,
      message:
        "デイリーミッションをすべて達成してください",
    };
  }

  if (status.claimed) {
    return {
      ok: false,
      message:
        "受け取り済みです",
    };
  }

  saveDailyState({
    ...state,
    completionBonusClaimed:
      true,
  });

  grantCoins(
  DAILY_COMPLETION_BONUS,
  "デイリー全達成",
  options,
);

  return {
    ok: true,
    amount:
      DAILY_COMPLETION_BONUS,
    message:
      `${DAILY_COMPLETION_BONUS}コインを受け取りました`,
  };
}

function getLoginState() {
  const saved =
    readJson(
      LOGIN_STATE_KEY,
      {},
    );

  return {
    lastClaimDate:
      typeof saved
        ?.lastClaimDate ===
        "string"
        ? saved.lastClaimDate
        : "",

    totalClaims:
      Math.max(
        0,
        Math.floor(
          Number(
            saved?.totalClaims,
          ) || 0,
        ),
      ),
  };
}

export function getDailyLoginStatus() {
  const state =
    getLoginState();

  const today =
    getLocalDateKey();

  const canClaim =
    state.lastClaimDate !==
    today;

  /*
    totalClaimsは、これまでに
    受け取った合計日数。
  */
  const nextRewardIndex =
    state.totalClaims %
    DAILY_LOGIN_REWARDS.length;

  const lastClaimedIndex =
    state.totalClaims > 0
      ? (
          state.totalClaims - 1
        ) %
        DAILY_LOGIN_REWARDS.length
      : -1;

  /*
    現在の7日周期内で
    何日分受け取っているか。
  */
  let claimedCountInCycle =
    state.totalClaims %
    DAILY_LOGIN_REWARDS.length;

  /*
    7日目を今日受け取った直後は、
    余りが0になるので7日分として表示する。
  */
  if (
    !canClaim &&
    state.totalClaims > 0 &&
    claimedCountInCycle === 0
  ) {
    claimedCountInCycle =
      DAILY_LOGIN_REWARDS.length;
  }

  /*
    次の日になったら、
    新しい7日周期の1日目として表示する。
  */
  if (
    canClaim &&
    claimedCountInCycle ===
      DAILY_LOGIN_REWARDS.length
  ) {
    claimedCountInCycle = 0;
  }

  const activeIndex =
    canClaim
      ? nextRewardIndex
      : lastClaimedIndex;

  const rewardItems =
    DAILY_LOGIN_REWARDS.map(
      (reward, index) => {
        const claimed =
          index <
          claimedCountInCycle;

        const isActive =
          index ===
          activeIndex;

        return {
          dayNumber:
            index + 1,

          reward,

          claimed,

          isActive,

          canClaim:
            canClaim &&
            index ===
              nextRewardIndex,

          claimedToday:
            !canClaim &&
            index ===
              lastClaimedIndex,
        };
      },
    );

  return {
    dayNumber:
      activeIndex + 1,

    nextDayNumber:
      nextRewardIndex + 1,

    reward:
      canClaim
        ? DAILY_LOGIN_REWARDS[
            nextRewardIndex
          ]
        : DAILY_LOGIN_REWARDS[
            lastClaimedIndex
          ] ?? 0,

    canClaim,

    claimedToday:
      !canClaim,

    totalClaims:
      state.totalClaims,

    rewards:
      DAILY_LOGIN_REWARDS,

    rewardItems,
  };
}

export function claimDailyLogin(
  options = {},
) {
  const state =
    getLoginState();

  const status =
    getDailyLoginStatus();

  if (!status.canClaim) {
    return {
      ok: false,
      message:
        "本日のログイン報酬は受け取り済みです",
    };
  }

  saveJson(
    LOGIN_STATE_KEY,
    {
      lastClaimDate:
        getLocalDateKey(),

      totalClaims:
        state.totalClaims + 1,
    },
  );

  grantCoins(
  status.reward,
  `ログイン${status.dayNumber}日目`,
  options,
);

  return {
    ok: true,
    amount:
      status.reward,
    message:
      `${status.reward}コインを受け取りました`,
  };
}

function getStringArray(
  key,
) {
  const saved =
    readJson(
      key,
      [],
    );

  return Array.isArray(saved)
    ? saved.filter(
        (value) =>
          typeof value ===
          "string",
      )
    : [];
}

export function getAchievementRewardState(
  achievementId,
) {
  const amount =
    Number(
      ACHIEVEMENT_COIN_REWARDS[
        achievementId
      ] || 0,
    );

  const unlocked =
    getUnlockedAchievementIds()
      .includes(
        achievementId,
      );

  const claimed =
    getStringArray(
      ACHIEVEMENT_REWARD_KEY,
    ).includes(
      achievementId,
    );

  return {
    amount,
    unlocked,
    claimed,
    canClaim:
      amount > 0 &&
      unlocked &&
      !claimed,
  };
}

export function claimAchievementReward(
  achievementId,
  options = {},
) {
  const achievement =
    achievements.find(
      (currentAchievement) =>
        currentAchievement.id ===
        achievementId,
    );

  const status =
    getAchievementRewardState(
      achievementId,
    );

  if (
    !achievement ||
    status.amount <= 0
  ) {
    return {
      ok: false,
      message:
        "実績報酬が見つかりません",
    };
  }

  if (!status.unlocked) {
    return {
      ok: false,
      message:
        "実績が未解除です",
    };
  }

  if (status.claimed) {
    return {
      ok: false,
      message:
        "受け取り済みです",
    };
  }

  const claimedIds =
    getStringArray(
      ACHIEVEMENT_REWARD_KEY,
    );

  saveJson(
    ACHIEVEMENT_REWARD_KEY,
    [
      ...claimedIds,
      achievementId,
    ],
  );

  grantCoins(
  status.amount,
  `実績「${achievement.title}」`,
  options,
);

  return {
    ok: true,
    amount:
      status.amount,
    message:
      `${status.amount}コインを受け取りました`,
  };
}

export function getCollectionRewardStatus() {
  const ownedCount =
    getOwnedUniqueCardCount();

  const claimedThresholds =
    getStringArray(
      COLLECTION_REWARD_KEY,
    );

  return COLLECTION_REWARDS.map(
    (rewardData) => {
      const key =
        String(
          rewardData.threshold,
        );

      const completed =
        ownedCount >=
        rewardData.threshold;

      const claimed =
        claimedThresholds.includes(
          key,
        );

      return {
        ...rewardData,
        ownedCount,
        completed,
        claimed,
        canClaim:
          completed &&
          !claimed,
      };
    },
  );
}

export function claimCollectionReward(
  threshold,
  options = {},
) {
  const target =
    getCollectionRewardStatus()
      .find(
        (rewardData) =>
          rewardData.threshold ===
          Number(threshold),
      );

  if (!target) {
    return {
      ok: false,
      message:
        "収集報酬が見つかりません",
    };
  }

  if (!target.completed) {
    return {
      ok: false,
      message:
        "必要なカード種類数に達していません",
    };
  }

  if (target.claimed) {
    return {
      ok: false,
      message:
        "受け取り済みです",
    };
  }

  const claimedThresholds =
    getStringArray(
      COLLECTION_REWARD_KEY,
    );

  saveJson(
    COLLECTION_REWARD_KEY,
    [
      ...claimedThresholds,
      String(target.threshold),
    ],
  );

  grantCoins(
  target.reward,
  `カード${target.threshold}種類収集`,
  options,
);

  return {
    ok: true,
    amount:
      target.reward,
    message:
      `${target.reward}コインを受け取りました`,
  };
}

export function getDuplicateExchangeCards() {
  const collection =
    getCardCollection();

  return cards
    .map((card) => {
      const ownedCount =
        Math.max(
          0,
          Number(
            collection[
              String(card.id)
            ] || 0,
          ),
        );

      const keepCount =
        Number(
          DUPLICATE_KEEP_COUNTS[
            card.rarity
          ] || 1,
        );

      const extraCount =
        Math.max(
          0,
          ownedCount -
            keepCount,
        );

      const valuePerCard =
        Number(
          DUPLICATE_EXCHANGE_VALUES[
            card.rarity
          ] || 0,
        );

      return {
        card,
        ownedCount,
        keepCount,
        extraCount,
        valuePerCard,
        totalValue:
          extraCount *
          valuePerCard,
      };
    })
    .filter(
      (item) =>
        item.extraCount > 0 &&
        item.valuePerCard > 0,
    )
    .sort(
      (firstItem, secondItem) =>
        secondItem.totalValue -
        firstItem.totalValue,
    );
}

export function exchangeDuplicateCard(
  cardId,
) {
  const target =
    getDuplicateExchangeCards()
      .find(
        (item) =>
          String(
            item.card.id,
          ) ===
          String(cardId),
      );

  if (!target) {
    return {
      ok: false,
      message:
        "交換できる余剰カードがありません",
    };
  }

  const removal =
    removeOwnedCardCopies(
      target.card.id,
      target.extraCount,
    );

  const reward =
    removal.removedAmount *
    target.valuePerCard;

  if (reward <= 0) {
    return {
      ok: false,
      message:
        "カードを交換できませんでした",
    };
  }

  grantCoins(
    reward,
    `${target.card.name}を交換`,
  );

  return {
    ok: true,
    amount:
      reward,
    removedAmount:
      removal.removedAmount,
    message:
      `${removal.removedAmount}枚を${reward}コインへ交換しました`,
  };
}

function getProcessedBattleKeys() {
  return getStringArray(
    PROCESSED_BATTLES_KEY,
  );
}

function markBattleProcessed(
  rewardKey,
) {
  if (!rewardKey) {
    return;
  }

  const keys =
    getProcessedBattleKeys();

  saveJson(
    PROCESSED_BATTLES_KEY,
    [
      ...new Set([
        ...keys,
        rewardKey,
      ]),
    ].slice(-200),
  );
}

function getChallengeBonusKeys() {
  return getStringArray(
    CHALLENGE_BONUS_KEY,
  );
}
export function getChallengeRewardProgress() {
  const claimedKeys =
    new Set(
      getChallengeBonusKeys(),
    );

  return CHALLENGE_BONUSES.map(
    (bonus) => {
      const stageStatuses =
        challenges.map(
          (challenge) => {
            const claimKey =
              `${challenge.id}:${bonus.id}`;

            return {
              id:
                challenge.id,

              number:
                challenge.number,

              title:
                challenge.title,

              claimed:
                claimedKeys.has(
                  claimKey,
                ),
            };
          },
        );

      const claimedCount =
        stageStatuses.filter(
          (stage) =>
            stage.claimed,
        ).length;

      return {
        ...bonus,

        claimedCount,

        totalCount:
          challenges.length,

        hasClaimed:
          claimedCount > 0,

        completed:
          claimedCount >=
          challenges.length,

        stageStatuses,
      };
    },
  );
}
function markChallengeBonus(
  bonusKey,
) {
  const keys =
    getChallengeBonusKeys();

  saveJson(
    CHALLENGE_BONUS_KEY,
    [
      ...new Set([
        ...keys,
        bonusKey,
      ]),
    ],
  );
}

export function recordBattleRewards({
  result,
  mode,
  challengeId = null,

  remainingHp = 0,
  turnCount = 999,
  usedHeal = false,
  cardsPlayed = 0,

  rewardKey = null,
}) {
  if (
    rewardKey &&
    getProcessedBattleKeys()
      .includes(rewardKey)
  ) {
    return [];
  }

  const isVictory =
    result === "player";

  addDailyProgress({
    battlePlayed: 1,

    battleWins:
      isVictory ? 1 : 0,

    cardsPlayed:
      Math.max(
        0,
        Number(cardsPlayed) || 0,
      ),

    challengePlayed:
      challengeId ? 1 : 0,

    onlinePlayed:
      mode === "online"
        ? 1
        : 0,
  });

  const rewards = [];

  const baseReward =
    recordBattleCoinReward({
      result,
      mode,
      challengeId,
      rewardKey:
        mode === "online"
          ? rewardKey
          : null,
    });

  if (baseReward > 0) {
    const label =
      challengeId
        ? "チャレンジ初回クリア"
        : mode === "online"
          ? isVictory
            ? "オンライン勝利"
            : "オンライン参加"
          : "CPU勝利";

    emitRewardToast(
      label,
      baseReward,
    );

    rewards.push({
      label,
      amount:
        baseReward,
    });
  }

  if (isVictory) {
    const today =
      getLocalDateKey();

    const lastFirstWinDate =
      localStorage.getItem(
        FIRST_WIN_DATE_KEY,
      );

    if (
      lastFirstWinDate !==
      today
    ) {
      localStorage.setItem(
        FIRST_WIN_DATE_KEY,
        today,
      );
notifyProgressChanged();
      const amount =
        grantCoins(
          DAILY_FIRST_WIN_REWARD,
          "本日の初勝利",
        );

      rewards.push({
        label:
          "本日の初勝利",
        amount,
      });
    }
  }

  if (
    challengeId &&
    isVictory
  ) {
    const completedConditions = {
      "hp-20":
        Number(remainingHp) >= 20,

      "speed-clear":
        Number(turnCount) <= 10,

      "no-heal":
        !usedHeal,
    };

    completedConditions.complete =
      completedConditions[
        "hp-20"
      ] &&
      completedConditions[
        "speed-clear"
      ] &&
      completedConditions[
        "no-heal"
      ];

    const claimedKeys =
      new Set(
        getChallengeBonusKeys(),
      );

    CHALLENGE_BONUSES.forEach(
      (bonus) => {
        if (
          !completedConditions[
            bonus.id
          ]
        ) {
          return;
        }

        const bonusKey =
          `${challengeId}:${bonus.id}`;

        if (
          claimedKeys.has(
            bonusKey,
          )
        ) {
          return;
        }

        markChallengeBonus(
          bonusKey,
        );

        const amount =
          grantCoins(
            bonus.reward,
            bonus.title,
          );

        rewards.push({
          label:
            bonus.title,
          amount,
        });
      },
    );
  }

  if (rewardKey) {
    markBattleProcessed(
      rewardKey,
    );
  }

  emitRewardChange();

  return rewards;
}
export function claimAllAvailableRewards() {
  const claimedRewards = [];

  /*
    個別通知を止めて、
    最後に合計通知を1回だけ表示する。
  */
  const silentOptions = {
    showToast: false,
  };

  const loginStatus =
    getDailyLoginStatus();

  if (loginStatus.canClaim) {
    const result =
      claimDailyLogin(
        silentOptions,
      );

    if (result.ok) {
      claimedRewards.push({
        label:
          "ログインボーナス",
        amount:
          result.amount,
      });
    }
  }

  const claimableMissions =
    getDailyMissionStatus()
      .filter(
        (mission) =>
          mission.canClaim,
      );

  claimableMissions.forEach(
    (mission) => {
      const result =
        claimDailyMission(
          mission.id,
          silentOptions,
        );

      if (result.ok) {
        claimedRewards.push({
          label:
            mission.title,
          amount:
            result.amount,
        });
      }
    },
  );

  /*
    ミッション処理後に再取得する。
  */
  const completionStatus =
    getDailyCompletionStatus();

  if (
    completionStatus.canClaim
  ) {
    const result =
      claimDailyCompletionBonus(
        silentOptions,
      );

    if (result.ok) {
      claimedRewards.push({
        label:
          "デイリー全達成",
        amount:
          result.amount,
      });
    }
  }

  achievements.forEach(
    (achievement) => {
      const status =
        getAchievementRewardState(
          achievement.id,
        );

      if (!status.canClaim) {
        return;
      }

      const result =
        claimAchievementReward(
          achievement.id,
          silentOptions,
        );

      if (result.ok) {
        claimedRewards.push({
          label:
            `実績「${achievement.title}」`,
          amount:
            result.amount,
        });
      }
    },
  );

  getCollectionRewardStatus()
    .filter(
      (rewardData) =>
        rewardData.canClaim,
    )
    .forEach(
      (rewardData) => {
        const result =
          claimCollectionReward(
            rewardData.threshold,
            silentOptions,
          );

        if (result.ok) {
          claimedRewards.push({
            label:
              `${rewardData.threshold}種類収集`,
            amount:
              result.amount,
          });
        }
      },
    );

  const totalAmount =
    claimedRewards.reduce(
      (total, reward) =>
        total +
        Number(
          reward.amount || 0,
        ),
      0,
    );

  if (
    claimedRewards.length === 0 ||
    totalAmount <= 0
  ) {
    return {
      ok: false,
      amount: 0,
      count: 0,
      rewards: [],
      message:
        "受け取れる報酬はありません",
    };
  }

  emitRewardToast(
    `${claimedRewards.length}件を一括受取`,
    totalAmount,
  );

  emitRewardChange();

  return {
    ok: true,
    amount:
      totalAmount,
    count:
      claimedRewards.length,
    rewards:
      claimedRewards,
    message:
      `${claimedRewards.length}件の報酬から、合計${totalAmount}コインを受け取りました！`,
  };
}
export function getRewardsSnapshot() {
  const dailyMissions =
    getDailyMissionStatus();

  const dailyCompletion =
    getDailyCompletionStatus();

  const dailyLogin =
    getDailyLoginStatus();

  const unlockedIds =
    new Set(
      getUnlockedAchievementIds(),
    );

  const achievementRewards =
    achievements.map(
      (achievement) => {
        const status =
          getAchievementRewardState(
            achievement.id,
          );

        return {
          achievement,
          ...status,
          unlocked:
            unlockedIds.has(
              achievement.id,
            ),
        };
      },
    );

  const collectionRewards =
    getCollectionRewardStatus();

  const duplicates =
    getDuplicateExchangeCards();

  const claimableCount =
  (
    dailyLogin.canClaim
      ? 1
      : 0
  ) +
  dailyMissions.filter(
    (mission) =>
      mission.canClaim,
  ).length +
  (
    dailyCompletion.canClaim
      ? 1
      : 0
  ) +
  achievementRewards.filter(
    (reward) =>
      reward.canClaim,
  ).length +
  collectionRewards.filter(
    (reward) =>
      reward.canClaim,
  ).length;

  return {
  coins:
    getCoins(),

  dailyLogin,
  dailyMissions,
  dailyCompletion,

  achievementRewards,
  collectionRewards,

  duplicates,

  exchangeableCount:
    duplicates.length,

  ownedUniqueCards:
    getOwnedUniqueCardCount(),

  claimableCount,

  challengeBonuses:
    getChallengeRewardProgress(),
};
}

export function getClaimableRewardCount() {
  return (
    getRewardsSnapshot()
      .claimableCount
  );
}

export function initializeRewards() {
  return getRewardsSnapshot();
}