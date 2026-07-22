import { useEffect, useState } from "react";
import cards from "../data/cards";

const DECK_SIZE = 20;
const MAX_COPIES = 2;

export default function DeckBuilder({ onBack }) {
  const [deck, setDeck] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const savedDeck = localStorage.getItem("chaosCardsDeck");

    if (savedDeck) {
      try {
        setDeck(JSON.parse(savedDeck));
      } catch (error) {
        console.error("デッキ読み込みエラー:", error);
      }
    }
  }, []);

  function countCard(cardId) {
    return deck.filter((card) => card.id === cardId).length;
  }

  function addCard(card) {
    setMessage("");

    if (deck.length >= DECK_SIZE) {
      setMessage(`デッキは${DECK_SIZE}枚までです`);
      return;
    }

    if (countCard(card.id) >= MAX_COPIES) {
      setMessage(`同じカードは${MAX_COPIES}枚までです`);
      return;
    }

    setDeck((currentDeck) => [...currentDeck, card]);
  }

  function removeCard(index) {
    setMessage("");

    setDeck((currentDeck) =>
      currentDeck.filter((_, cardIndex) => cardIndex !== index)
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

  return (
    <div className="deck-builder">
      <div className="deck-builder-header">
        <button type="button" onClick={onBack}>
          ← メニューに戻る
        </button>

        <h1>デッキ編集</h1>

        <p>
          {deck.length} / {DECK_SIZE}枚
        </p>
      </div>

      {message && <p className="deck-message">{message}</p>}

      <section>
        <h2>カード一覧</h2>

        <div className="deck-card-list">
          {cards.map((card) => (
            <button
              type="button"
              className="deck-card-item"
              key={card.id}
              onClick={() => addCard(card)}
            >
              <strong>{card.name}</strong>

              <span>
                コスト：{card.cost ?? card.energyCost ?? 0}
              </span>

              <span>
                デッキ内：{countCard(card.id)}枚
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2>選択中のデッキ</h2>

        {deck.length === 0 ? (
          <p>カードをクリックして追加してください。</p>
        ) : (
          <div className="selected-deck-list">
            {deck.map((card, index) => (
              <button
                type="button"
                key={`${card.id}-${index}`}
                onClick={() => removeCard(index)}
              >
                {index + 1}. {card.name} ×
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