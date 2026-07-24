import "./Settings.css";
import { useState } from "react";
import {
  getSettings,
  saveSettings,
} from "../lib/settings";
import { setBattleBgmVolume } from "../lib/sound";

export default function Settings({
  goBack,
  onClose,
  onSurrender,
  isModal = false,
}) {
  const [settings, setSettings] = useState(getSettings());

  function updateSetting(key, value) {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (key === "bgmVolume") {
      setBattleBgmVolume(value);
    }
  }

  function handleClose() {
    if (isModal) {
      onClose?.();
      return;
    }

    goBack?.();
  }

  return (
    <main
      className={
        isModal
          ? "settings-page settings-page-modal"
          : "settings-page"
      }
    >
      <section className="settings-panel">
        <h1 className="settings-title">
          ⚙ SETTINGS
        </h1>

        <div className="settings-item">
          <div className="settings-label">
            <span>🎵 BGM</span>
            <strong>{settings.bgmVolume}%</strong>
          </div>

          <input
  type="range"
  min="0"
  max="1"
  step="0.01"
  value={bgmVolume}
  onInput={(e) => {
    const value = Number(e.currentTarget.value);

    setBgmVolume(value);
    localStorage.setItem("bgmVolume", String(value));

    window.dispatchEvent(
      new CustomEvent("game-settings-change", {
        detail: { bgmVolume: value },
      })
    );
  }}
/>
        </div>

        <div className="settings-item">
          <div className="settings-label">
            <span>🔊 SE</span>
            <strong>{settings.seVolume}%</strong>
          </div>

          <input
  type="checkbox"
  checked={soundEnabled}
  onChange={(e) => {
    const value = e.currentTarget.checked;

    setSoundEnabled(value);
    localStorage.setItem("soundEnabled", JSON.stringify(value));

    window.dispatchEvent(
      new CustomEvent("game-settings-change", {
        detail: { soundEnabled: value },
      })
    );
  }}
/>
        </div>

        <label className="settings-toggle">
          <span>📳 画面揺れ</span>

          <input
            type="checkbox"
            checked={settings.screenShake}
            onChange={(event) =>
              updateSetting(
                "screenShake",
                event.target.checked
              )
            }
          />
        </label>

        <label className="settings-toggle">
          <span>🃏 カード演出</span>

          <input
            type="checkbox"
            checked={settings.cardAnimation}
            onChange={(event) =>
              updateSetting(
                "cardAnimation",
                event.target.checked
              )
            }
          />
        </label>
{isModal && (
  <button
    type="button"
    className="settings-surrender-button"
    onClick={onSurrender}
  >
    🏳️ 降参する
  </button>
)}
        <button
          type="button"
          className="settings-back-button"
          onClick={handleClose}
        >
          {isModal
            ? "戦闘に戻る"
            : "← メニューへ戻る"}
        </button>
      </section>
    </main>
  );
}