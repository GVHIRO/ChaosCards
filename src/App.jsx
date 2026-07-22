import { useState } from "react";

import Menu from "./pages/Menu";
import Battle from "./pages/Battle";
import OnlineMenu from "./pages/OnlineMenu";

function App() {
  const [screen, setScreen] = useState("menu");
  const [onlineRoom, setOnlineRoom] = useState(null);

function startOnlineBattle(roomId, role, matchId) {
  setOnlineRoom({
    roomId,
    role,
    matchId,
  });

  setScreen("online-battle");
}

  if (screen === "battle") {
    return (
      <Battle
        mode="cpu"
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "online-battle") {
    return (
      <Battle
  mode="online"
  roomId={onlineRoom?.roomId}
  matchId={onlineRoom?.matchId}
  playerRole={onlineRoom?.role}
  onBack={() => setScreen("menu")}
/>
    );
  }

  if (screen === "online") {
    return (
      <OnlineMenu
        onBack={() => setScreen("menu")}
        onMatchStart={startOnlineBattle}
      />
    );
  }

  return (
    <Menu
      onStart={() => setScreen("battle")}
      onOnline={() => setScreen("online")}
    />
  );
}

export default App;