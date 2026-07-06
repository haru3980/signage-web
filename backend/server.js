// server.js
// サイネージシステム Web版 バックエンド エントリポイント。
// Express (REST API) + ws (WebSocket) を同一HTTPサーバー上で待ち受ける構成。

require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const { WebSocketServer, WebSocket } = require("ws");

const { validateSettings } = require("./schema");
const { getSettings, saveSettings } = require("./storage");

const app = express();
app.use(express.json());

// --- CORS設定: FRONTEND_ORIGIN のみ許可するホワイトリスト ---
// Renderの環境変数 FRONTEND_ORIGIN を設定していればそちらが優先されます。
// 未設定の場合は、Vercelのプロジェクト名を "signage-web" にした場合に
// 発行されるURLを初期値として使います。別名でデプロイした場合は
// Renderの環境変数 FRONTEND_ORIGIN に実際のVercel URLを設定してください。
const DEFAULT_FRONTEND_ORIGIN = "https://signage-web.vercel.app";
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || DEFAULT_FRONTEND_ORIGIN;

const corsOptions = {
  origin(origin, callback) {
    // Postman等、Originヘッダーが無いリクエスト(サーバー間通信・ヘルスチェック等)は許可する
    if (!origin) return callback(null, true);

    if (!FRONTEND_ORIGIN) {
      // 環境変数未設定時(ローカル開発)は全許可にフォールバック
      return callback(null, true);
    }

    if (origin === FRONTEND_ORIGIN) {
      return callback(null, true);
    }

    return callback(new Error(`CORSポリシーにより許可されていないオリジンです: ${origin}`));
  },
};

app.use(cors(corsOptions));

// --- REST API ---

// GET /api/settings … 現在の設定JSONを返却
app.get("/api/settings", async (req, res) => {
  try {
    const settings = await getSettings();
    res.status(200).json(settings);
  } catch (err) {
    console.error("[GET /api/settings] エラー:", err);
    res.status(500).json({ error: "設定の取得に失敗しました" });
  }
});

// POST /api/settings … 設定JSONを受信・検証・永続化し、全再生クライアントへブロードキャスト
app.post("/api/settings", async (req, res) => {
  const { valid, errors } = validateSettings(req.body);

  if (!valid) {
    return res.status(400).json({ error: "設定データが不正です", details: errors });
  }

  try {
    const saved = await saveSettings(req.body);
    broadcast({ type: "SETTINGS_UPDATED", payload: saved });
    res.status(200).json(saved);
  } catch (err) {
    console.error("[POST /api/settings] エラー:", err);
    res.status(500).json({ error: "設定の保存に失敗しました" });
  }
});

// GET /api/health … Render無料プランのスリープ復帰・死活監視用
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// --- HTTPサーバー + WebSocketサーバー ---

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(message) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on("connection", async (ws) => {
  console.log("[WebSocket] クライアントが接続しました");

  try {
    const settings = await getSettings();
    ws.send(JSON.stringify({ type: "INIT", payload: settings }));
  } catch (err) {
    console.error("[WebSocket] INIT送信エラー:", err);
  }

  ws.on("close", () => {
    console.log("[WebSocket] クライアントが切断しました");
  });

  ws.on("error", (err) => {
    console.error("[WebSocket] エラー:", err);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`サイネージバックエンドサーバーが起動しました (PORT: ${PORT})`);
  console.log(`許可オリジン (FRONTEND_ORIGIN): ${FRONTEND_ORIGIN || "(未設定・全許可モード)"}`);
});
