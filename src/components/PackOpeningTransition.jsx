import "./PackOpeningTransition.css";

import {
  useEffect,
  useRef,
} from "react";

const CARD_COUNT = 5;

export default function PackOpeningTransition({
  onSwitch,
  onFinish,
}) {
  const switchedRef =
    useRef(false);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    /*
      中央のカードが手前へ飛び出して
      光るタイミングで画面を切り替える。
    */
    const switchTimer =
      window.setTimeout(() => {
        if (
          switchedRef.current
        ) {
          return;
        }

        switchedRef.current =
          true;

        onSwitch();
      }, 690);

    /*
      画面切り替え後も少しだけ
      フラッシュを残してから終了する。
    */
    const finishTimer =
      window.setTimeout(() => {
        onFinish();
      }, 1180);

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.clearTimeout(
        switchTimer,
      );

      window.clearTimeout(
        finishTimer,
      );
    };
  }, [
    onSwitch,
    onFinish,
  ]);

  return (
    <div
      className="pack-transition-overlay"
      role="status"
      aria-label="パック開封画面を読み込んでいます"
    >
      <div
        className="pack-transition-background"
        aria-hidden="true"
      />

      <div
        className="pack-transition-speed-lines"
        aria-hidden="true"
      />

      <div className="pack-transition-stage">
        <div
          className="pack-transition-burst"
          aria-hidden="true"
        />

        <div
          className="pack-transition-rings"
          aria-hidden="true"
        >
          <span />
          <span />
          <span />
        </div>

        <div
          className="pack-transition-cards"
          aria-hidden="true"
        >
          {Array.from({
            length: CARD_COUNT,
          }).map(
            (_, index) => (
              <span
                key={index}
                className={[
                  "pack-transition-card",
                  `pack-transition-card-${index + 1}`,
                ].join(" ")}
              >
                <i>
                  🌌
                </i>

                <strong>
                  CHAOS
                </strong>

                <small>
                  CARDS
                </small>
              </span>
            ),
          )}
        </div>

        <div className="pack-transition-text">
          <small>
            CARD PACK
          </small>

          <strong>
            PACK OPENING
          </strong>

          <span>
            カードを展開中...
          </span>
        </div>
      </div>

      <div
        className="pack-transition-flash"
        aria-hidden="true"
      />

      <div
        className="pack-transition-wipe"
        aria-hidden="true"
      />
    </div>
  );
}