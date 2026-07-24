import { getSettings } from "../lib/settings";
import Settings from "./Settings";
import {
  startBattleBgm,
  stopBattleBgm,
  unlockAudio,
  playSound,
} from "../lib/sound";
import { updateStatus } from "../lib/status";
import BattleStatus from "../components/BattleStatus";
import BattleField from "../components/BattleField";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import BattleLog from "../components/BattleLog";
import Card from "../components/Card";
import cards from "../data/cards";
import "../App.css";

const INITIAL_HP = 40;
const MAX_HP = 40;
const INITIAL_ENERGY = 3;
const MAX_ENERGY = 5;
const ENERGY_PER_TURN = 3;
const INITIAL_HAND_SIZE = 5;
const MAX_HAND_SIZE = 7;
const HEARTBEAT_INTERVAL = 5000;
const DISCONNECT_TIMEOUT = 20000;

function getHpColor(currentHp, maxHp) {
  const rate = currentHp / maxHp;
  if (rate > 0.6) return "#32d74b";
  if (rate > 0.3) return "#ffcc00";
  return "#ff453a";
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function createDefaultDeck() {
  const newDeck = [];

  cards.forEach((card) => {
    let copies = 1;
    if (card.rarity === "Common") copies = 3;
    if (card.rarity === "Rare") copies = 2;

    for (let index = 0; index < copies; index += 1) {
      newDeck.push(card);
    }
  });

  return shuffle(newDeck);
}

function loadDeck() {
  const savedDeck = localStorage.getItem("chaosCardsDeck");

  if (savedDeck) {
    try {
      const parsed = JSON.parse(savedDeck);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return shuffle(parsed);
      }
    } catch (error) {
      console.error("デッキ読込エラー:", error);
    }
  }

  return createDefaultDeck();
}

function getShieldValue(card) {
  if (typeof card.shield === "number") return card.shield;
  if (!card.shield) return 0;

  // 古いカードデータ（shield: true）との互換用
  return 4 + Number(card.cost || 0) * 3;
}

function summarizeCards(selectedCards) {
  return selectedCards.reduce(
    (summary, selected) => {
      const card = selected.card ?? selected;
      const hits = Number(card.hits || 1);

      summary.damage += Number(card.damage || 0) * hits;
      summary.heal += Number(card.heal || 0);
      summary.shield += getShieldValue(card);
      summary.names.push(card.name);
      return summary;
    },
    { damage: 0, heal: 0, shield: 0, names: [] }
  );
}
function createCardEffectLogs(
  actor,
  target,
  selectedCards,
  targetHp,
  targetShield,
  myHp
) {
  if (
    !Array.isArray(selectedCards) ||
    selectedCards.length === 0
  ) {
    return [
      `⏭️ ${actor}は何もせずターン終了`,
    ];
  }

  const logs = [];

  selectedCards.forEach((selected) => {
    const card = selected.card ?? selected;
    const hits = Number(card.hits || 1);
    const damage =
      Number(card.damage || 0) * hits;
    const heal = Number(card.heal || 0);
    const shield = getShieldValue(card);

    logs.push(`🎴 ${actor}：${card.name}`);

    if (damage > 0) {
      logs.push(
        `　└ ⚔️ ${target}に${damage}ダメージ`
      );
    }

    if (heal > 0) {
      logs.push(
        `　└ 💚 ${actor}が${heal}回復`
      );
    }

    if (shield > 0) {
      logs.push(
        `　└ 🛡️ ${actor}がシールド${shield}獲得`
      );
    }
  });

  return logs;
}
function applyDamage(hp, shield, damage) {
  const blocked = Math.min(shield, damage);
  const hpDamage = Math.max(0, damage - blocked);

  return {
    hp: Math.max(0, hp - hpDamage),
    shield: Math.max(0, shield - blocked),
    blocked,
    hpDamage,
  };
}

function nextRole(role) {
  return role === "host" ? "guest" : "host";
}

function roleLabel(role, myRole) {
  return role === myRole ? "YOU" : "相手";
}
function createCardLogs(actor, usedCards) {
  if (!Array.isArray(usedCards) || usedCards.length === 0) {
    return [`⏭️ ${actor}はカードを使用しなかった`];
  }

  return usedCards.map((selected) => {
    const card = selected.card ?? selected;

    return `🎴 ${actor}：${card.name}`;
  });
}
function getCardsFromBattleLogs(battleLogs) {
  if (!Array.isArray(battleLogs)) {
    return [];
  }

  const cardNames = battleLogs
    .filter(
      (log) =>
        typeof log === "string" &&
        log.startsWith("🎴")
    )
    .map((log) => {
      const separatorIndex = log.indexOf("：");

      if (separatorIndex === -1) {
        return "";
      }

      return log
        .slice(separatorIndex + 1)
        .trim();
    })
    .filter(Boolean);

  return cardNames
    .map((name) =>
      cards.find((card) => card.name === name)
    )
    .filter(Boolean);
}
function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);

    const handleChange = (event) => {
      setMatches(event.matches);
    };

    setMatches(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}
