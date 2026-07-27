import "./ChallengeMenu.css";
import { useMemo } from "react";
import challenges, {
  CHALLENGE_PROGRESS_KEY,
} from "../data/challenges";

function loadClearedChallenges() {
  try {
    const saved =
      localStorage.getItem(
        CHALLENGE_PROGRESS_KEY,
      );

    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch (error) {
    console.error(
      "チャレンジ進行読込エラー:",
      error,
    );

    return [];
  }
}

export default function ChallengeMenu({
  onBack,
  onStart,
}) {
  const clearedChallenges =
    useMemo(
      loadClearedChallenges,
      [],
    );

  const clearCount =
    challenges.filter((challenge) =>
      clearedChallenges.includes(
        challenge.id,
      ),
    ).length;

  return (
    <main className="challenge-page">
      <div className="challenge-background-grid" />

      <div className="challenge-glow challenge-glow-one" />
      <div className="challenge-glow challenge-glow-two" />

      <section className="challenge-shell">
        <header className="challenge-header">
          <button
            type="button"
            className="challenge-back-button"
            onClick={onBack}
          >
            ← メニューへ戻る
          </button>

          <div className="challenge-heading">
            <small>
              SINGLE PLAYER MISSIONS
            </small>

            <h1>
              🎯 チャレンジモード
            </h1>

            <p>
              特殊なルールのCPU戦を攻略しよう
            </p>
          </div>

          <div className="challenge-progress">
            <span>CLEAR</span>

            <strong>
              {clearCount}
              <small>
                /{challenges.length}
              </small>
            </strong>
          </div>
        </header>

        <section className="challenge-list">
          {challenges.map(
            (challenge, index) => {
              const isCleared =
                clearedChallenges.includes(
                  challenge.id,
                );

              const previousChallenge =
                challenges[index - 1];

              const isUnlocked =
                index === 0 ||
                clearedChallenges.includes(
                  previousChallenge.id,
                );

              return (
                <article
                  key={challenge.id}
                  className={[
                    "challenge-card",
                    isCleared
                      ? "is-cleared"
                      : "",
                    !isUnlocked
                      ? "is-locked"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="challenge-number">
                    <span>
                      MISSION
                    </span>

                    <strong>
                      {String(
                        challenge.number,
                      ).padStart(2, "0")}
                    </strong>
                  </div>

                  <div className="challenge-icon">
                    {isUnlocked
                      ? challenge.icon
                      : "🔒"}
                  </div>

                  <div className="challenge-content">
                    <div className="challenge-title-row">
                      <div>
                        <small>
                          {challenge.english}
                        </small>

                        <h2>
                          {challenge.title}
                        </h2>
                      </div>

                      <span
                        className={[
                          "challenge-difficulty",
                          `difficulty-${challenge.difficulty.toLowerCase()}`,
                        ].join(" ")}
                      >
                        {challenge.difficulty}
                      </span>
                    </div>

                    <p>
                      {isUnlocked
                        ? challenge.description
                        : "前のミッションをクリアすると解放されます"}
                    </p>

                    {isUnlocked && (
                      <div className="challenge-rules">
                        {challenge.rules.map(
                          (rule) => (
                            <span key={rule}>
                              {rule}
                            </span>
                          ),
                        )}
                      </div>
                    )}
                  </div>

                  <div className="challenge-actions">
                    {isCleared && (
                      <span className="challenge-cleared-label">
                        ✓ CLEAR
                      </span>
                    )}

                    <button
                      type="button"
                      disabled={!isUnlocked}
                      onClick={() => {
                        onStart(challenge);
                      }}
                    >
                      {isUnlocked
                        ? isCleared
                          ? "再挑戦"
                          : "挑戦する"
                        : "未解放"}
                    </button>
                  </div>
                </article>
              );
            },
          )}
        </section>

        {clearCount ===
          challenges.length && (
          <div className="challenge-complete">
            <span>🏆</span>

            <div>
              <strong>
                ALL MISSIONS CLEAR
              </strong>

              <p>
                すべてのチャレンジを攻略しました！
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}