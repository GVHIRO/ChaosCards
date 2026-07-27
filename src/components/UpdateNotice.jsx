import "./UpdateNotice.css";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import updates, {
  APP_VERSION,
} from "../data/updates";

export default function UpdateNotice({
  onClose,
}) {
  const [
    selectedVersion,
    setSelectedVersion,
  ] = useState(
    APP_VERSION,
  );

  const selectedUpdate =
    useMemo(() => {
      return (
        updates.find(
          (update) =>
            update.version ===
            selectedVersion,
        ) ??
        updates[0] ??
        null
      );
    }, [
      selectedVersion,
    ]);

  useEffect(() => {
  const previousOverflow =
    document.body.style.overflow;

  document.body.style.overflow =
    "hidden";

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      onClose();
    }
  }

  window.addEventListener(
    "keydown",
    handleKeyDown,
  );

  return () => {
    document.body.style.overflow =
      previousOverflow;

    window.removeEventListener(
      "keydown",
      handleKeyDown,
    );
  };
}, [onClose]);

  if (!selectedUpdate) {
    return null;
  }

  return (
    <div
      className="update-notice-overlay"
      role="presentation"
      onClick={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="update-notice-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-notice-title"
      >
        <button
          type="button"
          className="update-notice-close"
          onClick={onClose}
          aria-label="お知らせを閉じる"
        >
          ×
        </button>

        <header className="update-notice-header">
          <div className="update-notice-icon">
            🔔
          </div>

          <div>
            <small>
              CHAOS CARDS NEWS
            </small>

            <h2 id="update-notice-title">
              お知らせ
            </h2>

            <p>
              アップデート情報と重要なお知らせ
            </p>
          </div>

          <span className="update-current-version">
            Ver.{APP_VERSION}
          </span>
        </header>

        <div className="update-notice-layout">
          <nav
            className="update-version-list"
            aria-label="アップデート履歴"
          >
            <span className="update-version-list-label">
              UPDATE HISTORY
            </span>

            {updates.map(
              (update) => {
                const isSelected =
                  update.version ===
                  selectedUpdate.version;

                return (
                  <button
                    type="button"
                    key={
                      update.version
                    }
                    className={[
                      "update-version-button",
                      isSelected
                        ? "is-selected"
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    onClick={() => {
                      setSelectedVersion(
                        update.version,
                      );
                    }}
                  >
                    <span>
                      Ver.
                      {update.version}
                    </span>

                    <small>
                      {update.date}
                    </small>

                    {update.version ===
                      APP_VERSION && (
                      <i>
                        NEW
                      </i>
                    )}
                  </button>
                );
              },
            )}
          </nav>

          <article className="update-detail">
            <div className="update-detail-heading">
              <div>
                <small>
                  VERSION{" "}
                  {
                    selectedUpdate.version
                  }
                </small>

                <h3>
                  {
                    selectedUpdate.title
                  }
                </h3>
              </div>

              <time>
                {
                  selectedUpdate.date
                }
              </time>
            </div>

            <p className="update-summary">
              {
                selectedUpdate.summary
              }
            </p>

            {selectedUpdate.notice && (
              <div className="update-important-notice">
                <span>
                  ⚠️ IMPORTANT
                </span>

                <p>
                  {
                    selectedUpdate.notice
                  }
                </p>
              </div>
            )}

            <section className="update-change-section">
              <h4>
                主なアップデート
              </h4>

              <div className="update-change-list">
                {selectedUpdate.changes.map(
                  (
                    change,
                    index,
                  ) => (
                    <div
                      key={`${selectedUpdate.version}-${index}`}
                    >
                      <span>
                        ✓
                      </span>

                      <p>
                        {change}
                      </p>
                    </div>
                  ),
                )}
              </div>
            </section>
          </article>
        </div>

        <footer className="update-notice-footer">
          <p>
            これからもCHAOS CARDSをよろしくお願いします！
          </p>

          <button
            type="button"
            onClick={onClose}
          >
            確認しました
          </button>
        </footer>
      </section>
    </div>
  );
}