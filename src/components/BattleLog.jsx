export default function BattleLog({ logs }) {
  return (
    <div className="battle-log">
      <h3>📜 バトルログ</h3>

      {logs.length === 0 ? (
        <p>ゲーム開始！</p>
      ) : (
        logs.map((log, index) => (
          <div key={index}>{log}</div>
        ))
      )}
    </div>
  );
}