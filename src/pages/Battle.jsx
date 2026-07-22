import { supabase } from "../lib/supabase";
import BattleLog from "../components/BattleLog";
import Card from "../components/Card";
import { useState, useEffect, useRef } from "react";
import "../App.css";
import cards from "../data/cards";

function randomCard() {
  return cards[Math.floor(Math.random() * cards.length)];
}

export default function Battle({
  mode = "cpu",
  roomId,
  matchId,
  playerRole,
  restartGame,
  goToMenu,
}) {

  const [playerHP, setPlayerHP] = useState(30);
  const [enemyHP, setEnemyHP] = useState(30);
  const [drawnIndex, setDrawnIndex] = useState(null);
  const [isCpuTurn, setIsCpuTurn] = useState(false);
  const [playerEffect, setPlayerEffect] = useState(null);
const [enemyEffect, setEnemyEffect] = useState(null);
const [playerShield, setPlayerShield] = useState(false);
const [enemyShield, setEnemyShield] = useState(false);
const MAX_ENERGY = 3;

const [energy, setEnergy] = useState(MAX_ENERGY);
const [selectedCards, setSelectedCards] = useState([]);
const [turnNumber, setTurnNumber] = useState(1);
const [playerFinished, setPlayerFinished] = useState(false);
const [opponentFinished, setOpponentFinished] = useState(false);

  const [deck, setDeck] = useState(() => {
  const newDeck = [];

  cards.forEach((card) => {
    let copies = 1;

    switch (card.rarity) {
case "Common":
  copies = 3;
  break;

case "Rare":
  copies = 2;
  break;

case "Epic":
  copies = 1;
  break;

case "Legend":
  copies = 1;
  break;
    }

    for (let i = 0; i < copies; i++) {
      newDeck.push(card);
    }
  });

  return newDeck.sort(() => Math.random() - 0.5);
});

  const [hand, setHand] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);

  const [winner, setWinner] = useState(null);
  const [logs, setLogs] = useState([]);
const handRef = useRef(hand);
const deckRef = useRef(deck);
const discardPileRef = useRef(discardPile);
const selectedCardsRef = useRef(selectedCards);

useEffect(() => {
  handRef.current = hand;
}, [hand]);

useEffect(() => {
  deckRef.current = deck;
}, [deck]);

useEffect(() => {
  discardPileRef.current = discardPile;
}, [discardPile]);

useEffect(() => {
  selectedCardsRef.current = selectedCards;
}, [selectedCards]);
 useEffect(() => {
  if (mode !== "cpu") return;

  if (playerHP <= 0 && enemyHP <= 0) {
    setWinner("draw");
  } else if (playerHP <= 0) {
    setWinner("enemy");
  } else if (enemyHP <= 0) {
    setWinner("player");
  }
}, [playerHP, enemyHP, mode]);
  useEffect(() => {
  if (hand.length === 0 && deck.length > 0) {
    setHand(drawCards(5));
  }
}, []);

  function drawCards(count) {
  const newDeck = [...deck];
  const drawn = [];

  for (let i = 0; i < count; i++) {
    if (newDeck.length === 0) break;
    drawn.push(newDeck.shift());
  }

  setDeck(newDeck);
  return drawn;
}
const wait = (ms) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