export default function Battle({
  mode = "cpu",
  matchId,
  playerRole,
  restartGame,
  goToMenu,
}) {
  const [playerHP, setPlayerHP] = useState(INITIAL_HP);
  const [enemyHP, setEnemyHP] = useState(INITIAL_HP);
  const [playerShield, setPlayerShield] = useState(0);
  const [enemyShield, setEnemyShield] = useState(0);
  const [energy, setEnergy] = useState(INITIAL_ENERGY);
  const [cpuEnergy, setCpuEnergy] = useState(INITIAL_ENERGY);
  const [turnNumber, setTurnNumber] = useState(1);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [firstPlayer, setFirstPlayer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingMatch, setIsLoadingMatch] = useState(mode === "online");
  const [coinVisible, setCoinVisible] = useState(true);
  const [drawnIndex, setDrawnIndex] = useState(null);
  const [playerEffect, setPlayerEffect] = useState(null);
  const [enemyEffect, setEnemyEffect] = useState(null);
  const [winner, setWinner] = useState(null);
  const [match, setMatch] = useState(null);
  const [logs, setLogs] = useState([]);
  const [selectedCards, setSelectedCards] = useState([]);
  const [deck, setDeck] = useState(loadDeck);
  const [hand, setHand] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] =
  useState(false);
  const [discardPile, setDiscardPile] = useState([]);
  const [cardAnimation, setCardAnimation] = useState(null);
  const [battleEffect, setBattleEffect] = useState(null);
  const [playedCards, setPlayedCards] = useState([]);
  const [screenShake, setScreenShake] = useState(false);
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [gameSettings, setGameSettings] = useState(getSettings());
  const [turnPopup, setTurnPopup] = useState(null);

  const cardAnimationTimerRef = useRef(null);
  const handRef = useRef(hand);
  const deckRef = useRef(deck);
  const discardRef = useRef(discardPile);
  const selectedRef = useRef(selectedCards);
  const energyRef = useRef(energy);
  const matchRef = useRef(null);
  const initializedRef = useRef(false);
  const previousTurnRef = useRef(null);
  const battleEndingRef = useRef(false);
const resultTimerRef = useRef(null);

const RESULT_DELAY = 800;

function finishBattle(result) {
  if (battleEndingRef.current) return;

  battleEndingRef.current = true;

  resultTimerRef.current = setTimeout(() => {
    setWinner(result);
  }, RESULT_DELAY);
}
  useEffect(() => {
    handRef.current = hand;
  }, [hand]);
  useEffect(() => {
    deckRef.current = deck;
  }, [deck]);
  useEffect(() => {
    discardRef.current = discardPile;
  }, [discardPile]);
  useEffect(() => {
    selectedRef.current = selectedCards;
  }, [selectedCards]);
  useEffect(() => {
  energyRef.current = energy;
}, [energy]);

