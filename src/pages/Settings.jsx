import "./Settings.css";
import { useState } from "react";
import {
  getSettings,
  saveSettings,
} from "../lib/settings";
import { setBattleBgmVolume } from "../lib/sound";

export default function Settings({ goBack }) {
  const [settings, setSettings] = useState(getSettings());

  function updateSetting(key, value) {
    const nextSettings = {
      ...settings,
      [key]: value,
    };

    setSettings(nextSettings);
    saveSettings(nextSettings);

    if (key === "bgmVolume") {
      setBattleBgmVolume(
        0.15 * (value / 100)
      );
    }
  }

  return (
  <main className="settings-page">
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
            max="100"
            value={settings.bgmVolume}
            onChange={(event) =>
              updateSetting(
                "bgmVolume",
                Number(event.target.value)
              )
            }
          />
        </div>

        <div className="settings-item">
          <div className="settings-label">
            <span>🔊 SE</span>
            <strong>{settings.seVolume}%</strong>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            value={settings.seVolume}
            onChange={(event) =>
              updateSetting(
                "seVolume",
                Number(event.target.value)
              )
            }
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

        <button
        type="button"
        className="settings-back-button"
        onClick={goBack}
      >
        ← メニューへ戻る
      </button>
    </section>
  </main>
);
}