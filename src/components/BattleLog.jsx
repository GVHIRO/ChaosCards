import { useEffect, useMemo, useRef, useState } from "react";

function getLogType(message) {
  if (message.includes("ターン") || message.startsWith("🔄")) {
    return "turn";
  }

  if (
    message.includes("ダメージ") ||
    message.startsWith("⚔️") ||
    message.startsWith("💥")
  ) {
    return "damage";
  }

  if (
    message.includes("回復") ||
    message.startsWith("💚") ||
    message.startsWith("❤️")
  ) {
    return "heal";
  }

  if (
    message.includes("シールド") ||
    message.includes("盾") ||
    message.startsWith("🛡️")
  ) {
    return "shield";
  }

  if (message.startsWith("🎴")) {
  return "card";
}

  if (
    message.includes("勝利") ||
    message.startsWith("🏆")
  ) {
    return "victory";
  }

  if (
    message.includes("敗北") ||
    message.startsWith("❌")
  ) {
    return "danger";
  }

  if (
    message.startsWith("⚠️") ||
    message.includes("足りない")
  ) {
    return "warning";
  }

  if (
    message.startsWith("✅") ||
    message.startsWith("↩️")
  ) {
    return "selection";
  }

  if (
    message.startsWith("🪙") ||
    message.includes("先攻")
  ) {
    return "system";
  }

  return "normal";
}

function getLogIcon(type) {
  switch (type) {
    case "turn":
      return "↻";
    case "damage":
      return "⚔";
    case "heal":
      return "♥";
    case "shield":
      return "◆";
    case "card":
      return "🃏";
    case "victory":
      return "★";
    case "danger":
      return "!";
    case "warning":
      return "⚠";
    case "selection":
      return "✓";
    case "system":
      return "●";
    default:
      return "•";
  }
}

function cleanLogMessage(message) {
  return message
    .replace(/^🔄\s*/, "")
    .replace(/^⚔️\s*/, "")
    .replace(/^💥\s*/, "")
    .replace(/^💚\s*/, "")
    .replace(/^❤️\s*/, "")
    .replace(/^🛡️\s*/, "")
    .replace(/^🎴\s*/, "")
    .replace(/^🤖\s*/, "")
    .replace(/^🏆\s*/, "")
    .replace(/^❌\s*/, "")
    .replace(/^⚠️\s*/, "")
    .replace(/^✅\s*/, "")
    .replace(/^↩️\s*/, "")
    .replace(/^🪙\s*/, "");
}

export default function BattleLog({ logs = [] }) {
  const [isOpen, setIsOpen] = useState(true);
  const listRef = useRef(null);

  const visibleLogs = useMemo(() => {
    return logs
      .filter(
        (log) =>
          typeof log === "string" &&
          log.trim().length > 0
      )
      .map((message, index) => {
        const type = getLogType(message);

        return {
          id: `${message}-${index}`,
          message,
          cleanMessage: cleanLogMessage(message),
          type,
          icon: getLogIcon(type),
        };
      });
  }, [logs]);

  useEffect(() => {
    if (!listRef.current) return;

    listRef.current.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [logs]);

  return (
    <section
      className={`battle-log-panel ${
        isOpen ? "is-open" : "is-closed"
      }`}
    >
      <button
        type="button"
        className="battle-log-header"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
      >
        <div className="battle-log-title-area">
          <span className="battle-log-title-icon">
            ☰
          </span>

          <div>
            <span className="battle-log-kicker">
              MATCH HISTORY
            </span>

            <h2>BATTLE LOG</h2>
          </div>
        </div>

        <div className="battle-log-header-right">
          <span className="battle-log-count">
            {visibleLogs.length}
          </span>

          <span className="battle-log-chevron">
            {isOpen ? "⌃" : "⌄"}
          </span>
        </div>
      </button>

      {isOpen && (
        <div
          className="battle-log-list"
          ref={listRef}
        >
          {visibleLogs.length === 0 ? (
            <div className="battle-log-empty">
              <span>⚔</span>
              <p>バトルが始まると履歴が表示されます</p>
            </div>
          ) : (
            visibleLogs.map((log, index) => (
              <div
                key={log.id}
                className={`battle-log-item log-${log.type} ${
                  index === 0 ? "is-latest" : ""
                }`}
              >
                <div className="battle-log-marker">
                  <span>{log.icon}</span>
                </div>

                <div className="battle-log-body">
                  <div className="battle-log-meta">
                    <span className="battle-log-type">
                      {getTypeLabel(log.type)}
                    </span>

                    {index === 0 && (
                      <span className="battle-log-new">
                        NEW
                      </span>
                    )}
                  </div>

                  <p>{log.cleanMessage}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}

function getTypeLabel(type) {
  switch (type) {
    case "turn":
      return "TURN";
    case "damage":
      return "DAMAGE";
    case "heal":
      return "HEAL";
    case "shield":
      return "SHIELD";
    case "card":
      return "CARD";
    case "victory":
      return "RESULT";
    case "danger":
      return "ERROR";
    case "warning":
      return "WARNING";
    case "selection":
      return "SELECT";
    case "system":
      return "SYSTEM";
    default:
      return "INFO";
  }
}