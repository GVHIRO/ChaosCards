function Menu({
  onStart,
  onOnline,
  onDeckBuilder,
  openAuthMenu,
  currentUser,
  handleLogout,
}) {
  return (
    <div className="menu">
      <h1>Chaos Cards</h1>

      <button onClick={onStart}>
        CPU対戦
      </button>

      <button onClick={onOnline}>
        オンライン対戦
      </button>

      <button onClick={onDeckBuilder}>
        デッキ編集
      </button>

      <div style={{ marginTop: "20px" }}>
        {currentUser?.is_anonymous ? (
          <button onClick={openAuthMenu}>
            ログイン・アカウント登録
          </button>
        ) : (
          <>
            <p>ログイン中：{currentUser?.email}</p>

            <button onClick={handleLogout}>
              ログアウト
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default Menu;