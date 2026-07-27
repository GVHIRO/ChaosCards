import cards from "../data/cards";
import packs, {
  RARITY_RANK,
} from "../data/packs";

export const COLLECTION_CHANGE_EVENT =
  "chaos-card-collection-change";

export const COIN_CHANGE_EVENT =
  "chaos-card-coins-change";

const COLLECTION_STORAGE_KEY =
  "chaosCardsCollection";

const COIN_STORAGE_KEY =
  "chaosCardsCoins";

const PACK_PITY_STORAGE_KEY =
  "chaosCardsPackPity";

const REWARDED_BATTLE_KEYS_STORAGE_KEY =
  "chaosCardsRewardedBattleKeys";

const STARTING_COINS = 500;

const BATTLE_DECK_KEY =
  "chaosCardsDeck";

const PRESET_STORAGE_KEY =
  "chaosCardsDeckPresets";

const ACTIVE_PRESET_KEY =
  "chaosCardsActivePreset";

/*
  この値を変更すると、
  新しい強制移行をもう一度実行できる。
*/
const STARTER_MIGRATION_VERSION =
  "starter-deck-v1";

const STARTER_MIGRATION_KEY =
  "chaosCardsStarterMigrationVersion";

/*
  スターターデッキ20枚。

  Commonは同名3枚まで、
  Rareは同名2枚までという
  現在のデッキルールに収まっている。
*/
const FORCED_STARTER_DECK_IDS = [
  1,
  1,
  1,

  2,
  2,
  2,

  3,
  3,

  5,
  5,
  5,

  6,
  6,

  7,
  7,
  7,

  8,
  8,

  12,
  12,
];

