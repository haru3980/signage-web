import React, { useEffect, useRef, useState, useCallback } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

// ============================================================
// バックエンドURL設定
// Renderのサービス名を "signage-web-backend" にすれば変更不要。
// 別の名前にした場合はここを書き換えてください。
// ============================================================
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://signage-web-backend-9rr7.onrender.com";
const WS_URL      = import.meta.env.VITE_WS_URL      || "wss://signage-web-backend-9rr7.onrender.com/ws";

// ============================================================
// グローバルCSS
// ============================================================
const css = `
*{box-sizing:border-box;margin:0;padding:0}
html,body,#root{height:100%}
body{background:#0b1220;color:#e8e6df;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Hiragino Sans",sans-serif;-webkit-font-smoothing:antialiased}
button,input{font-family:inherit}

/* ホーム */
.home{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px}
.home-card{max-width:440px;width:100%;border:1px solid #263349;border-radius:8px;background:#121b2e;padding:40px}
.home-eye{font-size:12px;letter-spacing:.12em;color:#2fd3c3;margin-bottom:12px;font-family:monospace}
.home-title{font-size:26px;margin-bottom:8px}
.home-sub{color:#7c8aa0;font-size:14px;margin-bottom:28px}
.home-links{display:flex;flex-direction:column;gap:12px}
.home-link{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border:1px solid #263349;border-radius:4px;text-decoration:none;color:#e8e6df;background:#182338;transition:border-color .15s}
.home-link:hover{border-color:#f5a623}
.home-link-label{font-size:15px;font-weight:600}
.home-link-path{font-family:monospace;font-size:12px;color:#7c8aa0}

/* プレイヤー */
.player{position:relative;width:100vw;height:100vh;background:#000;overflow:hidden}
.player iframe,.player #yt-player{width:100%;height:100%;border:none}
.sleep-overlay{position:fixed;inset:0;background:#000;z-index:9999;transition:opacity .6s ease}

/* トースト */
.toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.6);color:#fff;padding:12px 20px;border-radius:4px;font-size:14px;z-index:10000;border:1px solid rgba(245,166,35,.4);white-space:nowrap}

/* コントロール */
.ctrl{min-height:100vh;padding:32px 24px 120px;max-width:960px;margin:0 auto}
.ctrl-head{margin-bottom:28px}
.ctrl-eye{font-family:monospace;font-size:12px;letter-spacing:.14em;color:#f5a623;margin-bottom:6px;display:flex;align-items:center;gap:8px}
.ctrl-eye::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#f5a623;box-shadow:0 0 8px 2px rgba(245,166,35,.6);animation:pulse 2.2s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.ctrl-head h1{font-size:22px}
.ctrl-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
@media(max-width:700px){.ctrl-grid{grid-template-columns:1fr}}
.panel{border:1px solid #263349;border-radius:8px;background:#121b2e;padding:22px}
.panel--wide{grid-column:1/-1}
.panel h2{font-size:15px;margin-bottom:12px}
.hint{font-size:12px;color:#7c8aa0;margin-bottom:14px}
.qr-wrap{display:flex;justify-content:center;padding:16px;background:#182338;border-radius:4px;margin-bottom:10px}
.ctrl-url{display:block;font-family:monospace;font-size:11px;color:#7c8aa0;word-break:break-all;text-align:center}
.url-list{list-style:none;display:flex;flex-direction:column;gap:8px;margin-bottom:14px;max-height:200px;overflow-y:auto}
.url-empty{color:#7c8aa0;font-size:13px;padding:6px 0}
.url-item{display:flex;justify-content:space-between;align-items:center;gap:8px;background:#182338;border:1px solid #263349;border-radius:4px;padding:8px 10px}
.url-text{font-family:monospace;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.row{display:flex;gap:8px}
input[type=text],input[type=time]{background:#182338;border:1px solid #263349;color:#e8e6df;border-radius:4px;padding:9px 12px;font-size:13px;flex:1;min-width:0}
input:focus{outline:2px solid #2fd3c3;outline-offset:1px}
.btn{background:#182338;border:1px solid #263349;color:#e8e6df;border-radius:4px;padding:9px 16px;font-size:13px;cursor:pointer;white-space:nowrap;transition:border-color .15s}
.btn:hover{border-color:#f5a623}
.btn-ghost{background:transparent;border-color:transparent;color:#7c8aa0}
.btn-ghost:hover{color:#e0637a;border-color:#e0637a}
.btn-sec{border-color:#2fd3c3;color:#2fd3c3}
.btn-pri{background:#f5a623;border-color:#f5a623;color:#1a1200;font-weight:700;padding:12px 28px;font-size:14px}
.btn-pri:hover{background:#ffb648}
.btn:disabled{opacity:.5;cursor:not-allowed}
.sched-list{display:flex;flex-direction:column;gap:14px;margin-bottom:16px}
.sched-card{border:1px solid #263349;border-radius:4px;background:#182338;padding:14px;display:flex;flex-direction:column;gap:10px}
.sched-row{display:flex;align-items:center;gap:10px}
.sched-name{flex:1;min-width:0}
.toggle{display:flex;align-items:center;gap:5px;font-size:13px;color:#7c8aa0;white-space:nowrap}
.days{display:flex;gap:8px;flex-wrap:wrap}
.day-lbl{display:flex;align-items:center;gap:4px;font-size:13px;font-family:monospace;color:#7c8aa0}
.times{display:flex;gap:16px;flex-wrap:wrap}
.times label{display:flex;flex-direction:column;gap:4px;font-size:12px;color:#7c8aa0}
.save-bar{position:fixed;bottom:0;left:0;right:0;padding:16px 24px;background:linear-gradient(to top,#0b1220 60%,transparent);display:flex;justify-content:center;z-index:100}
.status{color:#7c8aa0;font-family:monospace;font-size:13px;padding:16px 0}
.status-err{color:#e0637a}
`;