function playCard(index) {
  if (isCpuTurn || winner) return;

  const card = hand[index];

  if (!card) return;

  // すでに選択中なら、もう一度押したときに取り消す
  const selectedIndex = selectedCards.findIndex(
    (selected) => selected.handIndex === index
  );

  if (selectedIndex !== -1) {
    cancelSelectedCard(selectedIndex);
    return;
  }

  // エネルギー不足
  if (energy < card.cost) {
    setLogs((prev) =>
      [`⚡ エネルギーが足りない！`, ...prev].slice(0, 8)
    );

    return;
  }

  // エネルギーを消費
  setEnergy((prev) => prev - card.cost);

  // 使用予定として登録
  setSelectedCards((prev) => [
    ...prev,
    {
      card,
      handIndex: index,
    },
  ]);

  setLogs((prev) =>
    [`✅ ${card.name}を選択した`, ...prev].slice(0, 8)
  );
}
function cancelSelectedCard(selectedIndex) {
  if (isCpuTurn || winner) return;

  const selected = selectedCards[selectedIndex];

  if (!selected) return;

  const { card } = selected;

  // エネルギーを返す
  setEnergy((prev) =>
    Math.min(MAX_ENERGY, prev + card.cost)
  );

  // 使用予定から削除
  setSelectedCards((prev) =>
    prev.filter((_, index) => index !== selectedIndex)
  );

  setLogs((prev) =>
    [`↩️ ${card.name}の選択を取り消した`, ...prev].slice(0, 8)
  );
}
function chooseCpuCards() {
  let remainingEnergy = MAX_ENERGY;
  const chosenCards = [];

  while (remainingEnergy > 0) {
    const affordableCards = cards.filter(
      (card) => card.cost <= remainingEnergy
    );

    if (affordableCards.length === 0) {
      break;
    }

    const chosenCard =
      affordableCards[
        Math.floor(Math.random() * affordableCards.length)
      ];

    chosenCards.push(chosenCard);
    remainingEnergy -= chosenCard.cost;
  }

  return chosenCards;
}
function resolveTurn(playerCards, opponentCards) {
  let newPlayerHP = playerHP;
  let newEnemyHP = enemyHP;

  const turnLogs = [];

  // =========================
  // カード効果を集計
  // =========================

  const playerAttack = playerCards.reduce((total, selected) => {
    const card = selected.card ?? selected;
    const hits = card.hits || 1;

    return total + (card.damage || 0) * hits;
  }, 0);

  const opponentAttack = opponentCards.reduce((total, selected) => {
    const card = selected.card ?? selected;
    const hits = card.hits || 1;

    return total + (card.damage || 0) * hits;
  }, 0);

  const playerHeal = playerCards.reduce((total, selected) => {
    const card = selected.card ?? selected;

    return total + (card.heal || 0);
  }, 0);

  const opponentHeal = opponentCards.reduce((total, selected) => {
    const card = selected.card ?? selected;

    return total + (card.heal || 0);
  }, 0);

  const playerDefending = playerCards.some((selected) => {
    const card = selected.card ?? selected;

    return card.shield;
  });

  const opponentDefending = opponentCards.some((selected) => {
    const card = selected.card ?? selected;

    return card.shield;
  });

  // =========================
  // 防御
  // =========================

  let damageToOpponent = playerAttack;
  let damageToPlayer = opponentAttack;

  if (opponentDefending && damageToOpponent > 0) {
    damageToOpponent = Math.ceil(damageToOpponent / 2);

    turnLogs.push(
      "🛡️ 相手が攻撃ダメージを半減した！"
    );
  }

  if (playerDefending && damageToPlayer > 0) {
    damageToPlayer = Math.ceil(damageToPlayer / 2);

    turnLogs.push(
      "🛡️ YOUが攻撃ダメージを半減した！"
    );
  }

  // =========================
  // 攻撃
  // =========================

  if (damageToOpponent > 0) {
    newEnemyHP = Math.max(
      0,
      newEnemyHP - damageToOpponent
    );

    showEnemyEffect(
      `-${damageToOpponent}`,
      "damage"
    );

    turnLogs.push(
      `⚔️ YOUの攻撃！ ${damageToOpponent}ダメージ！`
    );
  }

  if (damageToPlayer > 0) {
    newPlayerHP = Math.max(
      0,
      newPlayerHP - damageToPlayer
    );

    showPlayerEffect(
      `-${damageToPlayer}`,
      "damage"
    );

    turnLogs.push(
      `⚔️ 相手の攻撃！ ${damageToPlayer}ダメージ！`
    );
  }

  // =========================
  // 回復
  // =========================

  if (playerHeal > 0 && newPlayerHP > 0) {
    const oldHP = newPlayerHP;

    newPlayerHP = Math.min(
      30,
      newPlayerHP + playerHeal
    );

    const actualHeal = newPlayerHP - oldHP;

    if (actualHeal > 0) {
      showPlayerEffect(
        `+${actualHeal}`,
        "heal"
      );

      turnLogs.push(
        `💚 YOUは${actualHeal}回復した！`
      );
    }
  }

  if (opponentHeal > 0 && newEnemyHP > 0) {
    const oldHP = newEnemyHP;

    newEnemyHP = Math.min(
      30,
      newEnemyHP + opponentHeal
    );

    const actualHeal = newEnemyHP - oldHP;

    if (actualHeal > 0) {
      showEnemyEffect(
        `+${actualHeal}`,
        "heal"
      );

      turnLogs.push(
        `💚 相手は${actualHeal}回復した！`
      );
    }
  }

  // =========================
  // 勝敗
  // =========================

  let newWinner = null;

  if (
  newPlayerHP <= 0 &&
  newEnemyHP <= 0
) {
  newWinner = "draw";
} else if (newPlayerHP <= 0) {
  newWinner = "enemy";
} else if (newEnemyHP <= 0) {
  newWinner = "player";
}

  return {
    newPlayerHP,
    newEnemyHP,
    turnLogs,
    newWinner,
  };
}
function replaceUsedCards() {
  const currentHand = [...handRef.current];
  const usedCards = selectedCardsRef.current;

  let newDeck = [...deckRef.current];

  let newDiscardPile = [
    ...discardPileRef.current,
    ...usedCards.map((selected) => selected.card),
  ];

  usedCards.forEach((selected) => {
    if (
      newDeck.length === 0 &&
      newDiscardPile.length > 0
    ) {
      newDeck = [...newDiscardPile].sort(
        () => Math.random() - 0.5
      );

      newDiscardPile = [];
    }

    if (newDeck.length > 0) {
      currentHand[selected.handIndex] = newDeck.shift();
    }
  });

  setDeck(newDeck);
  setDiscardPile(newDiscardPile);
  setHand(currentHand);
}
function getOnlineLogsForPlayer(battleLogs, role) {
  if (!Array.isArray(battleLogs)) {
    return [];
  }

  if (role === "host") {
    return battleLogs;
  }

  return battleLogs.map((log) =>
    log
      .replaceAll("YOU", "__HOST_PLAYER__")
      .replaceAll("相手", "YOU")
      .replaceAll("__HOST_PLAYER__", "相手")
  );
}
async function cpuTurn() {
  if (isCpuTurn || winner) return;

  setIsCpuTurn(true);

  await wait(1000);

  const cpuCards = chooseCpuCards();

  const {
    newPlayerHP,
    newEnemyHP,
    turnLogs,
    newWinner,
  } = resolveTurn(
    selectedCards,
    cpuCards
  );

  const cpuCardNames = cpuCards
    .map((card) => card.name)
    .join("、");

  const cpuLog =
    cpuCards.length > 0
      ? `🤖 CPUの使用カード：${cpuCardNames}`
      : "🤖 CPUはカードを使用しなかった";

  setPlayerHP(newPlayerHP);
  setEnemyHP(newEnemyHP);

  setLogs((prev) =>
    [cpuLog, ...turnLogs, ...prev].slice(0, 10)
  );

  await wait(1000);

  replaceUsedCards();

  setSelectedCards([]);
  setEnergy(MAX_ENERGY);

  if (newWinner) {
    setWinner(newWinner);
  }

  setIsCpuTurn(false);
}
async function onlineTurn() {
  if (!supabase) {
    setLogs((prev) =>
      ["❌ Supabaseに接続できていません", ...prev].slice(0, 10)
    );
    return;
  }

  if (!matchId) {
    setLogs((prev) =>
      ["❌ matchIdがありません", ...prev].slice(0, 10)
    );
    return;
  }

  if (playerRole !== "host" && playerRole !== "guest") {
    setLogs((prev) =>
      ["❌ プレイヤー情報が正しくありません", ...prev].slice(0, 10)
    );
    return;
  }

  setIsCpuTurn(true);

  const cardIds = selectedCards.map(
    (selected) => selected.card.id
  );

  const { error } = await supabase
    .from("turns")
    .upsert(
      {
        match_id: matchId,
        turn_number: turnNumber,
        player_role: playerRole,
        selected_cards: cardIds,
        finished: true,
      },
      {
        onConflict: "match_id,turn_number,player_role",
      }
    );

  if (error) {
    console.error("ターン保存エラー:", error);

    setLogs((prev) =>
      [
        `❌ ターン保存エラー：${error.message}`,
        ...prev,
      ].slice(0, 10)
    );

    setIsCpuTurn(false);
    return;
  }
setPlayerFinished(true);
  setLogs((prev) =>
    [
      `✅ ターン${turnNumber}の入力完了`,
      "⏳ 相手を待っています…",
      ...prev,
    ].slice(0, 10)
  );
}
async function endTurn() {
  if (mode === "cpu") {
    cpuTurn();
    return;
  }

  await onlineTurn();
}
async function handleOnlineMatchUpdate(match) {
  console.log("Realtimeでmatches更新を受信:", match);

  // ホストとゲストでHP表示を反転
  if (playerRole === "host") {
    setPlayerHP(match.host_hp);
    setEnemyHP(match.guest_hp);
  } else {
    setPlayerHP(match.guest_hp);
    setEnemyHP(match.host_hp);
  }

  // 勝敗が決まった
  if (match.phase === "finished" && match.winner) {
    setIsCpuTurn(true);

    if (match.winner === "draw") {
      setWinner("draw");
    } else if (match.winner === playerRole) {
      setWinner("player");
    } else {
      setWinner("enemy");
    }

    return;
  }

  // 次のターンへ進んだ
if (match.turn_number > turnNumber) {
  setPlayerFinished(false);
  setOpponentFinished(false);

  // 既存処理

    const sharedBattleLogs = getOnlineLogsForPlayer(
      match.battle_logs,
      playerRole
    );

    replaceUsedCards();

    setSelectedCards([]);
    setEnergy(MAX_ENERGY);
    setTurnNumber(match.turn_number);
    setIsCpuTurn(false);

    setLogs((prev) =>
      [
        `🔄 ターン${match.turn_number}開始！`,
        ...sharedBattleLogs,
        ...prev,
      ].slice(0, 10)
    );
  }
}
useEffect(() => {
  if (
    mode !== "online" ||
    !matchId ||
    !playerRole
  ) {
    return;
  }

  const channel = supabase
    .channel(`match-${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "matches",
        filter: `id=eq.${matchId}`,
      },
      (payload) => {
        handleOnlineMatchUpdate(payload.new);
      }
    )
    .subscribe((status, error) => {
      console.log("Realtime接続状態:", status);

      if (error) {
        console.error("Realtime接続エラー:", error);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [
  mode,
  matchId,
  playerRole,
  turnNumber,
]);
useEffect(() => {
  if (
    mode !== "online" ||
    !supabase ||
    !matchId ||
    !playerRole
  ) {
    return;
  }

  let isChecking = false;

  const intervalId = setInterval(async () => {
    if (isChecking) return;

    isChecking = true;

    try {
      // 現在の試合情報を取得
      const { data: match, error: matchError } =
        await supabase
          .from("matches")
          .select("*")
          .eq("id", matchId)
          .single();

      if (matchError) {
        console.error("試合取得エラー:", matchError);
        return;
      }

      /*
       * ホストとゲストでHPの見え方を反転する
       */
      if (playerRole === "host") {
        setPlayerHP(match.host_hp);
        setEnemyHP(match.guest_hp);
      } else {
        setPlayerHP(match.guest_hp);
        setEnemyHP(match.host_hp);
      }
if (match.phase === "finished" && match.winner) {
  setIsCpuTurn(true);

  if (match.winner === "draw") {
    setWinner("draw");
  } else if (match.winner === playerRole) {
    setWinner("player");
  } else {
    setWinner("enemy");
  }

  return;
}
      /*
       * ターンが進んでいたら、
       * 使用カードを交換して次のターンへ
       */
     if (match.turn_number > turnNumber) {
  setPlayerFinished(false);
  setOpponentFinished(false);

  // 既存処理

        setOpponentFinished(false);
  const sharedBattleLogs = getOnlineLogsForPlayer(
    match.battle_logs,
    playerRole
  );

  replaceUsedCards();

  setSelectedCards([]);
  setEnergy(MAX_ENERGY);
  setTurnNumber(match.turn_number);
  setIsCpuTurn(false);

  setLogs((prev) =>
    [
      `🔄 ターン${match.turn_number}開始！`,
      ...sharedBattleLogs,
      ...prev,
    ].slice(0, 10)
  );

  return;
}

      /*
       * ターン解決を行うのはホストだけ
       */
      if (
        playerRole !== "host" ||
        match.phase !== "selecting"
      ) {
        return;
      }

      const { data: submittedTurns, error: turnsError } =
      
        await supabase
          .from("turns")
          .select("*")
          .eq("match_id", matchId)
          .eq("turn_number", match.turn_number)
          .eq("finished", true);
          const opponentRole =
  playerRole === "host" ? "guest" : "host";
  

const opponentTurn = submittedTurns.find(
  (turn) => turn.player_role === opponentRole
);

setOpponentFinished(Boolean(opponentTurn));

      if (turnsError) {
        console.error("ターン取得エラー:", turnsError);
        return;
      }

      const hostTurn = submittedTurns.find(
        (turn) => turn.player_role === "host"
      );

      const guestTurn = submittedTurns.find(
        (turn) => turn.player_role === "guest"
      );

      // まだ2人とも終了していない
      if (!hostTurn || !guestTurn) {
        return;
      }

      /*
       * 他の処理と重ならないように、
       * phaseをresolvingへ変更
       */
      const { data: lockedMatch, error: lockError } =
        await supabase
          .from("matches")
          .update({
            phase: "resolving",
          })
          .eq("id", matchId)
          .eq("phase", "selecting")
          .select()
          .maybeSingle();

      if (lockError) {
        console.error("試合ロックエラー:", lockError);
        return;
      }

      // 別処理が先に解決を始めていた
      if (!lockedMatch) {
        return;
      }

      /*
       * 保存されたカードIDをカードデータへ戻す
       */
      const hostCards = hostTurn.selected_cards
        .map((cardId) =>
          cards.find((card) => card.id === cardId)
        )
        .filter(Boolean);

      const guestCards = guestTurn.selected_cards
        .map((cardId) =>
          cards.find((card) => card.id === cardId)
        )
        .filter(Boolean);

      /*
       * ホストをplayer、
       * ゲストをopponentとして計算
       */
      const {
        newPlayerHP,
        newEnemyHP,
        turnLogs,
      } = resolveTurn(
        hostCards,
        guestCards
      );
let winner = null;

if (newPlayerHP <= 0 && newEnemyHP <= 0) {
  winner = "draw";
} else if (newEnemyHP <= 0) {
  winner = "host";
} else if (newPlayerHP <= 0) {
  winner = "guest";
}
      const nextTurnNumber =
        match.turn_number + 1;

      const { error: updateError } = await supabase
        .from("matches")
        .update({
  host_hp: Math.max(0, newPlayerHP),
  guest_hp: Math.max(0, newEnemyHP),
  battle_logs: turnLogs,
  winner,
  turn_number: winner
    ? match.turn_number
    : nextTurnNumber,
  phase: winner
    ? "finished"
    : "selecting",
})
        .eq("id", matchId)
        .eq("phase", "resolving");

      if (updateError) {
        console.error("試合更新エラー:", updateError);

        setLogs((prev) =>
          [
            `❌ HP更新エラー：${updateError.message}`,
            ...prev,
          ].slice(0, 10)
        );

        return;
      }

      
    } catch (error) {
      console.error("オンライン同期エラー:", error);
    } finally {
      isChecking = false;
    }
  }, 1000);

  return () => {
    clearInterval(intervalId);
  };
}, [
  mode,
  matchId,
  playerRole,
  turnNumber,
]);
useEffect(() => {
  if (
    mode !== "online" ||
    !matchId ||
    !playerRole
  ) {
    return;
  }

  const opponentRole =
    playerRole === "host" ? "guest" : "host";

  async function checkOpponentTurn() {
    const { data, error } = await supabase
      .from("turns")
      .select("player_role, finished")
      .eq("match_id", matchId)
      .eq("turn_number", turnNumber)
      .eq("player_role", opponentRole)
      .eq("finished", true)
      .maybeSingle();

    if (error) {
      console.error("相手の提出状態取得エラー:", error);
      return;
    }

    setOpponentFinished(Boolean(data));
  }

  checkOpponentTurn();

  const channel = supabase
    .channel(`turns-${matchId}-${playerRole}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "turns",
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        const changedTurn = payload.new;

        if (!changedTurn) return;

        if (
          Number(changedTurn.turn_number) !==
          Number(turnNumber)
        ) {
          return;
        }

        if (
          changedTurn.player_role === opponentRole &&
          changedTurn.finished === true
        ) {
          setOpponentFinished(true);
        }
      }
    )
    .subscribe((status, error) => {
      console.log("turns Realtime接続状態:", status);

      if (error) {
        console.error("turns Realtime接続エラー:", error);
      }
    });

  return () => {
    supabase.removeChannel(channel);
  };
}, [
  mode,
  matchId,
  playerRole,
  turnNumber,
]);
function showPlayerEffect(text, type) {
  setPlayerEffect(null);

  requestAnimationFrame(() => {
    setPlayerEffect({
      text,
      type,
      id: Date.now(),
    });
  });

  setTimeout(() => {
    setPlayerEffect(null);
  }, 900);
}

