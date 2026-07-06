# サイネージシステム Web版(Vercel + Render)

GitHubリポジトリ: https://github.com/haru3980/signage-web

このプロジェクトは **ターミナル操作なし・ブラウザだけ** でデプロイできるように
URLを初期値としてコード内に埋め込んであります(Chromebook等、ターミナル操作が
難しい環境向け)。

```
/frontend  … Vercel にデプロイ (Vite + React)
  /player   … サイネージ再生ページ (フルスクリーン, 操作UIなし)
  /control  … 遠隔操作ダッシュボード
/backend   … Render にデプロイ (Node.js + Express + WebSocket)
```

## 重要:この構成でお願いしたい「サービス名」

以下のURLを前提にコードを書いてあります。**RenderとVercelでデプロイする際、
必ず以下の名前でサービス/プロジェクトを作成してください。** そうすれば、
環境変数の入力は一切不要です。

| サービス | 名前 | 発行されるURL(想定) |
|---|---|---|
| Render Web Service | `signage-web-backend` | `https://signage-web-backend.onrender.com` |
| Vercel Project | `signage-web` | `https://signage-web.vercel.app` |

※ この名前がすでに他の人に使われていた場合のみ、少し違うURLになります。
その場合の対処法は本READMEの末尾「⑦ 名前が使えなかった場合」を参照してください。

---

## ① GitHubへのアップロード(ブラウザだけでOK)

すでに https://github.com/haru3980/signage-web にリポジトリを作成済みとのことなので、
ターミナルの `git` コマンドを使わずに、ブラウザだけでファイルをアップロードします。

1. https://github.com/haru3980/signage-web を開く
2. 「Add file」ボタン(画面右上あたり)→「Upload files」をクリック
3. お使いの端末のファイルアプリで、解凍した `signage-web` フォルダを開く
4. **`backend`フォルダそのもの**と**`frontend`フォルダそのもの**、`README.md`を
   まとめてブラウザの画面にドラッグ&ドロップする
   (フォルダごとドラッグすれば、中の階層構造もそのままアップロードされます)
5. 画面下の「Commit changes」ボタンをクリック

これでGitHub上に `backend/`・`frontend/` フォルダが並んだ状態になります。
(ターミナルの`git init`や`git push`は一切不要です)

---

## ② Renderにバックエンドをデプロイする

1. https://dashboard.render.com を開く
2. 「New +」→「Web Service」
3. 「haru3980/signage-web」リポジトリを選択して接続
4. 以下の項目を入力

| 項目 | 入力する値 |
|---|---|
| Name | **`signage-web-backend`**(この名前を必ず使ってください) |
| Root Directory | **`backend`** |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `node server.js` |
| Instance Type | Free |

5. 環境変数は**何も入力しなくて構いません**(コード内にデフォルトのURLが
   埋め込んであるためです)
6. 「Create Web Service」をクリックしてデプロイ開始

デプロイが終わったら、画面上部のURLが `https://signage-web-backend.onrender.com`
になっているか確認してください。念のため、そのURLの末尾に`/api/health`を付けて
ブラウザで開き、`{"status":"ok",...}` と表示されればバックエンドは正常です。

---

## ③ Vercelにフロントエンドをデプロイする

1. https://vercel.com を開く
2. 「Add New...」→「Project」
3. 「haru3980/signage-web」リポジトリを選択して「Import」
4. 「Root Directory」の欄を編集し、**`frontend`** を選択
5. プロジェクト名(Project Name)を**`signage-web`**にする(この名前を必ず使ってください)
6. 環境変数は**何も入力しなくて構いません**
7. 「Deploy」をクリック

数十秒でデプロイが完了し、`https://signage-web.vercel.app` というURLが
発行されます。これがあなたのサイネージシステムの公開URLです。

---

## ④ 最終動作確認

1. スマホやPCのブラウザで `https://signage-web.vercel.app/control` を開く
2. 「再生プレイリスト設定」にYouTubeのURLを入力して「追加」→「設定を保存」
3. 別の端末(TV等)のブラウザで `https://signage-web.vercel.app/player` を開く
   (ダッシュボード上のQRコードを読み取って開くのが簡単です)
4. 動画が自動再生されればすべて成功です

---

## ⑤ 補足:これは何をしているのか

- 通常、RenderとVercelのURLはデプロイして初めて分かるため、
  「相手のURLを環境変数に入力し合う」作業が発生します。
- 今回はChromebookでの入力の手間を減らすため、あらかじめサービス名を
  固定し、コード側に想定URLをデフォルト値として埋め込みました
  (`frontend/src/hooks/useWebSocket.js`、`frontend/src/pages/Control.jsx`、
  `backend/server.js` の該当箇所にコメント付きで記載しています)。
- そのため、上記の名前さえ合わせれば環境変数の入力は不要です。

---

## ⑥ Render無料プランの制約について

- **ファイルシステムは非永続(エフェメラル)です。** 現在の実装(`backend/storage.js`)は
  Node標準の`fs`によるJSONファイル保存のため、再デプロイ・再起動・スリープ復帰のたびに
  設定データが初期化される可能性があります。検証用途としては割り切って利用してください。
- **無料プランは約15分間アクセスが無いとスリープします。** 次回アクセス時に
  コールドスタート(数十秒の遅延)が発生します。気になる場合は、
  [UptimeRobot](https://uptimerobot.com/) 等の外部無料監視サービスから
  `GET https://signage-web-backend.onrender.com/api/health` に定期pingを送る運用を
  検討してください(ブラウザで設定できる無料サービスです。ターミナル不要)。

---

## ⑦ 名前が使えなかった場合(`signage-web`や`signage-web-backend`が既に使われていた時)

もし他のユーザーがすでにその名前を使っていた場合、Render/Vercelは
自動的に少し違うURL(例: `signage-web-backend-abcd.onrender.com`)を発行します。
その場合は、以下の2箇所だけ環境変数の入力が必要になります(その他はブラウザ操作のみです)。

- **Vercelのプロジェクト設定 → Environment Variables** に追加:
  - `VITE_BACKEND_URL` = 実際に発行されたRenderのURL
  - `VITE_WS_URL` = 同じURLだが `https→wss` に変え、末尾に `/ws` を付けたもの
- **Renderのサービス設定 → Environment** に追加:
  - `FRONTEND_ORIGIN` = 実際に発行されたVercelのURL

入力後、それぞれ「Save」を押すと自動で再デプロイされます。
