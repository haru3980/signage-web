require("dotenv").config();
const http = require("http");
const fs = require("fs/promises");
const path = require("path");
const express = require("express");
const cors = require("cors");
const { WebSocketServer, WebSocket } = require("ws");

// ============================================================
// デフォルトURL設定
// Renderで名前を "signage-web-backend" にした場合は環境変数不要。
// 別の名前にした場合は FRONTEND_ORIGIN 環境変数で上書きしてください。
// ============================================================
const FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || "https://signage-web.vercel.app";

// ============================================================
// 永続化(JSONファイル)
// Render無料プランのファイルシステムは再起動のたびに初期化されます。
// そのためスリープ復帰後はデータが消える場合があります(検証用途向け)。
// ============================================================
const DATA_FILE = path.join(__dirname, "db.json");
const DEFAULT_SETTINGS = { playlist_urls: [], schedules: [] };
let writeQueue = Promise.resolve();

async function readSettings() {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw).settings ?? DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function writeSettings(settings) {
  writeQueue = writeQueue.then(() =>
    fs.writeFile(DATA_FILE, JSON.stringify({ settings }, null, 2))
  );
  return writeQueue.then(() => settings);
}

// ============================================================
// バリデーション
// ============================================================
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function validate(body) {
  const errors = [];
  if (!Array.isArray(body.playlist_urls))
    errors.push("playlist_urls は配列である必要があります");
  if (!Array.isArray(body.schedules))
    errors.push("schedules は配列である必要があります");
  else {
    body.schedules.forEach((s, i) => {
      if (typeof s.id !== "string") errors.push(`schedules[${i}].id が不正`);
      if (typeof s.name !== "string") errors.push(`schedules[${i}].name が不正`);
      if (typeof s.enabled !== "boolean") errors.push(`schedules[${i}].enabled が不正`);
      if (!Array.isArray(s.target_days) || s.target_days.length !== 7)
        errors.push(`schedules[${i}].target_days は7要素の配列が必要`);
      if (!TIME_RE.test(s.sleep_time)) errors.push(`schedules[${i}].sleep_time はHH:MM形式`);
      if (!TIME_RE.test(s.wake_time)) errors.push(`schedules[${i}].wake_time はHH:MM形式`);
    });
  }
  return errors;
}

// ============================================================
// Express + WebSocket
// ============================================================
const app = express();
app.use(express.json());
app.use(cors({
  origin(origin, cb) {
    if (!origin || origin === FRONTEND_ORIGIN) return cb(null, true);
    cb(new Error("CORSエラー: 許可されていないオリジン"));
  }
}));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

function broadcast(msg) {
  const data = JSON.stringify(msg);
  wss.clients.forEach(c => {
    if (c.readyState === WebSocket.OPEN) c.send(data);
  });
}

// GET /api/health
app.get("/api/health", (_, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /api/settings
app.get("/api/settings", async (_, res) => {
  try {
    res.json(await readSettings());
  } catch {
    res.status(500).json({ error: "取得失敗" });
  }
});

// POST /api/settings
app.post("/api/settings", async (req, res) => {
  const errors = validate(req.body);
  if (errors.length) return res.status(400).json({ error: "入力エラー", details: errors });
  try {
    const saved = await writeSettings(req.body);
    broadcast({ type: "SETTINGS_UPDATED", payload: saved });
    res.json(saved);
  } catch {
    res.status(500).json({ error: "保存失敗" });
  }
});

// WebSocket: 接続直後にINITを送信
wss.on("connection", async (ws) => {
  try {
    ws.send(JSON.stringify({ type: "INIT", payload: await readSettings() }));
  } catch {}
  ws.on("error", console.error);
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`起動完了 PORT:${PORT}  許可オリジン:${FRONTEND_ORIGIN}`);
});
