Chaos Cards 交互ターン制版

変更内容
- 試合開始時にコイントスで先攻・後攻を決定
- host / guest が交互に行動
- 自分のターン以外はカード操作不可
- 数値シールド制（攻撃ダメージを先に吸収）
- ターン開始時に、そのプレイヤーの残存シールドを消去
- ターン交代時に次プレイヤーのエネルギーを3回復（最大5）
- CPU戦も交互ターン制に変更
- コイントス、アクティブターン、ダメージ・回復表示のCSS演出を追加

このコードが使用するmatches列
- first_player text
- current_player text
- host_shield integer default 0
- guest_shield integer default 0
- winner text nullable
- battle_logs jsonb
- phase text

主な変更ファイル
- src/pages/Battle.jsx
- src/pages/OnlineMenu.jsx
- src/pages/Friends.jsx
- src/data/cards.js
- src/App.css

注意
- JavaではなくReactのJavaScript（JSX）コードです。
- node_modulesは同梱していません。展開後に npm install を実行してください。
