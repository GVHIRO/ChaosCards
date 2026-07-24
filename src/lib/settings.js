const STORAGE_KEY = "chaosCardsSettings";

const DEFAULT_SETTINGS = {
  bgmVolume: 100,
  seVolume: 100,
  screenShake: true,
  cardAnimation: true,
};

export function getSettings() {
  try {
    const savedSettings =
      localStorage.getItem(STORAGE_KEY);

    if (!savedSettings) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(savedSettings);

    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (error) {
    console.error(
      "設定の読み込みエラー:",
      error
    );

    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(settings)
    );

    window.dispatchEvent(
      new CustomEvent("chaos-settings-change", {
        detail: settings,
      })
    );
  } catch (error) {
    console.error(
      "設定の保存エラー:",
      error
    );
  }
}