useEffect(() => {
  function handleSettingsChange(event) {
    const nextSettings =
      event.detail ?? getSettings();

    setGameSettings(nextSettings);
  }

  window.addEventListener(
    "chaos-settings-change",
    handleSettingsChange
  );

  return () => {
    window.removeEventListener(
      "chaos-settings-change",
      handleSettingsChange
    );
  };
}, []);
useEffect(() => {
  if (!gameSettings.cardAnimation) {
    setCardAnimation(null);

    if (cardAnimationTimerRef.current) {
      window.clearTimeout(
        cardAnimationTimerRef.current
      );

      cardAnimationTimerRef.current = null;
    }
  }

  if (!gameSettings.screenShake) {
    setScreenShake(false);
  }
}, [
  gameSettings.cardAnimation,
  gameSettings.screenShake,
]);
 useEffect(() => {
  async function initAudio() {
    await unlockAudio();
    await startBattleBgm();
  }

  initAudio();

  return () => {
    stopBattleBgm();
  };
}, []);
useEffect(() => {
  if (!winner) return;

  stopBattleBgm();

  if (winner === "player") {
    playSound("victory");
  } else if (winner === "enemy") {
    playSound("defeat");
  }
}, [winner]);

  const isMyTurn = useMemo(() => {
    if (mode === "cpu") return currentPlayer === "player";
    return currentPlayer === playerRole;
  }, [currentPlayer, mode, playerRole]);

  const opponentName = mode === "online" ? "OPPONENT" : "CPU";

  const addLogs = useCallback((newLogs) => {
    setLogs((previous) => [...newLogs, ...previous].slice(0, 12));
  }, []);

  const showPlayerEffect = useCallback((text, type) => {
    setPlayerEffect({ text, type, id: Date.now() });
    window.setTimeout(() => setPlayerEffect(null), 900);
  }, []);

  const showCardAnimation = useCallback(
  (side, usedCards) => {
    if (!gameSettings.cardAnimation) {
      setCardAnimation(null);
      return;
    }

    if (
      !Array.isArray(usedCards) ||
      usedCards.length === 0
    ) {
      return;
    }

    if (cardAnimationTimerRef.current) {
      window.clearTimeout(
        cardAnimationTimerRef.current
      );
    }

    setCardAnimation({
      side,
      cards: usedCards,
      id: Date.now(),
    });

    cardAnimationTimerRef.current =
      window.setTimeout(() => {
        setCardAnimation(null);
      }, 1600);
  },
  [gameSettings.cardAnimation]
);
useEffect(() => {
  return () => {
    if (cardAnimationTimerRef.current) {
      window.clearTimeout(
        cardAnimationTimerRef.current
      );
    }
  };
}, []);
  const showEnemyEffect = useCallback((text, type) => {
    setEnemyEffect({ text, type, id: Date.now() });
    window.setTimeout(() => setEnemyEffect(null), 900);
  }, []);

  const drawFromDeck = useCallback((count, currentHand = handRef.current) => {
    let workingDeck = [...deckRef.current];
    let workingDiscard = [...discardRef.current];
    const drawn = [];
    const slots = Math.max(0, MAX_HAND_SIZE - currentHand.length);
    const drawCount = Math.min(count, slots);

    for (let index = 0; index < drawCount; index += 1) {
      if (workingDeck.length === 0 && workingDiscard.length > 0) {
        workingDeck = shuffle(workingDiscard);
        workingDiscard = [];
      }

      const card = workingDeck.shift();
      if (!card) break;
      drawn.push(card);
    }

    deckRef.current = workingDeck;
    discardRef.current = workingDiscard;
    setDeck(workingDeck);
    setDiscardPile(workingDiscard);
    return drawn;
  }, []);

  const consumeSelectedCards = useCallback(() => {
    const usedIndexes = new Set(selectedRef.current.map((item) => item.handIndex));
    const usedCards = selectedRef.current.map((item) => item.card);
    const remainingHand = handRef.current.filter((_, index) => !usedIndexes.has(index));

    const newDiscard = [...discardRef.current, ...usedCards];
    discardRef.current = newDiscard;
    setDiscardPile(newDiscard);

    handRef.current = remainingHand;
    const replacements = drawFromDeck(usedCards.length, remainingHand);
    const nextHand = [...remainingHand, ...replacements];

    handRef.current = nextHand;
    setHand(nextHand);
    setSelectedCards([]);
    selectedRef.current = [];

    if (replacements.length > 0) {
      setDrawnIndex(nextHand.length - 1);
      window.setTimeout(() => setDrawnIndex(null), 500);
    }
  }, [drawFromDeck]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const openingHand = drawFromDeck(INITIAL_HAND_SIZE, []);
    handRef.current = openingHand;
    setHand(openingHand);

    if (mode === "cpu") {
      const first = Math.random() < 0.5 ? "player" : "cpu";
      setFirstPlayer(first);
      setCurrentPlayer(first);
      setCoinVisible(true);
      addLogs([
        `🪙 コイントス！${first === "player" ? "YOU" : "CPU"}が先攻！`,
      ]);

      window.setTimeout(() => setCoinVisible(false), 1700);
    }
  }, [addLogs, drawFromDeck, mode]);
