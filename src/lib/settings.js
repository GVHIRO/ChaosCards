const STORAGE_KEY = "chaosCardsSettings";

const DEFAULT_SETTINGS = {
  bgmVolume: 100,
  seVolume: 100,
  screenShake: true,
  cardAnimation: true,
};

export function getSettings() {
  const savedSettings =
    localStorage.getItem(STORAGE_KEY);

  if (!savedSettings) {
    return DEFAULT_SETTINGS;
  }

  try {
    return {
      ...DEFAULT_SETTINGS,
      ...JSON.parse(savedSettings),
    };
  } catch (error) {
    console.error(
      "設定の読み込みエラー:",
      error
    );

    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );

    window.dispatchEvent(
      new Event("chaos-settings-change")
    );
  } catch (error) {
    console.error(
      "設定の保存エラー:",
      error
    );
  }
}