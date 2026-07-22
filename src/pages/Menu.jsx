function Menu({ onStart, onOnline }) {
  return (
    <div className="menu">
      <h1>Chaos Cards</h1>

      <button onClick={onStart}>
        CPU対戦
      </button>

      <button onClick={onOnline}>
        オンライン対戦
      </button>
    </div>
  );
}

export default Menu;