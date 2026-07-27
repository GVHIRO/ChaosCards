import "./CardLibrary.css";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import cards from "../data/cards";
import {
  COLLECTION_CHANGE_EVENT,
  ensureCollectionInitialized,
  getCardCollection,
  getOwnedCardCount,
} from "../lib/collection";
const ELEMENTS = {
  physical: {
    icon: "⚔️",
    label: "物理",
    english: "PHYSICAL",
    color: "#d7e2ef",
  },
  fire: {
    icon: "🔥",
    label: "炎",
    english: "FIRE",
    color: "#ff744d",
  },
  water: {
    icon: "💧",
    label: "水",
    english: "WATER",
    color: "#54c9ff",
  },
  thunder: {
    icon: "⚡",
    label: "雷",
    english: "THUNDER",
    color: "#ffe36a",
  },
  nature: {
    icon: "🌿",
    label: "自然",
    english: "NATURE",
    color: "#71e58f",
  },
  light: {
    icon: "✨",
    label: "光",
    english: "LIGHT",
    color: "#fff1a1",
  },
  dark: {
    icon: "🌙",
    label: "闇",
    english: "DARK",
    color: "#bd83ff",
  },
  chaos: {
    icon: "🌌",
    label: "カオス",
    english: "CHAOS",
    color: "#ff69e8",
  },
};

const RARITIES = [
  {
    value: "Common",
    label: "COMMON",
  },
  {
    value: "Rare",
    label: "RARE",
  },
  {
    value: "Epic",
    label: "EPIC",
  },
  {
    value: "Legend",
    label: "LEGEND",
  },
];

const RARITY_ORDER = {
  Common: 0,
  Rare: 1,
  Epic: 2,
  Legend: 3,
};

const CARD_TYPES = {
  attack: {
    icon: "⚔️",
    label: "攻撃",
  },
  multiAttack: {
    icon: "🥊",
    label: "連撃",
  },
  heal: {
    icon: "💚",
    label: "回復",
  },
  shield: {
    icon: "🛡️",
    label: "防御",
  },
};

const EFFECT_GLOSSARY = [
  {
    icon: "🗡️",
    name: "貫通",
    description:
      "指定されたダメージがシールドを無視して、直接HPに入る。",
  },
  {
    icon: "💥",
    name: "シールド破壊",
    description:
      "攻撃前に相手のシールドを指定された数だけ破壊する。",
  },
  {
    icon: "🔥",
    name: "炎上",
    description:
      "対象が行動したターンの終了時に、継続ダメージを与える。",
  },
  {
    icon: "🃏",
    name: "追加ドロー",
    description:
      "カード使用後、通常の補充とは別にカードを追加で引く。",
  },
  {
    icon: "⚡",
    name: "エネルギー獲得",
    description:
      "カード使用後に自分のエネルギーを回復する。",
  },
  {
    icon: "🔋",
    name: "エネルギー減少",
    description:
      "相手が現在持っているエネルギーを減らす。",
  },
  {
    icon: "⬇️",
    name: "弱体化",
    description:
      "相手が次に行う攻撃の合計ダメージを減らす。",
  },
  {
    icon: "✨",
    name: "浄化",
    description:
      "自分に付いている炎上と弱体化を解除する。",
  },
  {
    icon: "💢",
    name: "反動",
    description:
      "強力なカードを使用した代わりに、自分もダメージを受ける。",
  },
  {
    icon: "🩸",
    name: "瀕死強化",
    description:
      "自分のHPが指定値以下の場合、攻撃ダメージが増加する。",
  },
];

function getCardType(card) {
  return (
    CARD_TYPES[card.type] ?? {
      icon: "🎴",
      label: "特殊",
    }
  );
}

function getElement(card) {
  return (
    ELEMENTS[card.element] ??
    ELEMENTS.physical
  );
}

function createEffectChips(card) {
  const chips = [];

  if (Number(card.damage) > 0) {
    const hits = Math.max(
      1,
      Number(card.hits || 1),
    );

    chips.push(
      hits > 1
        ? `⚔️ ${card.damage}×${hits}`
        : `⚔️ ${card.damage}`,
    );
  }

  if (Number(card.heal) > 0) {
    chips.push(`💚 ${card.heal}`);
  }

  if (Number(card.shield) > 0) {
    chips.push(`🛡️ ${card.shield}`);
  }

  if (Number(card.pierce) > 0) {
    chips.push(`🗡️ 貫通${card.pierce}`);
  }

  if (Number(card.shieldBreak) > 0) {
    chips.push(
      `💥 破壊${card.shieldBreak}`,
    );
  }

  if (
    Number(card.burn) > 0 &&
    Number(card.burnTurns) > 0
  ) {
    chips.push(
      `🔥 ${card.burn}×${card.burnTurns}`,
    );
  }

  if (Number(card.draw) > 0) {
    chips.push(`🃏 +${card.draw}`);
  }

  if (Number(card.energyGain) > 0) {
    chips.push(
      `⚡ 自分+${card.energyGain}`,
    );
  }

  if (Number(card.energyDrain) > 0) {
    chips.push(
      `🔋 相手-${card.energyDrain}`,
    );
  }

  if (Number(card.weaken) > 0) {
    chips.push(
      `⬇️ 弱体${card.weaken}`,
    );
  }

  if (card.cleanse) {
    chips.push("✨ 浄化");
  }

  if (Number(card.recoil) > 0) {
    chips.push(
      `💢 反動${card.recoil}`,
    );
  }

  if (
    Number(card.lowHpBonusDamage) > 0
  ) {
    chips.push(
      `🩸 瀕死+${card.lowHpBonusDamage}`,
    );
  }

  return chips;
}

