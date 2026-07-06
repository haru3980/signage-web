// storage.js
// 永続化層の抽象化モジュール(§3 の注記に対応)。
//
// 現在の実装: Node.js標準の `fs` モジュールのみを用いたJSONファイル永続化
// (検証用途)。外部DBライブラリへの依存を避け、シンプルさを優先している。
// Render無料プランのファイルシステムは非永続(エフェメラル)なため、
// 再デプロイ・再起動・スリープ復帰のたびにデータが初期化される可能性がある。
// より安定した検証を行いたい場合は、この module.exports が返す
// getSettings / saveSettings の実装だけを Render無料PostgreSQL や
// Supabase / Neon 等に差し替えれば良い。
// (呼び出し側の server.js はこのインターフェースにのみ依存する)

const fs = require("fs/promises");
const path = require("path");
const { DEFAULT_SETTINGS } = require("./schema");

const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// 同時書き込みによる競合を避けるための簡易ロック(単一プロセス内で直列化する)
let writeQueue = Promise.resolve();

async function ensureDbFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    await fs.access(DB_FILE);
  } catch {
    await fs.writeFile(DB_FILE, JSON.stringify({ settings: DEFAULT_SETTINGS }, null, 2), "utf-8");
  }
}

/**
 * 現在の設定を取得する。データが存在しない場合はデフォルト値を返す。
 * @returns {Promise<object>}
 */
async function getSettings() {
  await ensureDbFile();
  try {
    const raw = await fs.readFile(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return parsed.settings ?? DEFAULT_SETTINGS;
  } catch (err) {
    console.error("[storage] 読み込みに失敗したためデフォルト値を返します:", err);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 設定を永続化する。
 * @param {object} settings 検証済みの設定オブジェクト
 * @returns {Promise<object>} 保存された設定
 */
function saveSettings(settings) {
  writeQueue = writeQueue.then(async () => {
    await ensureDbFile();
    await fs.writeFile(DB_FILE, JSON.stringify({ settings }, null, 2), "utf-8");
    return settings;
  });
  return writeQueue;
}

module.exports = { getSettings, saveSettings };