// スタイルを注入
const styleEl = document.createElement("style");
styleEl.textContent = css;
document.head.appendChild(styleEl);

// ============================================================
// ユーティリティ: スケジュール判定
// ============================================================
function timeToMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function inInterval(cur, s, e) {
  const c = timeToMin(cur), sv = timeToMin(s), ev = timeToMin(e);
  return sv <= ev ? c >= sv && c < ev : c >= sv || c < ev;
}
function hhMM(d) {
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}
function dayIndex(d) { return (d.getDay() + 6) % 7; } // 0=月…6=日
const DAY_LABELS = ["月","火","水","木","金","土","日"];

function findSleepSchedule(schedules) {
  if (!Array.isArray(schedules)) return null;
  const now = new Date();
  const cur = hhMM(now), di = dayIndex(now);
  for (const s of schedules) {
    if (!s.enabled) continue;
    if (!s.target_days?.[di]) continue;
    if (inInterval(cur, s.sleep_time, s.wake_time)) return s;
  }
  return null;
}

// ============================================================
// YouTubeのURLから動画IDを取得
// ============================================================
function extractVideoId(url) {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
    if (u.searchParams.has("v")) return u.searchParams.get("v");
  } catch {}
  return null;
}

// ============================================================
// ページ: ホーム
// ============================================================
function Home() {
  return (
    <div className="home">
      <div className="home-card">
        <p className="home-eye">SIGNAGE SYSTEM</p>
        <h1 className="home-title">サイネージシステム</h1>
        <p className="home-sub">再生する端末か、操作する端末かを選んでください。</p>
        <div className="home-links">
          <Link to="/player" className="home-link">
            <span className="home-link-label">再生ページを開く</span>
            <span className="home-link-path">/player</span>
          </Link>
          <Link to="/control" className="home-link">
            <span className="home-link-label">遠隔操作ダッシュボードを開く</span>
            <span className="home-link-path">/control</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ページ: プレイヤー
// ============================================================
function Player() {
  const playerRef      = useRef(null);
  const playlistRef    = useRef([]);
  const pendingRef     = useRef(null);
  const indexRef       = useRef(0);
  const schedulesRef   = useRef([]);
  const readyRef       = useRef(false);
  const errCountRef    = useRef(0);
  const isBootRef      = useRef(true);
  const toastTimer     = useRef(null);
  const breakoutTimer  = useRef(null);
  const wsRef          = useRef(null);
  const backoffRef     = useRef(1000);
  const pollRef        = useRef(null);
  const connectedRef   = useRef(false);
  const lastPayload    = useRef(null);

  const [sleeping, setSleeping]       = useState(false);
  const [overlay, setOverlay]         = useState(1);
  const [toast, setToast]             = useState(false);

  const sleepingRef = useRef(false);
  useEffect(() => { sleepingRef.current = sleeping; }, [sleeping]);

  function showToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(true);
    toastTimer.current = setTimeout(() => setToast(false), 5000);
  }

  function loadVideo(index) {
    const id = playlistRef.current[index];
    if (readyRef.current && playerRef.current && id) {
      playerRef.current.loadVideoById(id);
    }
  }

  function advance() {
    if (pendingRef.current) {
      playlistRef.current = pendingRef.current;
      pendingRef.current = null;
      indexRef.current = 0;
    } else {
      const next = indexRef.current + 1;
      indexRef.current = next >= playlistRef.current.length ? 0 : next;
    }
    loadVideo(indexRef.current);
  }

  function applySettings(settings) {
    const ids = (settings?.playlist_urls ?? []).map(extractVideoId).filter(Boolean);
    schedulesRef.current = settings?.schedules ?? [];
    if (playlistRef.current.length === 0) {
      playlistRef.current = ids;
      indexRef.current = 0;
      if (readyRef.current) loadVideo(0);
    } else {
      pendingRef.current = ids;
    }
  }

  function handleMessage(msg) {
    if (msg.type === "INIT") {
      applySettings(msg.payload);
      isBootRef.current = false;
      return;
    }
    if (msg.type === "SETTINGS_UPDATED") {
      applySettings(msg.payload);
      if (sleepingRef.current) {
        setOverlay(0.5);
        showToast();
        if (breakoutTimer.current) clearTimeout(breakoutTimer.current);
        breakoutTimer.current = setTimeout(() => setOverlay(1), 5000);
      } else {
        showToast();
      }
    }
  }

  // WebSocket + ポーリングフォールバック
  useEffect(() => {
    function startPolling() {
      if (pollRef.current) return;
      pollRef.current = setInterval(async () => {
        if (connectedRef.current) return;
        try {
          const res = await fetch(`${BACKEND_URL}/api/settings`);
          if (!res.ok) return;
          const data = await res.json();
          const s = JSON.stringify(data);
          if (s !== JSON.stringify(lastPayload.current)) {
            lastPayload.current = data;
            handleMessage({ type: "SETTINGS_UPDATED", payload: data });
          }
        } catch {}
      }, 10000);
    }

    function connect() {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      ws.onopen  = () => { connectedRef.current = true; backoffRef.current = 1000; };
      ws.onmessage = (e) => {
        try { handleMessage(JSON.parse(e.data)); } catch {}
      };
      ws.onclose = () => {
        connectedRef.current = false;
        startPolling();
        const d = Math.min(backoffRef.current, 30000);
        setTimeout(connect, d);
        backoffRef.current = Math.min(backoffRef.current * 2, 30000);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    startPolling();
    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // YouTube IFrame API
  useEffect(() => {
    function createPlayer() {
      playerRef.current = new window.YT.Player("yt-player", {
        playerVars: { autoplay:1, controls:0, disablekb:1, fs:0, modestbranding:1, rel:0, playsinline:1 },
        events: {
          onReady() {
            readyRef.current = true;
            if (playlistRef.current.length > 0) loadVideo(indexRef.current);
          },
          onStateChange(e) {
            if (e.data === window.YT.PlayerState.ENDED) {
              errCountRef.current = 0;
              advance();
            }
          },
          onError(e) {
            console.warn("YouTube再生エラー code:", e.data);
            errCountRef.current++;
            if (errCountRef.current < Math.max(playlistRef.current.length, 1) * 2) {
              setTimeout(advance, 3000);
            }
          }
        }
      });
    }

    if (window.YT?.Player) {
      createPlayer();
    } else {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    }
    return () => playerRef.current?.destroy?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // スケジュール監視(60秒ごと)
  useEffect(() => {
    function check() {
      const active = findSleepSchedule(schedulesRef.current);
      if (active && !sleepingRef.current) {
        playerRef.current?.pauseVideo?.();
        setSleeping(true);
        setOverlay(1);
      } else if (!active && sleepingRef.current) {
        setSleeping(false);
        playerRef.current?.playVideo?.();
      }
    }
    check();
    const t = setInterval(check, 60000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="player">
      <div id="yt-player" />
      {sleeping && <div className="sleep-overlay" style={{ opacity: overlay }} aria-hidden="true" />}
      {toast && <div className="toast" role="status">設定を保存しました</div>}
    </div>
  );
}

// ============================================================
// ページ: コントロール
// ============================================================
function makeSchedule() {
  return {
    id: crypto.randomUUID(),
    name: "",
    enabled: true,
    target_days: [false,true,true,true,true,true,false],
    sleep_time: "22:00",
    wake_time: "07:00",
  };
}

function Control() {
  const [urls, setUrls]       = useState([]);
  const [newUrl, setNewUrl]   = useState("");
  const [scheds, setScheds]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState(null);
  const [toast, setToast]     = useState(false);
  const toastTimer = useRef(null);

  const playerUrl = `${window.location.origin}/player`;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/settings`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setUrls(data.playlist_urls ?? []);
        setScheds(data.schedules ?? []);
      } catch (e) {
        if (!cancelled) setError("設定の取得に失敗しました。バックエンドが起動しているか確認してください。");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function showToast() {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(true);
    toastTimer.current = setTimeout(() => setToast(false), 5000);
  }

  function addUrl() {
    const t = newUrl.trim();
    if (!t) return;
    setUrls(p => [...p, t]);
    setNewUrl("");
  }

  function removeUrl(i) { setUrls(p => p.filter((_, j) => j !== i)); }
  function addSched()    { setScheds(p => [...p, makeSchedule()]); }
  function removeSched(id) { setScheds(p => p.filter(s => s.id !== id)); }

  function updateSched(id, patch) {
    setScheds(p => p.map(s => s.id === id ? { ...s, ...patch } : s));
  }
  function toggleDay(id, di) {
    setScheds(p => p.map(s => {
      if (s.id !== id) return s;
      const days = [...s.target_days];
      days[di] = !days[di];
      return { ...s, target_days: days };
    }));
  }

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlist_urls: urls, schedules: scheds }),
      });
      if (!res.ok) throw new Error();
      showToast();
    } catch {
      alert("保存に失敗しました。入力内容を確認してください。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="ctrl">
      <header className="ctrl-head">
        <p className="ctrl-eye">REMOTE CONSOLE</p>
        <h1>サイネージ遠隔管理ダッシュボード</h1>
      </header>

      {loading && <p className="status">読み込み中...</p>}
      {error   && <p className="status status-err">{error}</p>}

      {!loading && !error && (
        <div className="ctrl-grid">

          {/* QRコード */}
          <section className="panel">
            <h2>接続先QRコード</h2>
            <p className="hint">別のディスプレイ端末で再生ページを素早く開くために使用します。</p>
            <div className="qr-wrap">
              <QRCodeSVG value={playerUrl} size={160} bgColor="transparent" fgColor="#e8e6df" />
            </div>
            <code className="ctrl-url">{playerUrl}</code>
          </section>

          {/* プレイリスト */}
          <section className="panel">
            <h2>再生プレイリスト設定</h2>
            <ul className="url-list">
              {urls.length === 0 && <li className="url-empty">登録されたURLはありません</li>}
              {urls.map((u, i) => (
                <li key={i} className="url-item">
                  <span className="url-text">{u}</span>
                  <button className="btn btn-ghost" onClick={() => removeUrl(i)}>削除</button>
                </li>
              ))}
            </ul>
            <div className="row">
              <input
                type="text"
                placeholder="YouTube動画URLを入力"
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                onKeyDown={e => e.key === "Enter" && addUrl()}
              />
              <button className="btn" onClick={addUrl}>追加</button>
            </div>
          </section>

          {/* スケジュール */}
          <section className="panel panel--wide">
            <h2>マルチスケジュールアラーム設定</h2>
            {scheds.length === 0 && <p className="url-empty">登録されたスケジュールはありません</p>}
            <div className="sched-list">
              {scheds.map(s => (
                <div key={s.id} className="sched-card">
                  <div className="sched-row">
                    <input
                      type="text"
                      placeholder="スケジュール名"
                      value={s.name}
                      onChange={e => updateSched(s.id, { name: e.target.value })}
                      className="sched-name"
                    />
                    <label className="toggle">
                      <input type="checkbox" checked={s.enabled} onChange={e => updateSched(s.id, { enabled: e.target.checked })} />
                      有効
                    </label>
                    <button className="btn btn-ghost" onClick={() => removeSched(s.id)}>削除</button>
                  </div>
                  <div className="days">
                    {DAY_LABELS.map((l, i) => (
                      <label key={l} className="day-lbl">
                        <input type="checkbox" checked={s.target_days[i]} onChange={() => toggleDay(s.id, i)} />
                        {l}
                      </label>
                    ))}
                  </div>
                  <div className="times">
                    <label>
                      就寝
                      <input type="time" value={s.sleep_time} onChange={e => updateSched(s.id, { sleep_time: e.target.value })} />
                    </label>
                    <label>
                      起床
                      <input type="time" value={s.wake_time} onChange={e => updateSched(s.id, { wake_time: e.target.value })} />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-sec" onClick={addSched}>スケジュールを追加</button>
          </section>
        </div>
      )}

      <div className="save-bar">
        <button className="btn btn-pri" onClick={save} disabled={saving || loading}>
          {saving ? "保存中..." : "設定を保存"}
        </button>
      </div>

      {toast && <div className="toast" role="status">設定を保存しました</div>}
    </div>
  );
}

// ============================================================
// ルーティング & エントリポイント
// ============================================================
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"        element={<Home />} />
        <Route path="/player"  element={<Player />} />
        <Route path="/control" element={<Control />} />
      </Routes>
    </BrowserRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><App /></React.StrictMode>
);