function createCardStats(card) {
  const stats = [];

  if (Number(card.damage) > 0) {
    const hits = Math.max(
      1,
      Number(card.hits || 1),
    );

    stats.push({
      label:
        hits > 1
          ? "連撃ダメージ"
          : "ダメージ",
      value:
        hits > 1
          ? `${card.damage} × ${hits} = ${
              Number(card.damage) * hits
            }`
          : String(card.damage),
    });
  }

  if (Number(card.heal) > 0) {
    stats.push({
      label: "HP回復",
      value: String(card.heal),
    });
  }

  if (Number(card.shield) > 0) {
    stats.push({
      label: "シールド",
      value: String(card.shield),
    });
  }

  if (Number(card.pierce) > 0) {
    stats.push({
      label: "貫通",
      value: String(card.pierce),
    });
  }

  if (Number(card.shieldBreak) > 0) {
    stats.push({
      label: "シールド破壊",
      value: String(
        card.shieldBreak,
      ),
    });
  }

  if (
    Number(card.burn) > 0 &&
    Number(card.burnTurns) > 0
  ) {
    stats.push({
      label: "炎上",
      value:
        `${card.burn}ダメージ × ` +
        `${card.burnTurns}ターン`,
    });
  }

  if (Number(card.draw) > 0) {
    stats.push({
      label: "追加ドロー",
      value: `${card.draw}枚`,
    });
  }

  if (Number(card.energyGain) > 0) {
    stats.push({
      label: "エネルギー獲得",
      value: `+${card.energyGain}`,
    });
  }

  if (Number(card.energyDrain) > 0) {
    stats.push({
      label: "相手エネルギー",
      value: `-${card.energyDrain}`,
    });
  }

  if (Number(card.weaken) > 0) {
    stats.push({
      label: "攻撃弱体化",
      value: `-${card.weaken}`,
    });
  }

  if (card.cleanse) {
    stats.push({
      label: "浄化",
      value: "あり",
    });
  }

  if (Number(card.recoil) > 0) {
    stats.push({
      label: "反動ダメージ",
      value: String(card.recoil),
    });
  }

  if (
    Number(card.lowHpBonusDamage) > 0
  ) {
    stats.push({
      label: "瀕死時追加",
      value:
        `HP${card.lowHpThreshold}以下で ` +
        `+${card.lowHpBonusDamage}`,
    });
  }

  return stats;
}