function getSelectedEnergyCost() {
  return selectedRef.current.reduce(
    (total, selected) =>
      total + Number(selected.card?.cost || 0),
    0
  );
}
  const syncMatchToView = useCallback(
    (match) => {
      matchRef.current = match;
      setMatch(match);
      setTurnNumber(Number(match.turn_number || 1));
      setCurrentPlayer(match.current_player);
      setFirstPlayer(match.first_player);

      if (playerRole === "host") {
  const serverEnergy =
  Number(match.host_energy) || 0;

const selectedCost =
  match.current_player === playerRole
    ? getSelectedEnergyCost()
    : 0;

const nextEnergy = Math.max(
  0,
  serverEnergy - selectedCost
);

setPlayerHP(match.host_hp);
setEnemyHP(match.guest_hp);
setPlayerShield(match.host_shield || 0);
setEnemyShield(match.guest_shield || 0);

energyRef.current = nextEnergy;
setEnergy(nextEnergy);
} else {
  const serverEnergy =
  Number(match.guest_energy) || 0;

const selectedCost =
  match.current_player === playerRole
    ? getSelectedEnergyCost()
    : 0;

const nextEnergy = Math.max(
  0,
  serverEnergy - selectedCost
);

setPlayerHP(match.guest_hp);
setEnemyHP(match.host_hp);
setPlayerShield(match.guest_shield || 0);
setEnemyShield(match.host_shield || 0);

energyRef.current = nextEnergy;
setEnergy(nextEnergy);
}

      if (
  match.phase === "finished" &&
  match.winner
) {
  const result =
    match.winner === "draw"
      ? "draw"
      : match.winner === playerRole
        ? "player"
        : "enemy";

  const isKnockout =
    Number(match.host_hp) <= 0 ||
    Number(match.guest_hp) <= 0;

  if (isKnockout) {
    finishBattle(result);
  } else {
    // 降参など、HPが0ではない決着
    setWinner(result);
  }
}
    },
    [playerRole]
  );

  useEffect(() => {
    if (mode !== "online" || !matchId || !playerRole) return undefined;

    let mounted = true;

    async function loadMatch() {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("id", matchId)
        .single();

      if (!mounted) return;

      if (error) {
        addLogs([`❌ 試合読込エラー：${error.message}`]);
        setIsLoadingMatch(false);
        return;
      }

      syncMatchToView(data);
      setCoinVisible(true);
      setIsLoadingMatch(false);
      addLogs([
        `🪙 コイントス結果：${roleLabel(data.first_player, playerRole)}が先攻！`,
      ]);
      window.setTimeout(() => setCoinVisible(false), 1700);
    }

    loadMatch();

    const channel = supabase
      .channel(`turn-based-match-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
  console.log("Realtime UPDATE", payload);

  const previous = matchRef.current;
  const next = payload.new;

  // 最優先で試合状態を同期する
  syncMatchToView(next);

if (previousTurnRef.current !== next.current_player) {
  previousTurnRef.current = next.current_player;
  showTurnPopup(next.current_player === playerRole);
}
if (
  next.phase === "finished" &&
  next.finish_reason === "disconnect"
) {
  addLogs([
    next.winner === playerRole
      ? "🏆 相手が切断しました"
      : "❌ 接続が切断されました",
  ]);
}
  if (
    previous &&
    Number(next.turn_number) >
      Number(previous.turn_number)
  ) {
    playSound("turn");
    try {
      const usedCards =
        getCardsFromBattleLogs(
          next.battle_logs
        );

      if (
        previous.current_player !==
          playerRole &&
        usedCards.length > 0
      ) {
        showCardAnimation(
          "enemy",
          usedCards
        );
      }
    } catch (error) {
      console.error(
        "相手カード演出エラー:",
        error
      );
    }

    const battleLogs =
      Array.isArray(next.battle_logs)
        ? next.battle_logs
        : [];

    addLogs([
      `🔄 ターン${next.turn_number}：${
        roleLabel(
          next.current_player,
          playerRole
        )
      }の番`,
      ...battleLogs,
    ]);
  }
}
      )
      .subscribe((status) => {
  console.log("Realtime status:", status);
});

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [addLogs, matchId, mode, playerRole, syncMatchToView]);
// 自分が対戦画面を開いていることを5秒ごとに通知
useEffect(() => {
  if (
    !matchId ||
    !playerRole ||
    match?.phase !== "playing"
  ) {
    return undefined;
  }

  const lastSeenColumn =
    playerRole === "host"
      ? "host_last_seen"
      : "guest_last_seen";

  async function sendHeartbeat() {
    const { error } = await supabase
      .from("matches")
      .update({
        [lastSeenColumn]:
          new Date().toISOString(),
      })
      .eq("id", matchId)
      .eq("phase", "playing");

    if (error) {
      console.error(
        "生存確認の送信エラー:",
        error
      );
    }
  }

  sendHeartbeat();

  const intervalId = window.setInterval(
    sendHeartbeat,
    HEARTBEAT_INTERVAL
  );

  return () => {
    window.clearInterval(intervalId);
  };
}, [
  matchId,
  playerRole,
  match?.phase,
]);
// 相手の生存確認が20秒止まったら切断勝利
useEffect(() => {
  if (
    !matchId ||
    !playerRole ||
    match?.phase !== "playing"
  ) {
    return undefined;
  }

  let isChecking = false;

  async function checkOpponentConnection() {
    if (isChecking) return;

    isChecking = true;

    try {
      const { data: latestMatch, error } =
        await supabase
          .from("matches")
          .select(`
            id,
            phase,
            winner,
            host_last_seen,
            guest_last_seen
          `)
          .eq("id", matchId)
          .maybeSingle();

      if (error || !latestMatch) {
        console.error(
          "接続状態取得エラー:",
          error
        );
        return;
      }

      if (
        latestMatch.phase !== "playing" ||
        latestMatch.winner
      ) {
        return;
      }

      const opponentLastSeen =
        playerRole === "host"
          ? latestMatch.guest_last_seen
          : latestMatch.host_last_seen;

      if (!opponentLastSeen) {
        return;
      }

      const elapsed =
        Date.now() -
        new Date(opponentLastSeen).getTime();

      if (elapsed < DISCONNECT_TIMEOUT) {
        return;
      }

      const { error: finishError } =
        await supabase
          .from("matches")
          .update({
            winner: playerRole,
            phase: "finished",
            finish_reason: "disconnect",
          })
          .eq("id", matchId)
          .eq("phase", "playing")
          .is("winner", null);

      if (finishError) {
        console.error(
          "切断勝利処理エラー:",
          finishError
        );
      }
    } finally {
      isChecking = false;
    }
  }

  const intervalId = window.setInterval(
    checkOpponentConnection,
    5000
  );

  return () => {
    window.clearInterval(intervalId);
  };
}, [
  matchId,
  playerRole,
  match?.phase,
]);
useEffect(() => {
  return () => {
    if (resultTimerRef.current) {
      clearTimeout(resultTimerRef.current);
    }
  };
}, []);
function showTurnPopup(myTurn) {
  setTurnPopup(myTurn ? "player" : "enemy");

  setTimeout(() => {
    setTurnPopup(null);
  }, 1200);
}
  function playCard(index) {
  if (!isMyTurn || isProcessing || winner) return;

  const card = handRef.current[index];
  if (!card) return;

  const cardCost = Number(card.cost || 0);

  const selectedIndex =
    selectedRef.current.findIndex(
      (item) => item.handIndex === index
    );

  // 選択解除
  if (selectedIndex >= 0) {
    const nextSelected =
      selectedRef.current.filter(
        (_, itemIndex) =>
          itemIndex !== selectedIndex
      );

    const nextEnergy = Math.min(
      MAX_ENERGY,
      energyRef.current + cardCost
    );

    selectedRef.current = nextSelected;
    energyRef.current = nextEnergy;

    setSelectedCards(nextSelected);
    setEnergy(nextEnergy);

    
    return;
  }

  // 最新値でエネルギー判定
  if (energyRef.current < cardCost) {
    return;
  }

  playSound("card");

  const nextEnergy =
    energyRef.current - cardCost;

  const nextSelected = [
    ...selectedRef.current,
    {
      card,
      handIndex: index,
    },
  ];

  // Reactの描画より先にRefを更新
  energyRef.current = nextEnergy;
  selectedRef.current = nextSelected;

  setEnergy(nextEnergy);
  setSelectedCards(nextSelected);
}

  function chooseCpuCards(availableEnergy) {
    let remaining = availableEnergy;
    const chosen = [];
    let attempts = 0;

    while (remaining > 0 && attempts < 20) {
      attempts += 1;
      const affordable = cards.filter((card) => Number(card.cost) <= remaining);
      if (affordable.length === 0) break;

      // HPが少ないと回復・防御を少し優先する
      let pool = affordable;
      if (enemyHP <= 15) {
        const survival = affordable.filter((card) => card.heal || card.shield);
        if (survival.length > 0 && Math.random() < 0.65) pool = survival;
      }

      const card = pool[Math.floor(Math.random() * pool.length)];
      chosen.push(card);
      remaining -= Number(card.cost);
    }

    return { chosen, remaining };
  }

  async function executeCpuTurn() {
    if (winner || currentPlayer !== "cpu" || isProcessing) return;
    setIsProcessing(true);

    await new Promise((resolve) => window.setTimeout(resolve, 850));

    const { chosen, remaining } = chooseCpuCards(cpuEnergy);
    showCardAnimation("enemy", chosen);

await new Promise((resolve) => {
  window.setTimeout(resolve, 650);
});
    const summary = summarizeCards(chosen);
    const damaged = applyDamage(playerHP, playerShield, summary.damage);
    const healedEnemy = Math.min(MAX_HP, enemyHP + summary.heal);

    setPlayerHP(damaged.hp);
    setPlayerShield(damaged.shield);
    setEnemyHP(healedEnemy);
    setEnemyShield((value) => value + summary.shield);
    setCpuEnergy(remaining);

    const turnLogs = createCardEffectLogs(
  "CPU",
  "YOU",
  chosen,
  playerHP,
  playerShield,
  enemyHP
);

    if (damaged.blocked > 0) turnLogs.push(`YOUの盾が${damaged.blocked}ダメージ防御`);
    if (damaged.hpDamage > 0) {
  playSound("damage");

  if (gameSettings.screenShake) {
  setScreenShake(true);

  window.setTimeout(() => {
    setScreenShake(false);
  }, 300);
}
  showPlayerEffect(`-${damaged.hpDamage}`, "damage");
}
    if (summary.heal > 0) {
      const actual = healedEnemy - enemyHP;
      if (actual > 0) {
  playSound("heal");

  
  showEnemyEffect(`+${actual}`, "heal");
}
    }
    if (summary.shield > 0) {
  playSound("shield");
}

    addLogs(turnLogs);

    if (damaged.hp <= 0) {
      finishBattle("enemy");
      setIsProcessing(false);
      return;
    }

    const isPlayerFirstTurn =
  firstPlayer === "cpu" &&
  turnNumber === 1;
playSound("turn");
setTurnNumber((value) => value + 1);
setCurrentPlayer("player");
showTurnPopup(true);

// CPU先攻後のプレイヤー初回ターンは初期値3のまま
if (!isPlayerFirstTurn) {
  setEnergy((value) =>
    Math.min(
      MAX_ENERGY,
      value + ENERGY_PER_TURN
    )
  );
}

setPlayerShield(0);
setIsProcessing(false);
  }

  useEffect(() => {
  if (
    mode === "cpu" &&
    currentPlayer === "cpu" &&
    !winner &&
    !isProcessing &&
    !coinVisible
  ) {
    executeCpuTurn();
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [
  currentPlayer,
  mode,
  winner,
  isProcessing,
  coinVisible,
]);

  async function endCpuPlayerTurn() {
    setPlayedCards(
  selectedCards.map((selected) => selected.handIndex)
);
    showCardAnimation(
    "player",
    selectedCards.map(
      (selected) => selected.card
    )
  );

  await new Promise((resolve) => {
    window.setTimeout(resolve, 650);
  });

    const summary = summarizeCards(selectedCards);
    const damaged = applyDamage(enemyHP, enemyShield, summary.damage);
    const healedPlayer = Math.min(MAX_HP, playerHP + summary.heal);

    setEnemyHP(damaged.hp);
    setEnemyShield(damaged.shield);
    setPlayerHP(healedPlayer);
    setPlayerShield((value) => value + summary.shield);

    const turnLogs = createCardEffectLogs(
  "YOU",
  "CPU",
  selectedRef.current,
  enemyHP,
  enemyShield,
  playerHP
);

    if (damaged.blocked > 0) turnLogs.push(`CPUの盾が${damaged.blocked}ダメージ防御`);
    if (damaged.hpDamage > 0) {
      playSound("damage");
  if (gameSettings.screenShake) {
  setScreenShake(true);

  window.setTimeout(() => {
    setScreenShake(false);
  }, 300);
}

  showEnemyEffect(`-${damaged.hpDamage}`, "damage");
}
    if (summary.heal > 0) {
      const actual = healedPlayer - playerHP;
      if (actual > 0) {
  playSound("heal");

  showPlayerEffect(`+${actual}`, "heal");
}
    }
    if (summary.shield > 0) {
  playSound("shield");
}

    addLogs(turnLogs);
    consumeSelectedCards();
    setPlayedCards([]);

    if (damaged.hp <= 0) {
      finishBattle("player");
      return;
    }
playSound("turn");
    setTurnNumber((value) => value + 1);
    setCurrentPlayer("cpu");
  showTurnPopup(false);
    setCpuEnergy((value) => Math.min(MAX_ENERGY, value + ENERGY_PER_TURN));
    setEnemyShield(0);
  }

  async function endOnlineTurn() {
    const match = matchRef.current;

    if (!match || !matchId || !playerRole) {
      addLogs(["❌ 試合データがありません"]);
      return;
    }

    if (match.current_player !== playerRole) {
      addLogs(["⏳ 今は相手のターンです"]);
      return;
    }

    setIsProcessing(true);

    const actingIsHost = playerRole === "host";
    const myHp = actingIsHost ? match.host_hp : match.guest_hp;
    const opponentHp = actingIsHost ? match.guest_hp : match.host_hp;
    const opponentShield = actingIsHost
      ? Number(match.guest_shield || 0)
      : Number(match.host_shield || 0);

      setPlayedCards(
  selectedRef.current.map((selected) => selected.handIndex)
);
      showCardAnimation(
  "player",
  selectedRef.current.map(
    (selected) => selected.card
  )
);

await new Promise((resolve) => {
  window.setTimeout(resolve, 650);
});
    const summary = summarizeCards(selectedRef.current);
    const spentEnergy =
  selectedRef.current.reduce(
    (total, selected) =>
      total +
      Number(selected.card?.cost || 0),
    0
  );

const serverMyEnergy = actingIsHost
  ? Number(match.host_energy) || 0
  : Number(match.guest_energy) || 0;

const remainingEnergy = Math.max(
  0,
  serverMyEnergy - spentEnergy
);
    const damageResult = applyDamage(opponentHp, opponentShield, summary.damage);
    const healedHp = Math.min(MAX_HP, myHp + summary.heal);
    const currentMyShield = actingIsHost
      ? Number(match.host_shield || 0)
      : Number(match.guest_shield || 0);
    const newMyShield = currentMyShield + summary.shield;
    const followingPlayer = nextRole(playerRole);
    const nextTurn = Number(match.turn_number) + 1;
// 先攻の第1ターン終了後に来る、後攻の初回ターンか
const isSecondPlayerFirstTurn =
  Number(match.turn_number) === 1 &&
  match.current_player === match.first_player;
    const turnLogs = createCardEffectLogs(
  roleLabel(playerRole, playerRole),
  roleLabel(followingPlayer, playerRole),
  selectedRef.current,
  opponentHp,
  opponentShield,
  myHp
);

    if (damageResult.blocked > 0) {
      turnLogs.push(`${followingPlayer}の盾が${damageResult.blocked}ダメージ防御`);
    }
    if (damageResult.hpDamage > 0) {
       playSound("damage");
      if (gameSettings.screenShake) {
  setScreenShake(true);

  window.setTimeout(() => {
    setScreenShake(false);
  }, 300);
}
    }
    const actualHeal = healedHp - myHp;

if (actualHeal > 0) {
  playSound("heal");
  turnLogs.push(`${playerRole}が${actualHeal}回復`);
}
    if (summary.shield > 0) {
  playSound("shield");
  turnLogs.push(`${playerRole}がシールド${summary.shield}獲得`);
}

    let matchWinner = null;
    if (damageResult.hp <= 0) matchWinner = playerRole;

    const updates = {
      battle_logs: turnLogs,
      current_player: matchWinner ? playerRole : followingPlayer,
      turn_number: matchWinner ? match.turn_number : nextTurn,
      phase: matchWinner ? "finished" : "playing",
      winner: matchWinner,
    };

   if (actingIsHost) {
  updates.host_hp = healedHp;
  updates.host_shield = newMyShield;
  updates.host_energy = remainingEnergy;

  updates.guest_hp = damageResult.hp;
  updates.guest_shield = matchWinner
    ? damageResult.shield
    : 0;

  updates.guest_energy = matchWinner
    ? match.guest_energy
    : isSecondPlayerFirstTurn
      ? Number(match.guest_energy)
      : Math.min(
          MAX_ENERGY,
          Number(match.guest_energy) +
            ENERGY_PER_TURN
        );
} else {
  updates.guest_hp = healedHp;
  updates.guest_shield = newMyShield;
  updates.guest_energy = remainingEnergy;

  updates.host_hp = damageResult.hp;
  updates.host_shield = matchWinner
    ? damageResult.shield
    : 0;

  updates.host_energy = matchWinner
    ? match.host_energy
    : isSecondPlayerFirstTurn
      ? Number(match.host_energy)
      : Math.min(
          MAX_ENERGY,
          Number(match.host_energy) +
            ENERGY_PER_TURN
        );
}

    const { data: updatedMatch, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("id", matchId)
      .eq("current_player", playerRole)
      .eq("turn_number", match.turn_number)
      .select("*")
      .maybeSingle();

    if (error) {
      addLogs([`❌ ターン更新エラー：${error.message}`]);
      setIsProcessing(false);
      return;
    }

    if (!updatedMatch) {
      addLogs(["⚠️ 相手側で先に状態が更新されました。再同期します"]);
      const { data } = await supabase.from("matches").select("*").eq("id", matchId).single();
      if (data) syncMatchToView(data);
      setIsProcessing(false);
      return;
    }

    consumeSelectedCards();
    setPlayedCards([]);
    syncMatchToView(updatedMatch);
    addLogs(turnLogs);

    if (damageResult.hpDamage > 0) showEnemyEffect(`-${damageResult.hpDamage}`, "damage");
    if (actualHeal > 0) showPlayerEffect(`+${actualHeal}`, "heal");

    setIsProcessing(false);
  }
async function surrender() {
  if (!window.confirm("本当に降参しますか？")) {
    return;
  }

  // CPU戦
  if (mode === "cpu") {
    finishBattle("enemy");
    return;
  }

  // オンライン戦
  const { error } = await supabase
    .from("matches")
    .update({
      winner: nextRole(playerRole),
      phase: "finished",
      finish_reason: "surrender",
    })
    .eq("id", matchId)
    .eq("phase", "playing");

  if (error) {
    addLogs([`❌ 降参エラー：${error.message}`]);
    return;
  }

  setIsSettingsOpen(false);
}
  async function endTurn() {
    if (!isMyTurn || isProcessing || winner) return;
    setIsProcessing(true);

    try {
      if (mode === "cpu") await endCpuPlayerTurn();
      else await endOnlineTurn();
    } finally {
      if (mode === "cpu") setIsProcessing(false);
    }
  }

  if (winner) {
    const playerWon = winner === "player";
    const isDraw = winner === "draw";

    return (
      <div className="app">
        <div className="result-screen">
          <div className="result-icon">
            {isDraw ? "🤝" : playerWon ? "🏆" : "💀"}
          </div>

          <h1>
            {isDraw
              ? "DRAW!"
              : playerWon
                ? "YOU WIN!"
                : "YOU LOSE..."}
          </h1>

          <p>
            {match?.finish_reason === "disconnect"
              ? playerWon
                ? "相手が切断したため勝利しました"
                : "接続が切断されたため敗北しました"
              : match?.finish_reason === "surrender"
                ? playerWon
                  ? "相手が降参しました"
                  : "あなたは降参しました"
                : isDraw
                  ? "引き分け！"
                  : playerWon
                    ? "勝利した！"
                    : "次の戦いで取り返そう！"}
          </p>

          <div className="result-buttons">
            <button type="button" onClick={restartGame}>
              🔄 もう一回
            </button>

            <button type="button" onClick={goToMenu}>
              🏠 メニューへ戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoadingMatch) {
    return (
      <div className="app">
        <h2>⚔️ 試合を読み込んでいます…</h2>
      </div>
    );
  }

  return (
    <div className="app">
      <div
        className={`battle-content ${
          screenShake ? "screen-shake" : ""
        }`}
      >
        <button
  type="button"
  className="battle-settings-button"
  onPointerUp={(event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsSettingsOpen(true);
  }}
  aria-label="設定を開く"
>
  ⚙
</button>

        <h1>CHAOS CARDS</h1>

        {coinVisible && firstPlayer && (
          <div className="coin-toss-overlay">
            <div className="coin">🪙</div>
            <strong>
              {mode === "cpu"
                ? firstPlayer === "player"
                  ? "YOUが先攻！"
                  : "CPUが先攻！"
                : firstPlayer === playerRole
                  ? "あなたが先攻！"
                  : "相手が先攻！"}
            </strong>
          </div>
        )}

        

        <div className="battle-status-grid">
          <BattleStatus
            name={opponentName}
            icon={mode === "online" ? "🌐" : "🤖"}
            hp={enemyHP}
            maxHp={MAX_HP}
            shield={enemyShield}
            active={!isMyTurn}
            effect={enemyEffect}
            enemy
          />

          <BattleStatus
            name="YOU"
            icon="😀"
            hp={playerHP}
            maxHp={MAX_HP}
            shield={playerShield}
            energy={energy}
            maxEnergy={MAX_ENERGY}
            active={isMyTurn}
            effect={playerEffect}
          />
        </div>

        <BattleField
          isMyTurn={isMyTurn}
          cardAnimation={cardAnimation}
        />

        <div className="battle-controls">
  <div className="turn-summary">
    <div className="turn-summary-number">
      TURN {turnNumber}
    </div>

    <div
      className={`turn-summary-state ${
        isMyTurn ? "is-player" : "is-enemy"
      }`}
    >
      <span className="turn-summary-dot" />

      {isProcessing
        ? "PROCESSING..."
        : isMyTurn
          ? "YOUR TURN"
          : mode === "cpu"
            ? "CPU THINKING..."
            : "OPPONENT TURN"}
    </div>
  </div>

  <div className="resource-row">
    <div className="deck-counter">
      <span className="resource-icon">🃏</span>

      <span className="resource-label">
        DECK
      </span>

      <strong>{deck.length}</strong>
    </div>

    <div className="energy-panel">
      <div className="energy-panel-header">
        <span>ENERGY</span>
        <strong>
          {energy}/{MAX_ENERGY}
        </strong>
      </div>

      <div className="energy-orbs">
        {Array.from(
          { length: MAX_ENERGY },
          (_, index) => (
            <span
              key={index}
              className={`energy-orb ${
                index < energy ? "filled" : ""
              }`}
            />
          )
        )}
      </div>
    </div>

    <div className="deck-counter">
      <span className="resource-icon">🗑️</span>

      <span className="resource-label">
        DISCARD
      </span>

      <strong>{discardPile.length}</strong>
    </div>
  </div>

  <button
    type="button"
    className={`end-turn-button ${
      isMyTurn && !isProcessing
        ? "end-turn-ready"
        : ""
    }`}
    onClick={endTurn}
    disabled={!isMyTurn || isProcessing}
  >
    <span className="end-turn-button-text">
      {isProcessing
        ? "処理中..."
        : isMyTurn
          ? "ターン終了"
          : "相手のターン"}
    </span>

    <span className="end-turn-button-icon">
      {isMyTurn && !isProcessing
        ? "➜"
        : "⌛"}
    </span>
  </button>
</div>

<div className="hand-section">
  <div className="hand-section-header">
    <div>
      <span className="hand-section-kicker">
        YOUR CARDS
      </span>

      <h3>手札</h3>
    </div>

    <span className="hand-count">
      {hand.length}/{MAX_HAND_SIZE}
    </span>
  </div>

  <div
    className={`hand ${
      isMobile
        ? "hand-mobile"
        : "hand-desktop"
    }`}
    aria-label="手札"
  >
    {hand.map((card, index) => {
      const isSelected =
        selectedCards.some(
          (item) =>
            item.handIndex === index
        );

      const disabled =
        !isMyTurn ||
        isProcessing ||
        (!isSelected &&
          energy < Number(card.cost));

      const center =
        (hand.length - 1) / 2;

      const angleStep = isMobile ? 5 : 6;
const offsetStep = isMobile ? 5 : 10;

const angle =
  (index - center) * angleStep;

const offsetY =
  Math.abs(index - center) * offsetStep;

      return (
        <div
          key={`${card.id}-${index}`}
          className={`hand-card-wrapper ${
            isSelected
              ? "card-selected"
              : ""
          }`}
          style={{
            "--card-angle": `${angle}deg`,
            "--card-offset-y": `${offsetY}px`,
          }}
        >
          <Card
            card={card}
            index={index}
            isDrawn={
              drawnIndex === index
            }
            disabled={disabled}
            onPlay={() =>
              playCard(index)
            }
            isPlayed={playedCards.includes(
              index
            )}
          />

          {isSelected && (
            <div className="selected-overlay">
              <span>✓</span>
            </div>
          )}
        </div>
      );
    })}
  </div>
</div>

        <BattleLog logs={logs} />
      </div>

            {isSettingsOpen && (
        <div
          className="battle-settings-overlay"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsOpen(false);
            }
          }}
        >
          <div className="battle-settings-modal">
            <Settings
              isModal
              onClose={() => setIsSettingsOpen(false)}
              onSurrender={surrender}
            />
          </div>
        </div>
      )}

      {turnPopup && (
        <div className="turn-popup-layer">
          <div
            className={`turn-popup-content ${turnPopup}`}
          >
            <span className="turn-icon">
              {turnPopup === "player" ? "⚡" : "⌛"}
            </span>

            <span>
              {turnPopup === "player"
                ? "YOUR TURN"
                : "ENEMY TURN"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}