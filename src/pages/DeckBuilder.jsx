import { useEffect, useMemo, useState } from "react";
import cards from "../data/cards";

const DECK_SIZE = 20;
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

export default function DeckBuilder({ onBack }) {
  const [deck, setDeck] = useState([]);
  const [message, setMessage] = useState("");
  const [rarityFilter, setRarityFilter] =
    useState("All");
  const [typeFilter, setTypeFilter] =
    useState("All");
  const [searchText, setSearchText] =
    useState("");

  useEffect(() => {
    const savedDeck = localStorage.getItem(
      "chaosCardsDeck"
    );

    if (!savedDeck) return;

    try {
      const parsedDeck = JSON.parse(savedDeck);

      if (
        Array.isArray(parsedDeck) &&
        parsedDeck.length === DECK_SIZE
      ) {
        const latestDeck = parsedDeck
          .map((savedCard) =>
            cards.find(
              (card) =>
                card.id === savedCard.id
            )
          )
          .filter(Boolean);

        if (
          latestDeck.length === DECK_SIZE
        ) {
          setDeck(latestDeck);
        } else {
          localStorage.removeItem(
            "chaosCardsDeck"
          );
          setDeck([]);
          setMessage(
            "カードデータが更新されたため、デッキを選び直してください。"
          );
        }
      } else {
        localStorage.removeItem(
          "chaosCardsDeck"
        );
        setDeck([]);
        setMessage(
          "古いデッキデータをリセットしました。20枚選び直してください。"
        );
      }
    } catch (error) {
      console.error(
        "デッキ読み込みエラー:",
        error
      );

      localStorage.removeItem(
        "chaosCardsDeck"
      );
      setDeck([]);
    }
  }, []);

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

    if (deck.length >= DECK_SIZE) {
      setMessage(
        `デッキは${DECK_SIZE}枚までです`
      );
      return;
    }

    const rule = getRarityRule(card);

    if (countCard(card.id) >= rule.maxCopies) {
      setMessage(
        `${card.rarity}の同じカードは${rule.maxCopies}枚までです`
      );
      return;
    }

    if (countRarity(card.rarity) >= rule.deckLimit) {
      setMessage(
        `${card.rarity}カードはデッキに${rule.deckLimit}枚までです`
      );
      return;
    }

    setDeck((currentDeck) => [
      ...currentDeck,
      card,
    ]);
  }

  function removeCard(index) {
    setMessage("");

    setDeck((currentDeck) =>
      currentDeck.filter(
        (_, cardIndex) =>
          cardIndex !== index
      )
    );
  }

  function saveDeck() {
    if (deck.length !== DECK_SIZE) {
      setMessage(
        `あと${DECK_SIZE - deck.length}枚選んでください`
      );
      return;
    }

    localStorage.setItem(
      "chaosCardsDeck",
      JSON.stringify(deck)
    );

    setMessage(
      "デッキを保存しました！"
    );
  }

  function clearDeck() {
    setDeck([]);
    setMessage(
      "デッキを空にしました"
    );
  }

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <button
          type="button"
          onClick={onBack}
        >
          ← メニューに戻る
        </button>

        <h1>デッキ編集</h1>

        <p>
          {deck.length} / {DECK_SIZE}枚
        </p>

        <small>
          Common同名3枚・Rare同名2枚・Epic同名1枚（合計4枚まで）・Legend同名1枚（合計2枚まで）
        </small>
      </div>

      {message && (
        <p className="deck-message">
          {message}
        </p>
      )}

      <section>
        <h2>カード一覧</h2>

        <div className="deck-filters">
          <input
            type="search"
            value={searchText}
            placeholder="カード名や効果を検索"
            onChange={(event) =>
              setSearchText(
                event.target.value
              )
            }
          />

          <select
            value={rarityFilter}
            onChange={(event) =>
              setRarityFilter(
                event.target.value
              )
            }
          >
            <option value="All">
              全レアリティ
            </option>
            <option value="Common">
              Common
            </option>
            <option value="Rare">
              Rare
            </option>
            <option value="Epic">
              Epic
            </option>
            <option value="Legend">
              Legend
            </option>
          </select>

          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(
                event.target.value
              )
            }
          >
            <option value="All">
              全タイプ
            </option>

            {cardTypes.map((type) => (
              <option
                key={type}
                value={type}
              >
                {CARD_TYPE_LABELS[type] ||
                  type}
              </option>
            ))}
          </select>
        </div>

        <p>
          表示中：
          {filteredCards.length}枚
        </p>

        <div className="deck-card-list">
          {filteredCards.map((card) => {
            const copies = countCard(
              card.id
            );

            const rule = getRarityRule(card);
            const rarityCount = countRarity(card.rarity);

            const cannotAdd =
              deck.length >= DECK_SIZE ||
              copies >= rule.maxCopies ||
              rarityCount >= rule.deckLimit;

            return (
              <button
                type="button"
                className={`deck-card-item rarity-${card.rarity.toLowerCase()}`}
                key={card.id}
                onClick={() =>
                  addCard(card)
                }
                disabled={cannotAdd}
              >
                <strong className="deck-card-name">
                  <span>
                    {card.emoji || "🃏"}
                  </span>{" "}
                  {card.name}
                </strong>

                <span className="deck-card-meta">
                  ⚡ コスト：{card.cost}
                  　⭐ {card.rarity}
                </span>

                <span className="deck-card-type">
                  {getCardTypeLabel(card)}
                </span>

                <span className="deck-card-effect">
                  {getCardEffectText(card)}
                </span>

                <span>
                  同名：{copies}/{rule.maxCopies}枚
                  {Number.isFinite(rule.deckLimit)
                    ? `　${card.rarity}合計：${rarityCount}/${rule.deckLimit}枚`
                    : ""}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section>
        <div className="selected-deck-header">
          <h2>選択中のデッキ</h2>

          <button
            type="button"
            onClick={clearDeck}
            disabled={
              deck.length === 0
            }
          >
            全て外す
          </button>
        </div>

        {deck.length === 0 ? (
          <p>
            上のカードをタップして追加してください。
          </p>
        ) : (
          <div className="selected-deck-list">
            {deck.map(
              (card, index) => (
                <button
                  type="button"
                  className="selected-deck-card"
                  key={`${card.id}-${index}`}
                  onClick={() =>
                    removeCard(index)
                  }
                >
                  <strong>
                    {index + 1}.{" "}
                    {card.emoji || "🃏"}{" "}
                    {card.name}
                  </strong>

                  <small>
                    ⚡{card.cost}・
                    {getCardTypeLabel(
                      card
                    )}
                  </small>

                  <small>
                    {getCardEffectText(
                      card
                    )}
                  </small>

                  <span>
                    タップで外す ×
                  </span>
                </button>
              )
            )}
          </div>
        )}

        <button
          type="button"
          className="save-deck-button"
          onClick={saveDeck}
          disabled={
            deck.length !== DECK_SIZE
          }
        >
          デッキを保存
        </button>
      </section>
    </div>
  );
}