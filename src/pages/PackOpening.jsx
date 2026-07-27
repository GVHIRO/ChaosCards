import "./PackOpening.css";
import {
  recordRewardActivity,
} from "../lib/rewards";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import PackOpeningTransition from
  "../components/PackOpeningTransition";
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
  showPackTransition,
  setShowPackTransition,
] = useState(false);

const [
  pendingPackOutcome,
  setPendingPackOutcome,
] = useState(null);
  const [
  revealedIndexes,
  setRevealedIndexes,
] = useState([]);

const [
  revealEffect,
  setRevealEffect,
] = useState(null);

const revealEffectTimerRef =
  useRef(null);

const revealEffectIdRef =
  useRef(0);

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
  return () => {
    if (
      revealEffectTimerRef.current
    ) {
      window.clearTimeout(
        revealEffectTimerRef.current,
      );
    }
  };
}, []);
const RARITY_POWER = {
  Common: 0,
  Rare: 1,
  Epic: 2,
  Legend: 3,
};

function showRarityEffect(
  rarity,
) {
  revealEffectIdRef.current += 1;

  setRevealEffect({
    id: revealEffectIdRef.current,
    rarity,
  });

  if (
    revealEffectTimerRef.current
  ) {
    window.clearTimeout(
      revealEffectTimerRef.current,
    );
  }

  revealEffectTimerRef.current =
    window.setTimeout(() => {
      setRevealEffect(null);
    }, rarity === "Legend" ? 1300 : 900);
}

function revealCard(index) {
  if (
    phase !== "revealing" ||
    revealedIndexes.includes(index)
  ) {
    return;
  }

  const targetResult =
    results[index];

  if (!targetResult) {
    return;
  }

  const nextRevealedIndexes = [
    ...revealedIndexes,
    index,
  ];

  setRevealedIndexes(
    nextRevealedIndexes,
  );

  showRarityEffect(
    targetResult.card.rarity,
  );

  if (
    nextRevealedIndexes.length ===
    results.length
  ) {
    setPhase("complete");
  }
}

function revealAllCards() {
  if (
    results.length === 0
  ) {
    return;
  }

  setRevealedIndexes(
    results.map(
      (_, index) => index,
    ),
  );

  const highestResult = [
    ...results,
  ].sort(
    (firstResult, secondResult) =>
      (
        RARITY_POWER[
          secondResult.card.rarity
        ] ?? 0
      ) -
      (
        RARITY_POWER[
          firstResult.card.rarity
        ] ?? 0
      ),
  )[0];

  if (highestResult) {
    showRarityEffect(
      highestResult.card.rarity,
    );
  }

  setPhase("complete");
}
  function handleOpenPack() {
  if (showPackTransition) {
    return;
  }

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

  /*
    パック開封ミッションを進める。
  */
  recordRewardActivity({
    type: "packOpened",
    amount: 1,
  });

  /*
    すぐ結果画面へ移さず、
    開封結果を一時保存して演出を開始する。
  */
  setPendingPackOutcome(
    outcome,
  );

  setShowPackTransition(
    true,
  );
}
const showOpenedPackResults =
  useCallback(() => {
    if (!pendingPackOutcome) {
      return;
    }

    setResults(
      pendingPackOutcome.results,
    );

    setCoins(
      pendingPackOutcome
        .remainingCoins,
    );

    setPity(
      pendingPackOutcome.pity,
    );

    setCollection(
      getCardCollection(),
    );

    setRevealedIndexes([]);
    setRevealEffect(null);
    setPhase("revealing");
  }, [
    pendingPackOutcome,
  ]);
  function resetOpening() {
  setResults([]);
  setRevealedIndexes([]);
  setRevealEffect(null);
  setPhase("ready");
  setMessage("");
}
const finishPackTransition =
  useCallback(() => {
    setShowPackTransition(
      false,
    );

    setPendingPackOutcome(
      null,
    );
  }, []);
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
  {showPackTransition && (
    <PackOpeningTransition
      onSwitch={
        showOpenedPackResults
      }
      onFinish={
        finishPackTransition
      }
    />
  )}

  {revealEffect && (
    <div
      key={revealEffect.id}
      className={[
        "pack-rarity-screen-flash",
        `rarity-${revealEffect.rarity.toLowerCase()}`,
      ].join(" ")}
      aria-hidden="true"
    />
  )}
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
        revealedIndexes.includes(
          index,
        );

      return (
        <button
          type="button"
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
          onClick={() => {
            revealCard(index);
          }}
          aria-label={
            isRevealed
              ? `${result.card.name}、${result.card.rarity}`
              : `${index + 1}枚目のカードを開封`
          }
          aria-pressed={
            isRevealed
          }
        >
          <div className="pack-card-back">
            <span className="pack-card-back-symbol">
              🌌
            </span>

            <strong>
              CHAOS
            </strong>

            <span className="pack-card-tap-hint">
              TAP TO OPEN
            </span>
          </div>

          <div className="pack-card-front">
            <span
              className="pack-rarity-aura"
              aria-hidden="true"
            />

            <span
              className="pack-rarity-particles"
              aria-hidden="true"
            >
              {Array.from({
                length: 8,
              }).map(
                (_, particleIndex) => (
                  <i
                    key={
                      particleIndex
                    }
                  />
                ),
              )}
            </span>

            {result.isNew && (
              <span className="pack-new-label">
                NEW
              </span>
            )}

            <span className="pack-rarity-badge">
              {
                result.card.rarity
              }
            </span>

            <span className="pack-card-emoji">
              {
                result.card.emoji ||
                "🃏"
              }
            </span>

            <strong className="pack-result-card-name">
              {
                result.card.name
              }
            </strong>

            <p>
              ⚡
              {result.card.cost}
            </p>

            <span className="pack-owned-label">
              所持 ×
              {result.ownedAfter}
            </span>
          </div>
        </button>
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
  onClick={revealAllCards}
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