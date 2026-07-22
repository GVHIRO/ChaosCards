import { useEffect, useState } from "react";
import cards from "../data/cards";

const DECK_SIZE = 20;
const MAX_COPIES = 2;

function getCardEffectText(card) {
  const effects = [];

  if (card.damage) {
    const hits = card.hits || 1;

    if (hits > 1) {
      effects.push(`${card.damage}ダメージ×${hits}回`);
    } else {
      effects.push(`${card.damage}ダメージ`);
    }
  }

  if (card.heal) {
    effects.push(`${card.heal}回復`);
  }

  if (card.shield) {
    effects.push("受けるダメージを半減");
  }

  return effects.length > 0
    ? effects.join("・")
    : "特殊効果なし";
}

export default function DeckBuilder({ onBack }) {
  const [deck, setDeck] = useState([]);
  const [message, setMessage] = useState("");

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
        setDeck(parsedDeck);
      } else {
        // 昔保存した53枚デッキなどを削除
        localStorage.removeItem("chaosCardsDeck");
        setDeck([]);
        setMessage(
          "古いデッキデータをリセットしました。20枚選び直してください。"
        );
      }
    } catch (error) {
      console.error("デッキ読み込みエラー:", error);
      localStorage.removeItem("chaosCardsDeck");
      setDeck([]);
    }
  }, []);

  function countCard(cardId) {
    return deck.filter(
      (card) => card.id === cardId
    ).length;
  }

  function addCard(card) {
    setMessage("");

    if (deck.length >= DECK_SIZE) {
      setMessage(
        `デッキは${DECK_SIZE}枚までです`
      );
      return;
    }

    if (countCard(card.id) >= MAX_COPIES) {
      setMessage(
        `同じカードは${MAX_COPIES}枚までです`
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
        (_, cardIndex) => cardIndex !== index
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

    setMessage("デッキを保存しました！");
  }

  function clearDeck() {
    setDeck([]);
    setMessage("デッキを空にしました");
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
      </div>

      {message && (
        <p className="deck-message">
          {message}
        </p>
      )}

      <section>
        <h2>カード一覧</h2>

        <div className="deck-card-list">
          {cards.map((card) => {
            const copies = countCard(card.id);
            const cannotAdd =
              deck.length >= DECK_SIZE ||
              copies >= MAX_COPIES;

            return (
              <button
                type="button"
                className="deck-card-item"
                key={card.id}
                onClick={() => addCard(card)}
                disabled={cannotAdd}
              >
                <strong className="deck-card-name">
                  {card.name}
                </strong>

                <span>
                  ⚡ コスト：{card.cost}
                </span>

                <span className="deck-card-effect">
                  {getCardEffectText(card)}
                </span>

                <span>
                  デッキ内：{copies}/{MAX_COPIES}枚
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
            disabled={deck.length === 0}
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
            {deck.map((card, index) => (
              <button
                type="button"
                className="selected-deck-card"
                key={`${card.id}-${index}`}
                onClick={() => removeCard(index)}
              >
                <strong>
                  {index + 1}. {card.name}
                </strong>

                <small>
                  {getCardEffectText(card)}
                </small>

                <span>タップで外す ×</span>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          className="save-deck-button"
          onClick={saveDeck}
          disabled={deck.length !== DECK_SIZE}
        >
          デッキを保存
        </button>
      </section>
    </div>
  );
}