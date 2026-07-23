// src/engine/deckEngine.js

export function shuffle(items) {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function buildDefaultDeck(cards) {
  const deck = [];

  cards.forEach((card) => {
    let copies = 1;

    if (card.rarity === "Common") copies = 3;
    if (card.rarity === "Rare") copies = 2;

    for (let i = 0; i < copies; i += 1) {
      deck.push(card);
    }
  });

  return shuffle(deck);
}

export function loadPlayerDeck(cards) {
  const saved = localStorage.getItem(
    "chaosCardsDeck"
  );

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      const valid = parsed
        .map((savedCard) =>
          cards.find(
            (card) => card.id === savedCard.id
          )
        )
        .filter(Boolean);

      if (valid.length > 0) {
        return shuffle(valid);
      }
    } catch (error) {
      console.error(
        "保存デッキ読込エラー:",
        error
      );
    }
  }

  return buildDefaultDeck(cards);
}

export function drawFromDeck(
  deck,
  discardPile,
  count
) {
  let nextDeck = [...deck];
  let nextDiscard = [...discardPile];
  const drawn = [];

  for (let i = 0; i < count; i += 1) {
    if (
      nextDeck.length === 0 &&
      nextDiscard.length > 0
    ) {
      nextDeck = shuffle(nextDiscard);
      nextDiscard = [];
    }

    const card = nextDeck.shift();

    if (!card) break;
    drawn.push(card);
  }

  return {
    drawn,
    deck: nextDeck,
    discardPile: nextDiscard,
  };
}

export function replaceUsedCards({
  hand,
  deck,
  discardPile,
  selectedCards,
}) {
  const nextHand = [...hand];
  let nextDeck = [...deck];
  let nextDiscard = [
    ...discardPile,
    ...selectedCards.map(
      (selected) => selected.card
    ),
  ];

  const sorted = [...selectedCards].sort(
    (a, b) => a.handIndex - b.handIndex
  );

  for (const selected of sorted) {
    const result = drawFromDeck(
      nextDeck,
      nextDiscard,
      1
    );

    nextDeck = result.deck;
    nextDiscard = result.discardPile;

    if (result.drawn[0]) {
      nextHand[selected.handIndex] =
        result.drawn[0];
    } else {
      nextHand.splice(
        selected.handIndex,
        1
      );
    }
  }

  return {
    hand: nextHand,
    deck: nextDeck,
    discardPile: nextDiscard,
  };
}

export function applyDeckEvents({
  hand,
  deck,
  discardPile,
  events,
  maxHandSize = 7,
}) {
  let nextHand = [...hand];
  let nextDeck = [...deck];
  let nextDiscard = [...discardPile];

  for (const event of events ?? []) {
    if (event.type === "draw") {
      const available = Math.max(
        0,
        maxHandSize - nextHand.length
      );

      const result = drawFromDeck(
        nextDeck,
        nextDiscard,
        Math.min(event.count, available)
      );

      nextHand.push(...result.drawn);
      nextDeck = result.deck;
      nextDiscard = result.discardPile;
    }

    if (event.type === "refillHand") {
      const target = Math.min(
        event.handSize,
        maxHandSize
      );

      const result = drawFromDeck(
        nextDeck,
        nextDiscard,
        Math.max(0, target - nextHand.length)
      );

      nextHand.push(...result.drawn);
      nextDeck = result.deck;
      nextDiscard = result.discardPile;
    }

    if (event.type === "discardRandom") {
      for (
        let i = 0;
        i < event.count &&
        nextHand.length > 0;
        i += 1
      ) {
        const index = Math.floor(
          Math.random() * nextHand.length
        );

        const [discarded] =
          nextHand.splice(index, 1);

        if (discarded) {
          nextDiscard.push(discarded);
        }
      }
    }

    if (
      event.type ===
      "shuffleDiscardIntoDeck"
    ) {
      nextDeck = shuffle([
        ...nextDeck,
        ...nextDiscard,
      ]);
      nextDiscard = [];
    }

    // UI選択が必要なカードは、ひとまず自動選択。
    if (event.type === "drawChoose") {
      const result = drawFromDeck(
        nextDeck,
        nextDiscard,
        event.lookAt
      );

      const candidates = result.drawn;
      const picked = candidates[0];

      if (
        picked &&
        nextHand.length < maxHandSize
      ) {
        nextHand.push(picked);
      }

      nextDiscard.push(
        ...candidates.slice(1)
      );
      nextDeck = result.deck;
      nextDiscard = [
        ...result.discardPile,
        ...nextDiscard,
      ];
    }

    // 現段階では先頭の手札を除外する。
    // 後で選択モーダルへ変更できる。
    if (event.type === "exhaustFromHand") {
      nextHand.splice(
        0,
        Math.min(
          event.count,
          nextHand.length
        )
      );
    }
  }

  return {
    hand: nextHand,
    deck: nextDeck,
    discardPile: nextDiscard,
  };
}
