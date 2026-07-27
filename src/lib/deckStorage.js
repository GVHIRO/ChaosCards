import cards from
  "../data/cards";

export const DECK_CHANGE_EVENT =
  "chaos-card-deck-change";

export const PRESET_STORAGE_KEY =
  "chaosCardsDeckPresets";

export const ACTIVE_PRESET_KEY =
  "chaosCardsActivePreset";

export const BATTLE_DECK_KEY =
  "chaosCardsDeck";

const PRESET_COUNT = 3;
const DECK_SIZE = 20;

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

function getSavedCardId(
  savedCard,
) {
  if (
    typeof savedCard ===
      "object" &&
    savedCard !== null
  ) {
    return savedCard.id;
  }

  return savedCard;
}

function cardExists(
  cardId,
) {
  return cards.some(
    (card) =>
      String(card.id) ===
      String(cardId),
  );
}

export function sanitizeDeckCardIds(
  savedCards,
) {
  if (!Array.isArray(savedCards)) {
    return [];
  }

  return savedCards
    .map(getSavedCardId)
    .filter(cardExists)
    .slice(0, DECK_SIZE);
}

export function createDefaultDeckPresets() {
  return Array.from(
    {
      length: PRESET_COUNT,
    },
    (_, index) => ({
      id:
        `preset-${index + 1}`,

      name:
        `デッキ${index + 1}`,

      cardIds: [],
    }),
  );
}

function normalizeDeckPresets(
  savedPresets,
) {
  const defaults =
    createDefaultDeckPresets();

  if (!Array.isArray(savedPresets)) {
    return defaults;
  }

  return defaults.map(
    (
      defaultPreset,
      index,
    ) => {
      const savedPreset =
        savedPresets.find(
          (preset) =>
            preset?.id ===
            defaultPreset.id,
        ) ??
        savedPresets[index];

      const savedName =
        typeof savedPreset?.name ===
          "string"
          ? savedPreset.name
              .trim()
              .slice(0, 16)
          : "";

      return {
        id:
          defaultPreset.id,

        name:
          savedName ||
          defaultPreset.name,

        cardIds:
          sanitizeDeckCardIds(
            savedPreset?.cardIds,
          ),
      };
    },
  );
}

export function getLocalDeckSnapshot() {
  const savedPresets =
    readJson(
      PRESET_STORAGE_KEY,
      null,
    );

  let presets =
    normalizeDeckPresets(
      savedPresets,
    );

  /*
    古い1デッキ形式からの移行。
  */
  if (!Array.isArray(savedPresets)) {
    const legacyDeck =
      sanitizeDeckCardIds(
        readJson(
          BATTLE_DECK_KEY,
          [],
        ),
      );

    if (legacyDeck.length > 0) {
      presets = [
        {
          ...presets[0],
          name: "メインデッキ",
          cardIds: legacyDeck,
        },
        presets[1],
        presets[2],
      ];
    }
  }

  const savedActivePresetId =
    localStorage.getItem(
      ACTIVE_PRESET_KEY,
    );

  const activePresetId =
    presets.some(
      (preset) =>
        preset.id ===
        savedActivePresetId,
    )
      ? savedActivePresetId
      : "preset-1";

  const activePreset =
    presets.find(
      (preset) =>
        preset.id ===
        activePresetId,
    ) ?? presets[0];

  let activeCardIds =
    sanitizeDeckCardIds(
      readJson(
        BATTLE_DECK_KEY,
        [],
      ),
    );

  /*
    実戦用デッキがない場合は、
    使用中プリセットが20枚なら復元する。
  */
  if (
    activeCardIds.length !==
      DECK_SIZE &&
    activePreset.cardIds.length ===
      DECK_SIZE
  ) {
    activeCardIds = [
      ...activePreset.cardIds,
    ];
  }

  return {
    presets,
    activePresetId,
    activeCardIds,
  };
}

export function replaceLocalDeckSnapshot(
  nextSnapshot,
) {
  const presets =
    normalizeDeckPresets(
      nextSnapshot?.presets,
    );

  const requestedActivePresetId =
    nextSnapshot
      ?.activePresetId;

  const activePresetId =
    presets.some(
      (preset) =>
        preset.id ===
        requestedActivePresetId,
    )
      ? requestedActivePresetId
      : "preset-1";

  const activePreset =
    presets.find(
      (preset) =>
        preset.id ===
        activePresetId,
    ) ?? presets[0];

  let activeCardIds =
    sanitizeDeckCardIds(
      nextSnapshot
        ?.activeCardIds,
    );

  if (
    activeCardIds.length !==
      DECK_SIZE
  ) {
    activeCardIds =
      activePreset.cardIds
        .length === DECK_SIZE
        ? [
            ...activePreset.cardIds,
          ]
        : [];
  }

  localStorage.setItem(
    PRESET_STORAGE_KEY,
    JSON.stringify(presets),
  );

  localStorage.setItem(
    ACTIVE_PRESET_KEY,
    activePresetId,
  );

  localStorage.setItem(
    BATTLE_DECK_KEY,
    JSON.stringify(
      activeCardIds,
    ),
  );

  const snapshot = {
    presets,
    activePresetId,
    activeCardIds,
  };

  window.dispatchEvent(
    new CustomEvent(
      DECK_CHANGE_EVENT,
      {
        detail: snapshot,
      },
    ),
  );

  return snapshot;
}

export function notifyDeckChanged() {
  const snapshot =
    getLocalDeckSnapshot();

  window.dispatchEvent(
    new CustomEvent(
      DECK_CHANGE_EVENT,
      {
        detail: snapshot,
      },
    ),
  );

  return snapshot;
}