export default function CardLibrary({
  onBack,
}) {
  const [searchText, setSearchText] =
    useState("");

  const [
    collection,
    setCollection,
  ] = useState({});

  const [rarityFilter, setRarityFilter] =
    useState("all");

  const [elementFilter, setElementFilter] =
    useState("all");

  const [typeFilter, setTypeFilter] =
    useState("all");

  const [sortMode, setSortMode] =
    useState("id");

  const [selectedCard, setSelectedCard] =
    useState(null);

  const filteredCards = useMemo(() => {
    const normalizedSearch =
      searchText.trim().toLowerCase();

    const nextCards = cards.filter(
      (card) => {
        const element =
          getElement(card);

        const type =
          getCardType(card);

        const searchableText = [
          card.name,
          card.description,
          card.rarity,
          card.element,
          element.label,
          element.english,
          card.type,
          type.label,
        ]
          .join(" ")
          .toLowerCase();

        const matchesSearch =
          !normalizedSearch ||
          searchableText.includes(
            normalizedSearch,
          );

        const matchesRarity =
          rarityFilter === "all" ||
          card.rarity ===
            rarityFilter;

        const matchesElement =
          elementFilter === "all" ||
          card.element ===
            elementFilter;

        const matchesType =
          typeFilter === "all" ||
          card.type === typeFilter;

        return (
          matchesSearch &&
          matchesRarity &&
          matchesElement &&
          matchesType
        );
      },
    );

    return [...nextCards].sort(
      (firstCard, secondCard) => {
        if (sortMode === "cost") {
          return (
            Number(firstCard.cost) -
              Number(secondCard.cost) ||
            Number(firstCard.id) -
              Number(secondCard.id)
          );
        }

        if (sortMode === "rarity") {
          return (
            RARITY_ORDER[
              firstCard.rarity
            ] -
              RARITY_ORDER[
                secondCard.rarity
              ] ||
            Number(firstCard.id) -
              Number(secondCard.id)
          );
        }

        if (sortMode === "name") {
          return firstCard.name.localeCompare(
            secondCard.name,
            "ja",
          );
        }

        return (
          Number(firstCard.id) -
          Number(secondCard.id)
        );
      },
    );
  }, [
    searchText,
    rarityFilter,
    elementFilter,
    typeFilter,
    sortMode,
  ]);
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
    if (!selectedCard) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSelectedCard(null);
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [selectedCard]);

  function resetFilters() {
    setSearchText("");
    setRarityFilter("all");
    setElementFilter("all");
    setTypeFilter("all");
    setSortMode("id");
  }

  return (
    <main className="card-library-page">
      <div className="card-library-glow library-glow-one" />
      <div className="card-library-glow library-glow-two" />

      <section className="card-library-shell">
        <header className="card-library-header">
          <button
            type="button"
            className="card-library-back"
            onClick={onBack}
          >
            ← メニューへ戻る
          </button>

          <div className="card-library-heading">
            <small>
              CHAOS CARDS DATABASE
            </small>

            <h1>📚 カード図鑑</h1>

            <p>
              全カードの能力と特殊効果を確認できます
            </p>
          </div>

          <div className="card-library-total">
            <span>REGISTERED</span>
            <strong>{cards.length}</strong>
            <small>CARDS</small>
          </div>
        </header>

        <section className="card-library-toolbar">
          <label className="library-search-field">
            <span>カード検索</span>

            <input
              type="search"
              value={searchText}
              onChange={(event) => {
                setSearchText(
                  event.currentTarget.value,
                );
              }}
              placeholder="名前・説明・属性で検索"
            />
          </label>

          <label>
            <span>レアリティ</span>

            <select
              value={rarityFilter}
              onChange={(event) => {
                setRarityFilter(
                  event.currentTarget.value,
                );
              }}
            >
              <option value="all">
                すべて
              </option>

              {RARITIES.map((rarity) => (
                <option
                  key={rarity.value}
                  value={rarity.value}
                >
                  {rarity.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>属性</span>

            <select
              value={elementFilter}
              onChange={(event) => {
                setElementFilter(
                  event.currentTarget.value,
                );
              }}
            >
              <option value="all">
                すべて
              </option>

              {Object.entries(
                ELEMENTS,
              ).map(
                ([key, element]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {element.icon}{" "}
                    {element.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>種類</span>

            <select
              value={typeFilter}
              onChange={(event) => {
                setTypeFilter(
                  event.currentTarget.value,
                );
              }}
            >
              <option value="all">
                すべて
              </option>

              {Object.entries(
                CARD_TYPES,
              ).map(
                ([key, type]) => (
                  <option
                    key={key}
                    value={key}
                  >
                    {type.icon}{" "}
                    {type.label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            <span>並び順</span>

            <select
              value={sortMode}
              onChange={(event) => {
                setSortMode(
                  event.currentTarget.value,
                );
              }}
            >
              <option value="id">
                図鑑番号順
              </option>
              <option value="cost">
                コストが低い順
              </option>
              <option value="rarity">
                レアリティ順
              </option>
              <option value="name">
                名前順
              </option>
            </select>
          </label>

          <button
            type="button"
            className="library-reset-button"
            onClick={resetFilters}
          >
            リセット
          </button>
        </section>

        <div className="card-library-result-bar">
          <span>
            検索結果
          </span>

          <strong>
            {filteredCards.length}
          </strong>

          <small>
            / {cards.length} CARDS
          </small>
        </div>

        {filteredCards.length > 0 ? (
          <section
            className="card-library-grid"
            aria-label="カード一覧"
          >
            {filteredCards.map((card) => {
              const element =
                getElement(card);
const ownedCopies =
  getOwnedCardCount(
    card.id,
    collection,
  );
              const type =
                getCardType(card);

              const effectChips =
                createEffectChips(card);

              return (
                <button
                  type="button"
                  key={card.id}
                  className={[
  "library-card",
  `rarity-${String(
    card.rarity,
  ).toLowerCase()}`,
  ownedCopies <= 0
    ? "is-unowned"
    : "",
]
  .filter(Boolean)
  .join(" ")}
                  style={{
                    "--element-color":
                      element.color,
                  }}
                  onClick={() => {
                    setSelectedCard(card);
                  }}
                >
                  <span className="library-card-number">
                    NO.
                    {String(card.id).padStart(
                      3,
                      "0",
                    )}
                  </span>

                  <div className="library-card-header">
                    <strong>
                      {card.name}
                    </strong>

                    <span className="library-card-cost">
                      {card.cost}
                      <small>⚡</small>
                    </span>
                  </div>

                  <div className="library-card-element">
                    <span>
                      {element.icon}
                    </span>

                    <strong>
                      {element.english}
                    </strong>
                  </div>

                  <div className="library-card-emoji">
                    {card.emoji}
                  </div>

                  <div className="library-card-meta">
                    <span>
                      {card.rarity}
                    </span>

                    <span>
                      {type.icon}{" "}
                      {type.label}
                    </span>
                    <span
  className={[
    "library-card-owned",
    ownedCopies > 0
      ? "is-owned"
      : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
  {ownedCopies > 0
    ? `所持 ×${ownedCopies}`
    : "未所持"}
</span>
                  </div>

                  <p>
                    {card.description}
                  </p>

                  <div className="library-card-effects">
                    {effectChips
                      .slice(0, 3)
                      .map((chip) => (
                        <span key={chip}>
                          {chip}
                        </span>
                      ))}

                    {effectChips.length > 3 && (
                      <span>
                        +
                        {effectChips.length -
                          3}
                      </span>
                    )}
                  </div>

                  <span className="library-card-detail">
                    詳細を見る
                  </span>
                </button>
              );
            })}
          </section>
        ) : (
          <div className="card-library-empty">
            <span>🔍</span>
            <strong>
              該当するカードがありません
            </strong>
            <p>
              検索条件を変更してください
            </p>

            <button
              type="button"
              onClick={resetFilters}
            >
              条件をリセット
            </button>
          </div>
        )}
        <section className="card-effect-glossary">
          <div className="glossary-heading">
            <small>
              EFFECT GUIDE
            </small>

            <h2>特殊効果ガイド</h2>
          </div>

          <div className="glossary-grid">
            {EFFECT_GLOSSARY.map(
              (effect) => (
                <article
                  key={effect.name}
                  className="glossary-item"
                >
                  <span>
                    {effect.icon}
                  </span>

                  <div>
                    <strong>
                      {effect.name}
                    </strong>

                    <p>
                      {effect.description}
                    </p>
                  </div>
                </article>
              ),
            )}
          </div>
        </section>
      </section>

      {selectedCard && (
        <div
          className="card-detail-overlay"
          role="presentation"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setSelectedCard(null);
            }
          }}
        >
          <section
            className={[
              "card-detail-modal",
              `rarity-${String(
                selectedCard.rarity,
              ).toLowerCase()}`,
            ].join(" ")}
            style={{
              "--element-color":
                getElement(
                  selectedCard,
                ).color,
            }}
            role="dialog"
            aria-modal="true"
            aria-label={`${selectedCard.name}の詳細`}
          >
            <button
              type="button"
              className="card-detail-close"
              onClick={() => {
                setSelectedCard(null);
              }}
              aria-label="詳細を閉じる"
            >
              ×
            </button>

            <div className="card-detail-visual">
              <span className="card-detail-number">
                CARD NO.
                {String(
                  selectedCard.id,
                ).padStart(3, "0")}
              </span>

              <div className="card-detail-emoji">
                {selectedCard.emoji}
              </div>

              <div className="card-detail-element">
                <span>
                  {
                    getElement(
                      selectedCard,
                    ).icon
                  }
                </span>

                <strong>
                  {
                    getElement(
                      selectedCard,
                    ).english
                  }
                </strong>
              </div>
            </div>

            <div className="card-detail-content">
              <div className="card-detail-title-row">
                <div>
                  <small>
                    {
                      selectedCard.rarity
                    }
                    {" / "}
                    {
                      getCardType(
                        selectedCard,
                      ).label
                    }
                  </small>

                  <h2>
                    {selectedCard.name}
                  </h2>
                </div>

                <span className="card-detail-cost">
                  {selectedCard.cost}
                  <small>⚡</small>
                </span>
              </div>

              <span
  className={[
    "card-detail-owned",
    getOwnedCardCount(
      selectedCard.id,
      collection,
    ) > 0
      ? "is-owned"
      : "is-unowned",
  ]
    .filter(Boolean)
    .join(" ")}
>
  {getOwnedCardCount(
    selectedCard.id,
    collection,
  ) > 0
    ? `所持枚数：${getOwnedCardCount(
        selectedCard.id,
        collection,
      )}枚`
    : "未所持"}
</span>

<p className="card-detail-description">
  {selectedCard.description}
</p>

              <div className="card-detail-stats">
                {createCardStats(
                  selectedCard,
                ).map((stat) => (
                  <div key={stat.label}>
                    <span>
                      {stat.label}
                    </span>

                    <strong>
                      {stat.value}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}