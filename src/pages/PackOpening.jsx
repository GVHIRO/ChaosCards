import "./PackOpening.css";

import {
  useEffect,
  useState,
} from "react";

import cards from "../data/cards";

import {
  BASIC_PACK,
} from "../data/packs";

import {
  COLLECTION_CHANGE_EVENT,
  COIN_CHANGE_EVENT,
  ensureCollectionInitialized,
  getCardCollection,
  getCoins,
  getOwnedUniqueCardCount,
  getPackPity,
  openCardPack,
} from "../lib/collection";

export default function PackOpening({
  onBack,
}) {
  const [coins, setCoins] =
    useState(0);

  const [
    collection,
    setCollection,
  ] = useState({});

  const [pity, setPity] =
    useState(0);

  const [results, setResults] =
    useState([]);

  const [
    revealedCount,
    setRevealedCount,
  ] = useState(0);

  const [phase, setPhase] =
    useState("ready");

  const [message, setMessage] =
    useState("");

  useEffect(() => {
    ensureCollectionInitialized();

    function refresh() {
      setCoins(getCoins());
      setCollection(
        getCardCollection(),
      );
      setPity(getPackPity());
    }

    refresh();

    window.addEventListener(
      COLLECTION_CHANGE_EVENT,
      refresh,
    );

    window.addEventListener(
      COIN_CHANGE_EVENT,
      refresh,
    );

    return () => {
      window.removeEventListener(
        COLLECTION_CHANGE_EVENT,
        refresh,
      );

      window.removeEventListener(
        COIN_CHANGE_EVENT,
        refresh,
      );
    };
  }, []);

  useEffect(() => {
    if (
      phase !== "revealing"
    ) {
      return undefined;
    }

    if (
      revealedCount >=
      results.length
    ) {
      setPhase("complete");
      return undefined;
    }

    const timerId =
      window.setTimeout(() => {
        setRevealedCount(
          (currentCount) =>
            currentCount + 1,
        );
      }, 580);

    return () => {
      window.clearTimeout(
        timerId,
      );
    };
  }, [
    phase,
    revealedCount,
    results.length,
  ]);

  function handleOpenPack() {
    setMessage("");

    const outcome =
      openCardPack(
        BASIC_PACK.id,
      );

    if (!outcome.ok) {
      setMessage(
        outcome.message,
      );

      return;
    }

    setResults(
      outcome.results,
    );

    setCoins(
      outcome.remainingCoins,
    );

    setPity(
      outcome.pity,
    );

    setCollection(
      getCardCollection(),
    );

    setRevealedCount(0);
    setPhase("revealing");
  }

  function resetOpening() {
    setResults([]);
    setRevealedCount(0);
    setPhase("ready");
    setMessage("");
  }

  const ownedUniqueCards =
    getOwnedUniqueCardCount(
      collection,
    );

  const untilEpic =
    Math.max(
      1,
      BASIC_PACK.pityEpicAfter -
        pity,
    );

  return (
    <main className="pack-page">
      <div className="pack-page-glow pack-page-glow-one" />
      <div className="pack-page-glow pack-page-glow-two" />

      <section className="pack-shell">
        <header className="pack-header">
          <button
            type="button"
            className="pack-back-button"
            onClick={onBack}
          >
            ← メニューへ戻る
          </button>

          <div className="pack-heading">
            <small>
              CARD PACK SHOP
            </small>

            <h1>
              🎁 パック開封
            </h1>

            <p>
              カードを手に入れてデッキを強化しよう
            </p>
          </div>

          <div className="pack-coin-panel">
            <span>COINS</span>
            <strong>
              🪙 {coins}
            </strong>
          </div>
        </header>

        <section className="pack-collection-status">
          <div>
            <span>
              COLLECTION
            </span>

            <strong>
              {ownedUniqueCards}
              <small>
                / {cards.length}
              </small>
            </strong>
          </div>

          <div>
            <span>
              EPIC PITY
            </span>

            <strong>
              あと{untilEpic}パック
            </strong>
          </div>
        </section>

        {phase === "ready" ? (
          <section className="pack-shop-area">
            <div className="pack-visual">
              <span className="pack-visual-kicker">
                CHAOS CARDS
              </span>

              <div className="pack-visual-icon">
                🌌
              </div>

              <strong>
                BASIC
              </strong>

              <small>
                5 CARD PACK
              </small>
            </div>

            <div className="pack-information">
              <small>
                STANDARD PACK
              </small>

              <h2>
                {
                  BASIC_PACK.japaneseName
                }
              </h2>

              <p>
                {
                  BASIC_PACK.description
                }
              </p>

              <div className="pack-rates">
                {Object.entries(
                  BASIC_PACK.odds,
                ).map(
                  ([rarity, rate]) => (
                    <span
                      key={rarity}
                      className={`pack-rate rarity-${rarity.toLowerCase()}`}
                    >
                      {rarity} {rate}%
                    </span>
                  ),
                )}
              </div>

              <button
                type="button"
                className="pack-open-button"
                onClick={handleOpenPack}
                disabled={
                  coins <
                  BASIC_PACK.price
                }
              >
                🪙 {BASIC_PACK.price}
                コインで開封
              </button>

              {message && (
                <p className="pack-message">
                  {message}
                </p>
              )}
            </div>
          </section>
        ) : (
          <section className="pack-result-area">
            <div className="pack-result-heading">
              <small>
                PACK RESULT
              </small>

              <h2>
                獲得カード
              </h2>
            </div>

            <div className="pack-result-grid">
              {results.map(
                (
                  result,
                  index,
                ) => {
                  const isRevealed =
                    index <
                    revealedCount;

                  return (
                    <article
                      key={`${result.card.id}-${index}`}
                      className={[
                        "pack-result-card",
                        `rarity-${result.card.rarity.toLowerCase()}`,
                        isRevealed
                          ? "is-revealed"
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <div className="pack-card-back">
                        <span>
                          🌌
                        </span>
                        <strong>
                          CHAOS
                        </strong>
                      </div>

                      <div className="pack-card-front">
                        {result.isNew && (
                          <span className="pack-new-label">
                            NEW
                          </span>
                        )}

                        <small>
                          {
                            result.card.rarity
                          }
                        </small>

                        <span className="pack-card-emoji">
                          {
                            result.card.emoji ||
                            "🃏"
                          }
                        </span>

                        <strong>
                          {
                            result.card.name
                          }
                        </strong>

                        <p>
                          ⚡
                          {
                            result.card.cost
                          }
                        </p>

                        <span className="pack-owned-label">
                          所持 ×
                          {
                            result.ownedAfter
                          }
                        </span>
                      </div>
                    </article>
                  );
                },
              )}
            </div>

            <div className="pack-result-actions">
              {phase ===
                "revealing" && (
                <button
                  type="button"
                  className="pack-skip-button"
                  onClick={() => {
                    setRevealedCount(
                      results.length,
                    );

                    setPhase(
                      "complete",
                    );
                  }}
                >
                  すべて開く
                </button>
              )}

              {phase ===
                "complete" && (
                <>
                  <button
                    type="button"
                    className="pack-open-again-button"
                    onClick={
                      handleOpenPack
                    }
                    disabled={
                      coins <
                      BASIC_PACK.price
                    }
                  >
                    🪙 もう一度開封
                  </button>

                  <button
                    type="button"
                    className="pack-finish-button"
                    onClick={
                      resetOpening
                    }
                  >
                    パック選択へ戻る
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}