function readJson(key, fallbackValue) {
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

function getSavedCardId(savedCard) {
  if (
    typeof savedCard === "object" &&
    savedCard !== null
  ) {
    return savedCard.id;
  }

  return savedCard;
}

function cardExists(cardId) {
  return cards.some(
    (card) =>
      String(card.id) ===
      String(cardId),
  );
}

function getMaximumDeckCounts() {
  const maximumCounts = {};

  function inspectCardIds(savedCards) {
    if (!Array.isArray(savedCards)) {
      return;
    }

    const currentDeckCounts = {};

    savedCards.forEach(
      (savedCard) => {
        const cardId =
          getSavedCardId(savedCard);

        if (!cardExists(cardId)) {
          return;
        }

        const key =
          String(cardId);

        currentDeckCounts[key] =
          Number(
            currentDeckCounts[key] || 0,
          ) + 1;
      },
    );

    Object.entries(
      currentDeckCounts,
    ).forEach(
      ([cardId, count]) => {
        maximumCounts[cardId] =
          Math.max(
            Number(
              maximumCounts[cardId] ||
                0,
            ),
            Number(count || 0),
          );
      },
    );
  }

  const savedBattleDeck =
    readJson(
      BATTLE_DECK_KEY,
      [],
    );

  inspectCardIds(
    savedBattleDeck,
  );

  const savedPresets =
    readJson(
      PRESET_STORAGE_KEY,
      [],
    );

  if (Array.isArray(savedPresets)) {
    savedPresets.forEach(
      (preset) => {
        inspectCardIds(
          preset?.cardIds,
        );
      },
    );
  }

  return maximumCounts;
}

function createStarterCollection() {
  /*
    既存プレイヤーは、現在保存されている
    デッキをそのまま所持カードへ移行する。
  */
  const existingDeckCounts =
    getMaximumDeckCounts();

  if (
    Object.keys(
      existingDeckCounts,
    ).length > 0
  ) {
    return existingDeckCounts;
  }

  /*
    初めて遊ぶ人には20枚分の
    スターターカードを配布する。
  */
  const starterCollection = {};

  const orderedCards = [
    ...cards,
  ].sort(
    (firstCard, secondCard) => {
      return (
        (
          RARITY_RANK[
            firstCard.rarity
          ] ?? 99
        ) -
          (
            RARITY_RANK[
              secondCard.rarity
            ] ?? 99
          ) ||
        Number(firstCard.id) -
          Number(secondCard.id)
      );
    },
  );

  let remainingCards = 20;

  for (
    const card of orderedCards
  ) {
    if (remainingCards <= 0) {
      break;
    }

    let maximumCopies = 1;

    if (
      card.rarity === "Common"
    ) {
      maximumCopies = 3;
    } else if (
      card.rarity === "Rare"
    ) {
      maximumCopies = 2;
    }

    const copies = Math.min(
      maximumCopies,
      remainingCards,
    );

    starterCollection[
      String(card.id)
    ] = copies;

    remainingCards -= copies;
  }

  return starterCollection;
}

function saveCollection(
  collection,
) {
  localStorage.setItem(
    COLLECTION_STORAGE_KEY,
    JSON.stringify(collection),
  );

  window.dispatchEvent(
    new CustomEvent(
      COLLECTION_CHANGE_EVENT,
      {
        detail: collection,
      },
    ),
  );
}

function saveCoins(coins) {
  const safeCoins = Math.max(
    0,
    Math.floor(
      Number(coins) || 0,
    ),
  );

  localStorage.setItem(
    COIN_STORAGE_KEY,
    String(safeCoins),
  );

  window.dispatchEvent(
    new CustomEvent(
      COIN_CHANGE_EVENT,
      {
        detail: safeCoins,
      },
    ),
  );

  return safeCoins;
}

function savePackPity(pity) {
  const safePity = Math.max(
    0,
    Math.floor(
      Number(pity) || 0,
    ),
  );

  localStorage.setItem(
    PACK_PITY_STORAGE_KEY,
    String(safePity),
  );

  return safePity;
}
function createCollectionFromCardIds(
  cardIds,
) {
  return cardIds.reduce(
    (collection, cardId) => {
      const key =
        String(cardId);

      collection[key] =
        Number(
          collection[key] || 0,
        ) + 1;

      return collection;
    },
    {},
  );
}

/*
  カード入手システム導入時の
  強制スターターデッキ移行。

  一度実行したあとは、
  STARTER_MIGRATION_VERSIONを
  変更しない限り再実行されない。
*/
export function forceStarterDeckMigration() {
  try {
    const completedVersion =
      localStorage.getItem(
        STARTER_MIGRATION_KEY,
      );

    if (
      completedVersion ===
      STARTER_MIGRATION_VERSION
    ) {
      return {
        changed: false,
        shouldNotify: false,
      };
    }

    /*
      以前からカードやデッキの保存データを
      持っているユーザーかを確認する。
    */
    const hadExistingCardData =
      localStorage.getItem(
        COLLECTION_STORAGE_KEY,
      ) !== null ||
      localStorage.getItem(
        BATTLE_DECK_KEY,
      ) !== null ||
      localStorage.getItem(
        PRESET_STORAGE_KEY,
      ) !== null;

    const starterDeckIds =
      FORCED_STARTER_DECK_IDS.filter(
        (cardId) =>
          cardExists(cardId),
      );

    if (
      starterDeckIds.length !== 20
    ) {
      throw new Error(
        `スターターデッキが20枚ではありません：${starterDeckIds.length}枚`,
      );
    }

    /*
      現在の所持カードをすべて上書きして、
      スターターデッキ内のカードだけを
      所持状態にする。
    */
    const starterCollection =
      createCollectionFromCardIds(
        starterDeckIds,
      );

    const starterPresets = [
      {
        id: "preset-1",
        name:
          "スターターデッキ",
        cardIds:
          starterDeckIds,
      },
      {
        id: "preset-2",
        name: "デッキ2",
        cardIds: [],
      },
      {
        id: "preset-3",
        name: "デッキ3",
        cardIds: [],
      },
    ];

    /*
      所持カードを完全に上書き。
      スターター以外は未所持になる。
    */
    saveCollection(
      starterCollection,
    );

    /*
      3つのプリセットも初期化。
    */
    localStorage.setItem(
      PRESET_STORAGE_KEY,
      JSON.stringify(
        starterPresets,
      ),
    );

    /*
      プリセット1を使用中に設定。
    */
    localStorage.setItem(
      ACTIVE_PRESET_KEY,
      "preset-1",
    );

    /*
      実際のバトルで使用するデッキも
      スターターデッキへ変更。
    */
    localStorage.setItem(
      BATTLE_DECK_KEY,
      JSON.stringify(
        starterDeckIds,
      ),
    );

    /*
      すべての保存処理が成功したあとで、
      移行済みとして記録する。
    */
    localStorage.setItem(
      STARTER_MIGRATION_KEY,
      STARTER_MIGRATION_VERSION,
    );

    return {
  changed: true,

  /*
    初回ユーザーには通知しない。
    以前のカードデータを持っていた人だけ通知する。
  */
  shouldNotify:
    hadExistingCardData,

  deckName:
    "スターターデッキ",

  cardCount:
    starterDeckIds.length,

  uniqueCardCount:
    Object.keys(
      starterCollection,
    ).length,
};
  } catch (error) {
    console.error(
      "スターターデッキ移行エラー:",
      error,
    );

    return {
  changed: false,
  shouldNotify: false,

  error:
    error instanceof Error
      ? error.message
      : String(error),
};
  }
}
export function ensureCollectionInitialized() {
  if (
    localStorage.getItem(
      COLLECTION_STORAGE_KEY,
    ) === null
  ) {
    localStorage.setItem(
      COLLECTION_STORAGE_KEY,
      JSON.stringify(
        createStarterCollection(),
      ),
    );
  }

  if (
    localStorage.getItem(
      COIN_STORAGE_KEY,
    ) === null
  ) {
    localStorage.setItem(
      COIN_STORAGE_KEY,
      String(STARTING_COINS),
    );
  }

  if (
    localStorage.getItem(
      PACK_PITY_STORAGE_KEY,
    ) === null
  ) {
    localStorage.setItem(
      PACK_PITY_STORAGE_KEY,
      "0",
    );
  }
}

export function getCardCollection() {
  ensureCollectionInitialized();

  const savedCollection =
    readJson(
      COLLECTION_STORAGE_KEY,
      {},
    );

  if (
    !savedCollection ||
    typeof savedCollection !==
      "object" ||
    Array.isArray(
      savedCollection,
    )
  ) {
    return {};
  }

  const safeCollection = {};

  Object.entries(
    savedCollection,
  ).forEach(
    ([cardId, count]) => {
      if (!cardExists(cardId)) {
        return;
      }

      safeCollection[cardId] =
        Math.max(
          0,
          Math.floor(
            Number(count) || 0,
          ),
        );
    },
  );

  return safeCollection;
}
export function replaceCardCollection(
  nextCollection,
) {
  const safeCollection = {};

  if (
    nextCollection &&
    typeof nextCollection ===
      "object" &&
    !Array.isArray(nextCollection)
  ) {
    Object.entries(
      nextCollection,
    ).forEach(
      ([cardId, count]) => {
        if (!cardExists(cardId)) {
          return;
        }

        safeCollection[
          String(cardId)
        ] = Math.max(
          0,
          Math.floor(
            Number(count) || 0,
          ),
        );
      },
    );
  }

  saveCollection(
    safeCollection,
  );

  return safeCollection;
}

export function removeOwnedCardCopies(
  cardId,
  requestedAmount,
) {
  const collection =
    getCardCollection();

  const key =
    String(cardId);

  const currentCount =
    Math.max(
      0,
      Number(
        collection[key] || 0,
      ),
    );

  const safeAmount =
    Math.max(
      0,
      Math.floor(
        Number(
          requestedAmount,
        ) || 0,
      ),
    );

  const removedAmount =
    Math.min(
      currentCount,
      safeAmount,
    );

  if (removedAmount <= 0) {
    return {
      removedAmount: 0,
      remainingCount:
        currentCount,
    };
  }

  const remainingCount =
    currentCount -
    removedAmount;

  if (remainingCount > 0) {
    collection[key] =
      remainingCount;
  } else {
    delete collection[key];
  }

  saveCollection(
    collection,
  );

  return {
    removedAmount,
    remainingCount,
  };
}
export function getOwnedCardCount(
  cardId,
  collection =
    getCardCollection(),
) {
  return Math.max(
    0,
    Number(
      collection[
        String(cardId)
      ] || 0,
    ),
  );
}

export function getOwnedUniqueCardCount(
  collection =
    getCardCollection(),
) {
  return cards.filter(
    (card) =>
      getOwnedCardCount(
        card.id,
        collection,
      ) > 0,
  ).length;
}

export function getCoins() {
  ensureCollectionInitialized();

  return Math.max(
    0,
    Math.floor(
      Number(
        localStorage.getItem(
          COIN_STORAGE_KEY,
        ),
      ) || 0,
    ),
  );
}

export function addCoins(amount) {
  const safeAmount =
    Math.max(
      0,
      Math.floor(
        Number(amount) || 0,
      ),
    );

  return saveCoins(
    getCoins() + safeAmount,
  );
}

export function getPackPity() {
  ensureCollectionInitialized();

  return Math.max(
    0,
    Math.floor(
      Number(
        localStorage.getItem(
          PACK_PITY_STORAGE_KEY,
        ),
      ) || 0,
    ),
  );
}

function rollRarity(
  odds,
  minimumRarity = "Common",
) {
  const minimumRank =
    RARITY_RANK[
      minimumRarity
    ] ?? 0;

  const entries =
    Object.entries(odds).filter(
      ([rarity, weight]) =>
        (
          RARITY_RANK[
            rarity
          ] ?? -1
        ) >= minimumRank &&
        Number(weight) > 0,
    );

  const totalWeight =
    entries.reduce(
      (total, [, weight]) =>
        total +
        Number(weight),
      0,
    );

  let roll =
    Math.random() *
    totalWeight;

  for (
    const [rarity, weight]
    of entries
  ) {
    roll -= Number(weight);

    if (roll <= 0) {
      return rarity;
    }
  }

  return (
    entries[
      entries.length - 1
    ]?.[0] ??
    minimumRarity
  );
}

function pickRandomCardByRarity(
  rarity,
) {
  let candidates =
    cards.filter(
      (card) =>
        card.rarity === rarity,
    );

  if (
    candidates.length === 0
  ) {
    const minimumRank =
      RARITY_RANK[rarity] ?? 0;

    candidates =
      cards.filter(
        (card) =>
          (
            RARITY_RANK[
              card.rarity
            ] ?? 0
          ) >= minimumRank,
      );
  }

  if (
    candidates.length === 0
  ) {
    candidates = cards;
  }

  return candidates[
    Math.floor(
      Math.random() *
        candidates.length,
    )
  ];
}

export function openCardPack(
  packId,
) {
  ensureCollectionInitialized();

  const pack =
    packs.find(
      (currentPack) =>
        currentPack.id ===
        packId,
    );

  if (!pack) {
    return {
      ok: false,
      message:
        "パックが見つかりません",
    };
  }

  const currentCoins =
    getCoins();

  if (
    currentCoins <
    pack.price
  ) {
    return {
      ok: false,
      message:
        "コインが足りません",
    };
  }

  const currentPity =
    getPackPity();

  const forceEpic =
    currentPity >=
    pack.pityEpicAfter - 1;

  const collection =
    getCardCollection();

  const results = [];

  for (
    let index = 0;
    index <
    pack.cardCount;
    index += 1
  ) {
    const isGuaranteedSlot =
      index ===
      pack.cardCount - 1;

    const minimumRarity =
      isGuaranteedSlot
        ? forceEpic
          ? "Epic"
          : pack.guaranteedRarity
        : "Common";

    const rarity =
      rollRarity(
        pack.odds,
        minimumRarity,
      );

    const card =
      pickRandomCardByRarity(
        rarity,
      );

    const cardId =
      String(card.id);

    const previousOwned =
      Number(
        collection[cardId] || 0,
      );

    const ownedAfter =
      previousOwned + 1;

    collection[cardId] =
      ownedAfter;

    results.push({
      card,
      previousOwned,
      ownedAfter,
      isNew:
        previousOwned === 0,
    });
  }

  const containsEpicOrHigher =
    results.some(
      ({ card }) =>
        (
          RARITY_RANK[
            card.rarity
          ] ?? 0
        ) >=
        RARITY_RANK.Epic,
    );

  const nextPity =
    containsEpicOrHigher
      ? 0
      : currentPity + 1;

  saveCollection(collection);

  const remainingCoins =
    saveCoins(
      currentCoins -
        pack.price,
    );

  savePackPity(
    nextPity,
  );

  return {
    ok: true,
    pack,
    results,
    remainingCoins,
    pity: nextPity,
    forcedEpic:
      forceEpic,
  };
}

function getRewardedBattleKeys() {
  const saved =
    readJson(
      REWARDED_BATTLE_KEYS_STORAGE_KEY,
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

function markRewardedBattle(
  rewardKey,
) {
  if (!rewardKey) {
    return;
  }

  const currentKeys =
    getRewardedBattleKeys();

  const nextKeys = [
    ...new Set([
      ...currentKeys,
      rewardKey,
    ]),
  ].slice(-100);

  localStorage.setItem(
    REWARDED_BATTLE_KEYS_STORAGE_KEY,
    JSON.stringify(nextKeys),
  );
}

export function recordBattleCoinReward({
  result,
  mode,
  challengeId = null,
  rewardKey = null,
}) {
  if (
    rewardKey &&
    getRewardedBattleKeys().includes(
      rewardKey,
    )
  ) {
    return 0;
  }

  let reward = 0;

  if (
    challengeId &&
    result === "player"
  ) {
    const challengeRewardKey =
      `challenge:${challengeId}`;

    if (
      getRewardedBattleKeys().includes(
        challengeRewardKey,
      )
    ) {
      return 0;
    }

    reward = 100;

    markRewardedBattle(
      challengeRewardKey,
    );
  } else if (
    mode === "online"
  ) {
    reward =
      result === "player"
        ? 40
        : 15;
  } else if (
    mode === "cpu" &&
    result === "player"
  ) {
    reward = 20;
  }

  if (reward <= 0) {
    return 0;
  }

  if (rewardKey) {
    markRewardedBattle(
      rewardKey,
    );
  }

  addCoins(reward);

  return reward;
}