function showEnemyEffect(text, type) {
  setEnemyEffect(null);

  requestAnimationFrame(() => {
    setEnemyEffect({
      text,
      type,
      id: Date.now(),
    });
  });

  setTimeout(() => {
    setEnemyEffect(null);
  }, 900);
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
          {isDraw
            ? "引き分け！"
            : playerWon
              ? mode === "online"
                ? "対戦相手に勝利した！"
                : "CPUを倒した！"
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

  return (
    <div className="app">
      <h1>CHAOS CARDS</h1>

      <div className="battle">
        <div className="player character-area">
  <h2>
  {mode === "online" ? "🌐 OPPONENT" : "🤖 CPU"}
</h2>
  {enemyShield && (
  <div className="shield-status">
    🛡️ シールド中
  </div>
)}

  {enemyEffect && (
    <div
      key={enemyEffect.id}
      className={`battle-effect ${enemyEffect.type}`}
    >
      {enemyEffect.text}
    </div>
  )}

  <div className="hp-bar">
    <div
      className="hp-fill"
      style={{ width: `${(enemyHP / 30) * 100}%` }}
    ></div>
  </div>

  <p>{enemyHP} / 30</p>
</div>

        <div className="player character-area">
  <h2>😀 YOU</h2>
  {playerShield && (
  <div className="shield-status">
    🛡️ シールド中
  </div>
)}

  {playerEffect && (
    <div
      key={playerEffect.id}
      className={`battle-effect ${playerEffect.type}`}
    >
      {playerEffect.text}
    </div>
  )}

  <div className="hp-bar">
    <div
      className="hp-fill"
      style={{ width: `${(playerHP / 30) * 100}%` }}
    ></div>
  </div>

  <p>{playerHP} / 30</p>
</div>
      </div>
<div
  className={`turn-display ${
    isCpuTurn ? "cpu-turn" : "player-turn"
  }`}
>{mode === "online" && (
  <div className="submission-status">
    <p>
  自分：
  {playerFinished ? "提出済み ✅" : "選択中…"}
</p>

    <p>
      相手：
      {opponentFinished
        ? "提出済み ✅"
        : "選択中… ⏳"}
    </p>
  </div>
)}
 {mode === "online"
  ? isCpuTurn
    ? "⏳ 相手を待っています…"
    : `⚡ ターン${turnNumber}：カードを選択`
  : isCpuTurn
    ? "🤖 CPUが考えています…"
    : "⚡ あなたのターン"}
</div>
<div className="energy-bar">
    ⚡ エネルギー {energy}/{MAX_ENERGY}
</div>
<h3>手札</h3>

<p className="deck-info">
  🃏 山札：{deck.length}枚　🗑️ 捨て札：{discardPile.length}枚
</p>

<div className="hand">
  {hand.map((card, index) => {
    const isSelected = selectedCards.some(
      (selected) => selected.handIndex === index
    );

    return (
      <div
        className={`hand-card-wrapper ${
          isSelected ? "card-selected" : ""
        }`}
        key={`${card.id}-${index}`}
      >
        <Card
          card={card}
          index={index}
          isDrawn={drawnIndex === index}
          disabled={
            isCpuTurn ||
            (!isSelected && energy < card.cost)
          }
          onPlay={() => playCard(index)}
        />

        {isSelected && (
          <div className="selected-overlay">
            <span>選択中</span>
            <small>もう一度押すと解除</small>
          </div>
        )}
      </div>
    );
  })}
</div>

<button
  className="end-turn-button"
  onClick={endTurn}
  disabled={isCpuTurn}
>
  ターン終了
</button>


<BattleLog logs={logs} />
    </div>
  );
}
