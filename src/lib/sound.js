const defaultVolumes = {
  bgm: 0.18,

  card: 0.40,
  damage: 0.70,
  heal: 0.70,
  shield: 0.45,
  turn: 0.25,
  victory: 0.60,
  defeat: 0.45,
};
const soundPaths = {
  card: "/sounds/card.mp3",
  damage: "/sounds/damage.mp3",
  heal: "/sounds/heal.mp3",
  shield: "/sounds/shield.mp3",
  turn: "/sounds/turn.mp3",
  victory: "/sounds/victory.mp3",
  defeat: "/sounds/defeat.mp3",
};

const audioCache = {};

export function playSound(
  name,
  volume = defaultVolumes[name] ?? 0.6
) {
  const path = soundPaths[name];

  if (!path) {
    console.warn(`存在しないSEです: ${name}`);
    return;
  }

  try {
    if (!audioCache[name]) {
      audioCache[name] = new Audio(path);
    }

    const audio = audioCache[name].cloneNode();
    audio.volume = volume;
    audio.play().catch((error) => {
      console.warn("SE再生エラー:", error);
    });
  } catch (error) {
    console.error("SE作成エラー:", error);
  }
}

let battleBgm = null;

export function startBattleBgm(
  volume = defaultVolumes.bgm
) {
  if (!battleBgm) {
    battleBgm = new Audio("/sounds/battle-bgm.mp3");
    battleBgm.loop = true;
  }

  battleBgm.volume = volume;

  battleBgm.play().catch((error) => {
    console.warn("BGM再生エラー:", error);
  });
}

export function stopBattleBgm() {
  if (!battleBgm) return;

  battleBgm.pause();
  battleBgm.currentTime = 0;
}

export function setBattleBgmVolume(volume) {
  if (!battleBgm) return;

  battleBgm.volume = Math.max(0, Math.min(1, volume));
}