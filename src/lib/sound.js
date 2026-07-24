import { getSettings } from "./settings";

const defaultVolumes = {
  bgm: 0.15,
  card: 0.4,
  damage: 0.6,
  heal: 0.6,
  shield: 0.35,
  turn: 0.25,
  victory: 0.6,
  defeat: 0.45,
};

const soundPaths = {
  bgm: "/sounds/battle-bgm.mp3",
  card: "/sounds/card.mp3",
  damage: "/sounds/damage.mp3",
  heal: "/sounds/heal.mp3",
  shield: "/sounds/shield.mp3",
  turn: "/sounds/turn.mp3",
  victory: "/sounds/victory.mp3",
  defeat: "/sounds/defeat.mp3",
};

let audioContext = null;

const audioBuffers = {};

let battleBgmSource = null;
let battleBgmGain = null;

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;

    if (!AudioContextClass) {
      console.warn(
        "このブラウザはWeb Audio APIに対応していません"
      );

      return null;
    }

    audioContext = new AudioContextClass();
  }

  return audioContext;
}

export async function unlockAudio() {
  const context = getAudioContext();

  if (!context) return;

  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.warn(
        "音声の有効化に失敗しました:",
        error
      );
    }
  }
}

async function loadAudioBuffer(name) {
  if (audioBuffers[name]) {
    return audioBuffers[name];
  }

  const path = soundPaths[name];

  if (!path) {
    throw new Error(
      `存在しないサウンドです: ${name}`
    );
  }

  const context = getAudioContext();

  if (!context) return null;

  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(
      `音声ファイルを取得できませんでした: ${path}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();

  const decodedBuffer =
    await context.decodeAudioData(arrayBuffer);

  audioBuffers[name] = decodedBuffer;

  return decodedBuffer;
}

function clampVolume(value) {
  return Math.max(
    0,
    Math.min(1, Number(value) || 0)
  );
}

export async function playSound(name) {
  if (!soundPaths[name] || name === "bgm") {
    console.warn(`存在しないSEです: ${name}`);
    return;
  }

  try {
    await unlockAudio();

    const context = getAudioContext();

    if (!context) return;

    const buffer = await loadAudioBuffer(name);

    if (!buffer) return;

    const settings = getSettings();

    const settingVolume = clampVolume(
      Number(settings.seVolume) / 100
    );

    const baseVolume =
      defaultVolumes[name] ?? 0.5;

    const source =
      context.createBufferSource();

    const gainNode = context.createGain();

    source.buffer = buffer;

    gainNode.gain.value = clampVolume(
      baseVolume * settingVolume
    );

    source.connect(gainNode);
    gainNode.connect(context.destination);

    source.start(0);
  } catch (error) {
    console.warn("SE再生エラー:", error);
  }
}

let battleBgm = null;
let battleBgmPlaying = false;

export function startBattleBgm() {
  if (!battleBgm) {
    battleBgm = new Audio("/sounds/battle-bgm.mp3");
    battleBgm.loop = true;
    battleBgm.preload = "auto";
  }

  const settings = getSettings();

  const finalVolume = Math.max(
    0,
    Math.min(
      1,
      defaultVolumes.bgm *
        (Number(settings.bgmVolume) / 100)
    )
  );

  battleBgm.volume = finalVolume;

  if (!battleBgmPlaying) {
    battleBgm
      .play()
      .then(() => {
        battleBgmPlaying = true;
      })
      .catch((error) => {
        console.warn("BGM再生エラー:", error);
      });
  }
}

export function stopBattleBgm() {
  if (!battleBgm) return;

  battleBgm.pause();
  battleBgm.currentTime = 0;
  battleBgmPlaying = false;
}

export async function setBattleBgmVolume(volume) {
  if (!battleBgm) return;

  const finalVolume = Math.max(
    0,
    Math.min(
      1,
      defaultVolumes.bgm *
        (Number(volume) / 100)
    )
  );

  const wasPlaying =
    battleBgmPlaying && !battleBgm.paused;

  battleBgm.volume = finalVolume;

  // iPhone Safari対策
  if (wasPlaying) {
    const currentTime = battleBgm.currentTime;

    battleBgm.pause();
    battleBgmPlaying = false;

    battleBgm.currentTime = currentTime;

    try {
      await battleBgm.play();
      battleBgmPlaying = true;
    } catch (error) {
      console.warn(
        "BGM音量変更後の再生エラー:",
        error
      );
    }
  }
}