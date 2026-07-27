import "./DeckBuilder.css";
import { useEffect, useMemo, useState } from "react";
import cards from "../data/cards";
import {
  COLLECTION_CHANGE_EVENT,
  ensureCollectionInitialized,
  getCardCollection,
  getOwnedCardCount,
} from "../lib/collection";
import {
  notifyDeckChanged,
} from "../lib/deckStorage";
const DECK_SIZE = 20;
const PRESET_COUNT = 3;

const PRESET_STORAGE_KEY =
  "chaosCardsDeckPresets";

const ACTIVE_PRESET_KEY =
  "chaosCardsActivePreset";

const BATTLE_DECK_KEY =
  "chaosCardsDeck";

function createDefaultPresets() {
  return Array.from(
    { length: PRESET_COUNT },
    (_, index) => ({
      id: `preset-${index + 1}`,
      name: `デッキ${index + 1}`,
      cardIds: [],
    })
  );
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

function sanitizeCardIds(savedCards) {
  if (!Array.isArray(savedCards)) {
    return [];
  }

  return savedCards
    .map(getSavedCardId)
    .filter((savedId) =>
      cards.some(
        (card) =>
          String(card.id) ===
          String(savedId)
      )
    );
}

function cardIdsToDeck(cardIds) {
  return sanitizeCardIds(cardIds)
    .map((cardId) =>
      cards.find(
        (card) =>
          String(card.id) ===
          String(cardId)
      )
    )
    .filter(Boolean);
}

function deckToCardIds(deck) {
  return deck.map((card) => card.id);
}
const RARITY_RULES = {
  Common: { maxCopies: 3, deckLimit: Infinity },
  Rare: { maxCopies: 2, deckLimit: Infinity },
  Epic: { maxCopies: 1, deckLimit: 4 },
  Legend: { maxCopies: 1, deckLimit: 2 },
};

const RARITY_ORDER = {
  Common: 1,
  Rare: 2,
  Epic: 3,
  Legend: 4,
};

const CARD_TYPE_LABELS = {
  attack: "攻撃",
  multiAttack: "連続攻撃",
  chainAttack: "連鎖攻撃",
  randomMultiAttack: "ランダム攻撃",
  criticalAttack: "会心攻撃",
  diceDamage: "ダイス攻撃",
  lowHpAttack: "逆境攻撃",
  execute: "処刑攻撃",
  piercingAttack: "貫通攻撃",
  selfDamageAttack: "自傷攻撃",

  heal: "回復",
  healMissing: "割合回復",
  drain: "吸血",
  regeneration: "再生",
  maxHpUp: "最大HP増加",
  revive: "復活",

  shield: "防御",
  armor: "装甲",
  reflect: "反射",
  counter: "カウンター",
  invulnerable: "無敵",

  poison: "毒",
  burn: "火傷",
  freeze: "凍結",
  silence: "沈黙",
  cleanse: "浄化",
  transferDebuffs: "状態異常返し",
  lockCardType: "カード封印",

  energyGain: "エネルギー回復",
  energyNextTurn: "次ターン強化",
  stealEnergy: "エネルギー奪取",
  selfDamageEnergy: "自傷エネルギー",
  maxEnergyUp: "最大エネルギー増加",
  swapEnergy: "エネルギー交換",

  draw: "ドロー",
  drawChoose: "山札選択",
  refillHand: "手札補充",
  discardRandom: "手札破壊",
  shuffleDiscardIntoDeck: "捨て札再利用",
  exhaustFromHand: "カード除外",

  costReduction: "コスト軽減",
  increaseOpponentCost: "コスト増加",
  makeNextCardFree: "コスト無料化",

  swapHp: "HP交換",
  copyLastCard: "効果コピー",
  undoLastDamage: "ダメージ巻き戻し",
  berserk: "逆境強化",
  comboStarter: "コンボ",
  repeatNextCard: "効果再発動",
  extraTurn: "追加ターン",
  chaosRandom: "ランダム効果",
  coinFlip: "ギャンブル",
};

function getCardTypeLabel(card) {
  return CARD_TYPE_LABELS[card.type] || "特殊";
}

function getCardEffectText(card) {
  if (
    typeof card.description === "string" &&
    card.description.trim()
  ) {
    return card.description;
  }

  const effects = [];

  if (card.damage) {
    const hits = card.hits || 1;

    if (hits > 1) {
      effects.push(
        `${card.damage}ダメージを${hits}回`
      );
    } else {
      effects.push(`${card.damage}ダメージ`);
    }
  }

  if (Array.isArray(card.damageSequence)) {
    effects.push(
      `${card.damageSequence.join("・")}ダメージ`
    );
  }

  if (card.heal) {
    effects.push(`HPを${card.heal}回復`);
  }

  if (card.shield) {
    effects.push(
      "次に受けるダメージを半分にする"
    );
  }

  if (card.energyGain) {
    effects.push(
      `エネルギーを${card.energyGain}回復`
    );
  }

  if (card.energyNextTurn) {
    effects.push(
      `次のターンのエネルギー+${card.energyNextTurn}`
    );
  }

  if (card.draw) {
    effects.push(
      `カードを${card.draw}枚引く`
    );
  }

  if (card.poisonDamage && card.poisonTurns) {
    effects.push(
      `${card.poisonTurns}ターン、毒${card.poisonDamage}ダメージ`
    );
  }

  if (card.burnDamage && card.burnTurns) {
    effects.push(
      `${card.burnTurns}ターン、火傷${card.burnDamage}ダメージ`
    );
  }

  if (card.maxHpUp) {
    effects.push(
      `最大HPを${card.maxHpUp}増やす`
    );
  }

  if (card.maxEnergyUp) {
    effects.push(
      `最大エネルギーを${card.maxEnergyUp}増やす`
    );
  }

  return effects.length > 0
    ? effects.join("・")
    : "特殊な効果を発動する";
}

export default function DeckBuilder({
  onBack,
}) {
  const [deck, setDeck] = useState([]);

  const [presets, setPresets] =
    useState(createDefaultPresets);

  const [
    selectedPresetId,
    setSelectedPresetId,
  ] = useState("preset-1");

  const [
    activePresetId,
    setActivePresetId,
  ] = useState("preset-1");

  const [message, setMessage] =
    useState("");

  const [
    rarityFilter,
    setRarityFilter,
  ] = useState("All");

  const [
    typeFilter,
    setTypeFilter,
  ] = useState("All");

  const [
    searchText,
    setSearchText,
  ] = useState("");
const [
  collection,
  setCollection,
] = useState({});
useEffect(() => {
  ensureCollectionInitialized();

  function refreshCollection() {
    setCollection(
      getCardCollection(),
    );
  }

  refreshCollection();

  window.addEventListener(
    COLLECTION_CHANGE_EVENT,
    refreshCollection,
  );

  return () => {
    window.removeEventListener(
      COLLECTION_CHANGE_EVENT,
      refreshCollection,
    );
  };
}, []);
  useEffect(() => {
    try {
      const defaultPresets =
        createDefaultPresets();

      const savedPresetsText =
        localStorage.getItem(
          PRESET_STORAGE_KEY
        );

      let nextPresets = defaultPresets;

      if (savedPresetsText) {
        const savedPresets =
          JSON.parse(savedPresetsText);

        if (Array.isArray(savedPresets)) {
          nextPresets =
            defaultPresets.map(
              (defaultPreset, index) => {
                const savedPreset =
                  savedPresets.find(
                    (preset) =>
                      preset?.id ===
                      defaultPreset.id
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
                  id: defaultPreset.id,

                  name:
                    savedName ||
                    defaultPreset.name,

                  cardIds:
                    sanitizeCardIds(
                      savedPreset?.cardIds
                    ),
                };
              }
            );
        }
      } else {
        /*
          旧形式の1デッキを
          プリセット1へ自動移行
        */
        const legacyDeckText =
          localStorage.getItem(
            BATTLE_DECK_KEY
          );

        if (legacyDeckText) {
          const legacyDeck =
            JSON.parse(legacyDeckText);

          const legacyCardIds =
            sanitizeCardIds(legacyDeck);

          if (legacyCardIds.length > 0) {
            nextPresets[0] = {
              ...nextPresets[0],
              name: "メインデッキ",
              cardIds: legacyCardIds,
            };
          }
        }
      }

      const savedActivePresetId =
        localStorage.getItem(
          ACTIVE_PRESET_KEY
        );

      const initialPresetId =
        nextPresets.some(
          (preset) =>
            preset.id ===
            savedActivePresetId
        )
          ? savedActivePresetId
          : "preset-1";

      const initialPreset =
        nextPresets.find(
          (preset) =>
            preset.id ===
            initialPresetId
        ) ?? nextPresets[0];

      setPresets(nextPresets);

      setSelectedPresetId(
        initialPreset.id
      );

      setActivePresetId(
        initialPreset.id
      );

      setDeck(
        cardIdsToDeck(
          initialPreset.cardIds
        )
      );

      localStorage.setItem(
        PRESET_STORAGE_KEY,
        JSON.stringify(nextPresets)
      );
notifyDeckChanged();
      localStorage.setItem(
        ACTIVE_PRESET_KEY,
        initialPreset.id
      );
    } catch (error) {
      console.error(
        "プリセット読み込みエラー:",
        error
      );

      const defaultPresets =
        createDefaultPresets();

      setPresets(defaultPresets);
      setSelectedPresetId("preset-1");
      setActivePresetId("preset-1");
      setDeck([]);

      localStorage.setItem(
        PRESET_STORAGE_KEY,
        JSON.stringify(defaultPresets)
      );

      localStorage.setItem(
        ACTIVE_PRESET_KEY,
        "preset-1"
      );
notifyDeckChanged();
      setMessage(
        "デッキプリセットを初期化しました"
      );
    }
  }, []);
const currentPreset =
  presets.find(
    (preset) =>
      preset.id === selectedPresetId
  ) ?? presets[0];
  const cardTypes = useMemo(() => {
    return [
      ...new Set(
        cards.map((card) => card.type)
      ),
    ];
  }, []);

  const filteredCards = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    return [...cards]
      .filter((card) => {
        if (
          rarityFilter !== "All" &&
          card.rarity !== rarityFilter
        ) {
          return false;
        }

        if (
          typeFilter !== "All" &&
          card.type !== typeFilter
        ) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const searchableText = [
          card.name,
          card.description,
          getCardTypeLabel(card),
          card.rarity,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(
          normalizedSearch
        );
      })
      .sort((a, b) => {
        const rarityDifference =
          (RARITY_ORDER[a.rarity] || 99) -
          (RARITY_ORDER[b.rarity] || 99);

        if (rarityDifference !== 0) {
          return rarityDifference;
        }

        return a.cost - b.cost;
      });
  }, [
    rarityFilter,
    typeFilter,
    searchText,
  ]);
function persistPresets(
  nextPresets,
) {
  setPresets(
    nextPresets,
  );

  localStorage.setItem(
    PRESET_STORAGE_KEY,
    JSON.stringify(
      nextPresets,
    ),
  );

  notifyDeckChanged();
}

function updateCurrentPresetDeck(
  nextDeck,
) {
  const nextCardIds =
    deckToCardIds(
      nextDeck,
    );

  setDeck(
    nextDeck,
  );

  setPresets(
    (currentPresets) => {
      const nextPresets =
        currentPresets.map(
          (preset) =>
            preset.id ===
            selectedPresetId
              ? {
                  ...preset,
                  cardIds:
                    nextCardIds,
                }
              : preset,
        );

      localStorage.setItem(
        PRESET_STORAGE_KEY,
        JSON.stringify(
          nextPresets,
        ),
      );

      notifyDeckChanged();

      return nextPresets;
    },
  );
}

function selectPreset(presetId) {
  const targetPreset =
    presets.find(
      (preset) =>
        preset.id === presetId
    );

  if (!targetPreset) {
    return;
  }

  setSelectedPresetId(presetId);

  setDeck(
    cardIdsToDeck(
      targetPreset.cardIds
    )
  );

  setMessage(
    presetId === activePresetId
      ? `${targetPreset.name}を開きました（使用中）`
      : `${targetPreset.name}を開きました`
  );
}

function renameCurrentPreset(nextName) {
  const limitedName =
    nextName.slice(0, 16);

  const nextPresets =
    presets.map((preset) =>
      preset.id === selectedPresetId
        ? {
            ...preset,
            name: limitedName,
          }
        : preset
    );

  persistPresets(nextPresets);
}

function restoreDefaultPresetName() {
  if (currentPreset?.name.trim()) {
    return;
  }

  const presetIndex =
    presets.findIndex(
      (preset) =>
        preset.id === selectedPresetId
    );

  renameCurrentPreset(
    `デッキ${presetIndex + 1}`
  );
}
  function countCard(cardId) {
    return deck.filter(
      (card) => card.id === cardId
    ).length;
  }

  function countRarity(rarity) {
    return deck.filter(
      (card) => card.rarity === rarity
    ).length;
  }

  function getRarityRule(card) {
    return RARITY_RULES[card.rarity] ?? {
      maxCopies: 1,
      deckLimit: Infinity,
    };
  }

 function addCard(card) {
  setMessage("");

  const ownedCopies =
    getOwnedCardCount(
      card.id,
      collection,
    );

  if (ownedCopies <= 0) {
    setMessage(
      `${card.name}を所持していません`,
    );

    return;
  }

  if (deck.length >= DECK_SIZE) {
    setMessage(
      `デッキは${DECK_SIZE}枚までです`,
    );

    return;
  }

  const rule =
    getRarityRule(card);

  const usableCopies =
    Math.min(
      rule.maxCopies,
      ownedCopies,
    );

  if (
    countCard(card.id) >=
    usableCopies
  ) {
    setMessage(
      `${card.name}は所持枚数または編成上限に達しています`,
    );

    return;
  }

  if (
    countRarity(
      card.rarity,
    ) >= rule.deckLimit
  ) {
    setMessage(
      `${card.rarity}カードはデッキに${rule.deckLimit}枚までです`,
    );

    return;
  }

  updateCurrentPresetDeck([
    ...deck,
    card,
  ]);
}
function toggleCatalogCard(card) {
  setMessage("");

  const copies = countCard(card.id);

  const isSingleCopyCard =
    card.rarity === "Epic" ||
    card.rarity === "Legend";

  /*
    Epic・Legendをすでに選択している場合は
    カード一覧をもう一度押すと解除
  */
  if (isSingleCopyCard && copies > 0) {
    const removeIndex = deck.findIndex(
      (deckCard) =>
        String(deckCard.id) ===
        String(card.id)
    );

    if (removeIndex === -1) {
      return;
    }

    const nextDeck = deck.filter(
      (_, index) =>
        index !== removeIndex
    );

    updateCurrentPresetDeck(nextDeck);

    setMessage(
      `${card.name}をデッキから外しました`
    );

    return;
  }

  addCard(card);
}
function removeCard(index) {
  setMessage("");

  const nextDeck =
    deck.filter(
      (_, cardIndex) =>
        cardIndex !== index,
    );

  updateCurrentPresetDeck(
    nextDeck,
  );
}

  function saveDeck() {
  if (deck.length !== DECK_SIZE) {
    setMessage(
      `あと${
        DECK_SIZE - deck.length
      }枚選んでください`
    );

    return;
  }

  const cardIds =
    deckToCardIds(deck);

  const nextPresets =
    presets.map((preset) =>
      preset.id === selectedPresetId
        ? {
            ...preset,
            name:
              preset.name.trim() ||
              "名称未設定",
            cardIds,
          }
        : preset
    );

  persistPresets(nextPresets);

  /*
    対戦で使用するデッキ。
    最新のcards.jsを参照できるよう
    カードIDだけ保存する。
  */
  localStorage.setItem(
    BATTLE_DECK_KEY,
    JSON.stringify(cardIds)
  );

  localStorage.setItem(
    ACTIVE_PRESET_KEY,
    selectedPresetId
  );

  setActivePresetId(
    selectedPresetId
  );

  const savedPreset =
    nextPresets.find(
      (preset) =>
        preset.id === selectedPresetId
    );

  setMessage(
    `${
      savedPreset?.name ??
      "デッキ"
    }を保存して使用デッキに設定しました！`
  );
}

  function clearDeck() {
  updateCurrentPresetDeck([]);

  setMessage(
    `${currentPreset?.name ?? "デッキ"}を空にしました`
  );
}

  return (
    <main className="deck-builder deck-builder-v2">
      <header className="deck-topbar">
        <button
          type="button"
          className="deck-back-button"
          onClick={onBack}
        >
          <span aria-hidden="true">←</span>
          メニュー
        </button>

        <div className="deck-title-block">
          <span className="deck-kicker">DECK BUILDER</span>
          <h1 className="deck-page-title">デッキ編集</h1>
        </div>

        <button
          type="button"
          className="deck-save-top"
          onClick={saveDeck}
          disabled={deck.length !== DECK_SIZE}
        >
          保存
        </button>
      </header>
<section className="deck-preset-panel">
  <div className="deck-section-heading">
    <div>
      <span className="deck-section-label">
        DECK PRESETS
      </span>

      <h2>デッキプリセット</h2>
    </div>

    <span className="deck-preset-help">
      選択したデッキを編集
    </span>
  </div>

  <div className="deck-preset-tabs">
    {presets.map(
      (preset, index) => {
        const isSelected =
          preset.id ===
          selectedPresetId;

        const isActive =
          preset.id ===
          activePresetId;

        return (
          <button
            key={preset.id}
            type="button"
            className={[
              "deck-preset-tab",
              isSelected
                ? "is-selected"
                : "",
              isActive
                ? "is-active"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() =>
              selectPreset(preset.id)
            }
          >
            <span className="deck-preset-number">
              PRESET {index + 1}
            </span>

            <strong>
              {preset.name ||
                `デッキ${index + 1}`}
            </strong>

            <small>
              {preset.cardIds.length}/
              {DECK_SIZE}枚

              {isActive
                ? " ・ 使用中"
                : ""}
            </small>
          </button>
        );
      }
    )}
  </div>

  <div className="deck-preset-name-row">
    <label>
      <span>PRESET NAME</span>

      <input
        type="text"
        value={
          currentPreset?.name ?? ""
        }
        maxLength={16}
        placeholder="デッキ名"
        onChange={(event) =>
          renameCurrentPreset(
            event.target.value
          )
        }
        onBlur={
          restoreDefaultPresetName
        }
      />
    </label>

    <div
      className={`deck-active-indicator ${
        selectedPresetId ===
        activePresetId
          ? "is-active"
          : ""
      }`}
    >
      <span />

      {selectedPresetId ===
      activePresetId
        ? "現在使用中"
        : "保存すると使用中になります"}
    </div>
  </div>
</section>
      <section className="deck-status-panel">
        <div className="deck-count-area">
          <div className="deck-count-number">
            <strong>{deck.length}</strong>
            <span>/ {DECK_SIZE}</span>
          </div>
          <div className="deck-progress-track" aria-label={`デッキ ${deck.length}/${DECK_SIZE}枚`}>
            <span
              className="deck-progress-fill"
              style={{ width: `${(deck.length / DECK_SIZE) * 100}%` }}
            />
          </div>
          <p>
            {deck.length === DECK_SIZE
              ? "デッキを保存できます！"
              : `あと${DECK_SIZE - deck.length}枚必要です`}
          </p>
        </div>

        <div className="deck-rarity-rules">
          <div className="rarity-rule rarity-rule-common">
            <span>Common</span><strong>種類につき3枚ずつ</strong>
          </div>
          <div className="rarity-rule rarity-rule-rare">
            <span>Rare</span><strong>種類につき2枚ずつ</strong>
          </div>
          <div className="rarity-rule rarity-rule-epic">
            <span>Epic</span><strong>種類につき1枚ずつ、合計4枚まで</strong>
          </div>
          <div className="rarity-rule rarity-rule-legend">
            <span>Legend</span><strong>種類につき1枚ずつ、合計2枚まで</strong>
          </div>
        </div>
      </section>

      {message && (
        <div className="deck-message deck-toast" role="status">
          {message}
        </div>
      )}

      <section className="selected-deck-panel">
        <div className="deck-section-heading">
          <div>
            <span className="deck-section-label">YOUR DECK</span>
            <h2>選択中のカード</h2>
          </div>
          <button
            type="button"
            className="deck-clear-button"
            onClick={clearDeck}
            disabled={deck.length === 0}
          >
            すべて外す
          </button>
        </div>

        {deck.length === 0 ? (
          <div className="deck-empty-state">
            <span aria-hidden="true">🃏</span>
            <strong>まだカードがありません</strong>
            <p>下のカード一覧からタップして追加しよう</p>
          </div>
        ) : (
          <div className="selected-deck-strip">
            {deck.map((card, index) => (
              <button
                type="button"
                className={`selected-deck-chip rarity-${card.rarity.toLowerCase()}`}
                key={`${card.id}-${index}`}
                onClick={() => removeCard(index)}
                title="タップして外す"
              >
                <span className="selected-chip-number">{index + 1}</span>
                <span className="selected-chip-emoji">{card.emoji || "🃏"}</span>
                <span className="selected-chip-info">
                  <strong>{card.name}</strong>
                  <small>⚡{card.cost}・{card.rarity}</small>
                </span>
                <span className="selected-chip-remove">×</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="card-catalog-panel">
        <div className="deck-section-heading catalog-heading">
          <div>
            <span className="deck-section-label">CARD LIBRARY</span>
            <h2>カード一覧</h2>
          </div>
          <span className="catalog-count">{filteredCards.length}枚</span>
        </div>

        <div className="deck-filters deck-filters-v2">
          <label className="deck-search-box">
            <span aria-hidden="true">⌕</span>
            <input
              type="search"
              value={searchText}
              placeholder="カード名・能力を検索"
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>

          <select
            value={rarityFilter}
            onChange={(event) => setRarityFilter(event.target.value)}
            aria-label="レアリティで絞り込み"
          >
            <option value="All">全レアリティ</option>
            <option value="Common">Common</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legend">Legend</option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            aria-label="タイプで絞り込み"
          >
            <option value="All">全タイプ</option>
            {cardTypes.map((type) => (
              <option key={type} value={type}>
                {CARD_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>

        <div className="deck-card-list deck-card-grid-v2">
          {filteredCards.map((card) => {
  const copies = countCard(card.id);
  const rule = getRarityRule(card);
const ownedCopies =
  getOwnedCardCount(
    card.id,
    collection,
  );

const usableCopies =
  Math.min(
    rule.maxCopies,
    ownedCopies,
  );
  const rarityCount =
    countRarity(card.rarity);

  const isSingleCopyCard =
    card.rarity === "Epic" ||
    card.rarity === "Legend";

  const canRemove =
    isSingleCopyCard &&
    copies > 0;

  const cannotAdd =
  ownedCopies <= 0 ||
  deck.length >= DECK_SIZE ||
  copies >= usableCopies ||
  rarityCount >= rule.deckLimit;

  /*
    追加上限に達していても、
    選択済みのEpic・Legendは解除できる
  */
  const isDisabled =
    cannotAdd && !canRemove;

  return (
    <button
      type="button"
      className={[
        "deck-card-item",
        "deck-card-v2",
        `rarity-${card.rarity.toLowerCase()}`,
        canRemove
          ? "is-selected-card"
          : "",
          ownedCopies <= 0
  ? "is-unowned"
  : "",
      ]
        .filter(Boolean)
        .join(" ")}
      key={card.id}
      onClick={() =>
        toggleCatalogCard(card)
      }
      disabled={isDisabled}
    >
                <span className="deck-card-cost">⚡{card.cost}</span>
                <span className="deck-card-rarity">{card.rarity}</span>
                <span className="deck-card-emoji">{card.emoji || "🃏"}</span>
                <strong className="deck-card-name">{card.name}</strong>
                <span className="deck-card-type">{getCardTypeLabel(card)}</span>
                <span className="deck-card-effect">{getCardEffectText(card)}</span>
                <span className="deck-card-footer">
                  <span>
  {canRemove
    ? "− 選択解除"
    : ownedCopies <= 0
      ? "未所持"
      : isDisabled
        ? "追加不可"
        : "+ 追加"}
</span>
                  <span>
  {canRemove
    ? "− 選択解除"
    : isDisabled
      ? "追加不可"
      : "+ 追加"}
</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="deck-mobile-savebar">
        <div>
          <strong>{deck.length}/{DECK_SIZE}</strong>
          <span>{deck.length === DECK_SIZE ? "完成" : `あと${DECK_SIZE - deck.length}枚`}</span>
        </div>
        <button
  type="button"
  className="deck-mobile-save-button"
  onClick={saveDeck}
  disabled={deck.length !== DECK_SIZE}
>
  {selectedPresetId === activePresetId
    ? "上書き保存"
    : "保存して使用"}
</button>
      </div>
    </main>
  );
}