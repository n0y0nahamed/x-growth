import { useState, useEffect, useCallback } from "react";
import api from "./lib/api";

function useTelegram() {
  const tg = window.Telegram?.WebApp;
  return { tg, user: tg?.initDataUnsafe?.user };
}

const XIcon = ({ size = 16 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.213 5.567 5.95-5.567Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const TYPE_CFG = {
  FOLLOW:  { icon:"👤", label:"Follow",  bg:"rgba(16,185,129,0.12)", bd:"rgba(16,185,129,0.3)", tx:"#10b981" },
  LIKE:    { icon:"❤️", label:"Like",    bg:"rgba(239,68,68,0.12)",  bd:"rgba(239,68,68,0.3)",  tx:"#ef4444" },
  COMMENT: { icon:"💬", label:"Comment", bg:"rgba(29,155,240,0.12)", bd:"rgba(29,155,240,0.3)", tx:"#1d9bf0" },
};

function getStatusStyle(s) {
  if (s === "PENDING")  return { bg:"rgba(234,179,8,0.08)",  bd:"rgba(234,179,8,0.25)",  tx:"#eab308", label:"Pending"  };
  if (s === "APPROVED") return { bg:"rgba(16,185,129,0.08)", bd:"rgba(16,185,129,0.25)", tx:"#10b981", label:"Approved" };
  return                       { bg:"rgba(239,68,68,0.08)",  bd:"rgba(239,68,68,0.25)",  tx:"#ef4444", label:"Rejected" };
}

const Spinner = () => (
  <div style={{ display:"flex", justifyContent:"center", padding:"48px 0" }}>
    <div className="spinner" />
  </div>
);

function Toast({ msg, type }) {
  if (!msg) return null;
  const color = type === "error" ? "#ef4444" : "#10b981";
  return (
    <div style={{ position:"fixed", top:16, left:"50%", transform:"translateX(-50%)", background:color, color:"#fff", fontWeight:700, fontSize:13, padding:"10px 20px", borderRadius:12, zIndex:999, whiteSpace:"nowrap", boxShadow:`0 4px 20px ${color}55`, fontFamily:"inherit" }}>
      {type === "error" ? "❌" : "✅"} {msg}
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthPage({ tgUser, onApproved }) {
  const [name,      setName]      = useState(`${tgUser?.first_name || ""} ${tgUser?.last_name || ""}`.trim());
  const [xUrl,      setXUrl]      = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [checking,  setChecking]  = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit() {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!xUrl.trim() || (!xUrl.includes("x.com") && !xUrl.includes("twitter.com"))) {
      setError("Please enter a valid X profile URL"); return;
    }
    setError(""); setLoading(true);
    try {
      await api.post("/api/auth/request-access", {
        telegramId:       String(tgUser?.id || ""),
        telegramUsername: tgUser?.username || "",
        name:             name.trim(),
        xProfileUrl:      xUrl.trim(),
      });
      setSubmitted(true);
    } catch (e) {
      setError(e.response?.data?.error || "Something went wrong. Try again.");
    } finally { setLoading(false); }
  }

  async function handleCheck() {
    setChecking(true); setError("");
    try {
      const { data } = await api.get(`/api/auth/status/${tgUser?.id}`);
      if (data.status === "approved") {
        onApproved();
      } else {
        setError("Not approved yet. Please wait for admin.");
      }
    } catch {
      setError("Could not check status. Try again.");
    } finally { setChecking(false); }
  }

  return (
    <div className="auth-page">
      <div className="auth-glow" />
      <div />
      <div className="auth-center">
        <div className="auth-logo"><XIcon size={34} /></div>
        <div style={{ textAlign:"center" }}>
          <h1 className="auth-title">X-Growth</h1>
          <p className="auth-sub">Grow your X account with the community</p>
        </div>

        {submitted ? (
          <div className="badge badge-green">
            <span className="dot dot-green" />
            Request sent! Awaiting admin approval
          </div>
        ) : (
          <div className="badge badge-yellow">
            <span className="dot dot-yellow dot-pulse" />
            Approval Required
          </div>
        )}

        {!submitted && (
          <div className="form-group">
            <div>
              <label className="form-label">Your Name</label>
              <input className="form-input" type="text" placeholder="e.g. Noyon Ahmed"
                value={name} onChange={e => { setName(e.target.value); setError(""); }} />
            </div>
            <div>
              <label className="form-label">Your X Profile Link</label>
              <input className={`form-input ${error ? "form-input-error" : ""}`}
                type="url" placeholder="https://x.com/yourhandle"
                value={xUrl} onChange={e => { setXUrl(e.target.value); setError(""); }} />
            </div>
            {error && <p className="form-error">⚠️ {error}</p>}
          </div>
        )}

        {submitted && (
          <div className="info-card">
            <p style={{ color:"#9ca3af", fontSize:13, margin:"0 0 8px" }}>
              Your request has been sent. Once approved, tap below to enter.
            </p>
            <p style={{ color:"#4b5563", fontSize:12, margin:0 }}>
              💡 You will receive a Telegram bot notification when approved.
            </p>
          </div>
        )}
        {submitted && error && <p className="form-error" style={{ textAlign:"center" }}>⚠️ {error}</p>}
      </div>

      <div className="auth-buttons">
        {!submitted ? (
          <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? "Sending..." : "Send Request →"}
          </button>
        ) : (
          <button className="btn-primary" onClick={handleCheck} disabled={checking}>
            {checking ? "Checking..." : "Check Approval Status"}
          </button>
        )}
        <p style={{ color:"#374151", fontSize:12, textAlign:"center", margin:0 }}>
          Made by @n0y0nahamed
        </p>
      </div>
    </div>
  );
}

// ── HOME ──────────────────────────────────────────────────────────────────────
function HomePage({ user }) {
  if (!user) return <Spinner />;
  return (
    <div className="page">
      <div className="card card-row">
        <div className="avatar-initials">{user.name?.[0]?.toUpperCase() || "?"}</div>
        <div style={{ flex:1, minWidth:0 }}>
          <span className="user-name">{user.name}</span>
          {user.xProfileUrl && (
            <a href={user.xProfileUrl} target="_blank" rel="noreferrer" className="x-link">
              View X Profile →
            </a>
          )}
        </div>
      </div>

      <div className="points-card">
        <div className="points-glow" />
        <div>
          <p className="points-label">Your Balance</p>
          <div style={{ display:"flex", alignItems:"baseline", gap:6 }}>
            <span className="points-value">{user.points ?? 0}</span>
            <span style={{ color:"#1d9bf0", fontSize:15, fontWeight:700 }}>pts</span>
          </div>
          <p style={{ color:"#6b7280", fontSize:12, margin:"5px 0 0" }}>Complete tasks to earn more</p>
        </div>
        <div style={{ fontSize:54 }}>🌱</div>
      </div>

      <div className="stats-grid">
        {[
          { label:"Tasks Done",    value: user._count?.completions  ?? 0, icon:"✅" },
          { label:"Tasks Created", value: user._count?.tasksCreated ?? 0, icon:"📋" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <p className="section-label">How it works</p>
        {[
          { icon:"📋", text:"Add tasks — pay points to get followers/likes/comments" },
          { icon:"✅", text:"Complete others tasks — earn +1 point each" },
          { icon:"🏆", text:"Climb the leaderboard top 100" },
        ].map((h, i) => (
          <div key={i} className={`how-row ${i < 2 ? "how-row-border" : ""}`}>
            <span style={{ fontSize:18 }}>{h.icon}</span>
            <p style={{ color:"#9ca3af", fontSize:13, margin:0 }}>{h.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── ADD TASK MODAL ────────────────────────────────────────────────────────────
function AddTaskModal({ user, onClose, onCreated }) {
  const [type,    setType]    = useState("FOLLOW");
  const [url,     setUrl]     = useState("");
  const [desc,    setDesc]    = useState("");
  const [slots,   setSlots]   = useState(5);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [done,    setDone]    = useState(false);

  async function handleCreate() {
    if (!url.trim()) { setError("Enter a URL"); return; }
    if ((user?.points ?? 0) < slots) { setError(`Not enough points. Need ${slots}, you have ${user?.points ?? 0}`); return; }
    setError(""); setLoading(true);
    try {
      await api.post("/api/tasks", { type, targetUrl: url.trim(), description: desc.trim(), maxSlots: slots });
      setDone(true);
      onCreated?.();
    } catch (e) {
      setError(e.response?.data?.error || "Error creating task");
    } finally { setLoading(false); }
  }

  if (done) return (
    <div className="modal-overlay">
      <div className="modal-success">
        <div style={{ fontSize:52, marginBottom:12 }}>🎉</div>
        <h3 style={{ color:"#fff", margin:"0 0 8px" }}>Task Submitted!</h3>
        <p style={{ color:"#6b7280", fontSize:13, margin:"0 0 20px" }}>
          Admin will review and approve. You will be notified via bot.
        </p>
        <button className="btn-primary" style={{ width:"auto", padding:"12px 32px" }} onClick={onClose}>Done</button>
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ color:"#fff", margin:0, fontSize:18, fontWeight:800 }}>Add Task</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div>
          <p className="form-label">Task Type</p>
          <div style={{ display:"flex", gap:6 }}>
            {["FOLLOW","LIKE","COMMENT"].map(t => {
              const c = TYPE_CFG[t]; const sel = type === t;
              return (
                <button key={t} onClick={() => setType(t)} style={{ flex:1, padding:"10px 4px", border:`1px solid ${sel ? c.bd : "#1f2937"}`, background: sel ? c.bg : "transparent", borderRadius:12, color: sel ? c.tx : "#6b7280", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", lineHeight:1.6 }}>
                  {c.icon}<br />{t}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="form-label">X Profile / Tweet URL</p>
          <input className="form-input" type="url" placeholder="https://x.com/..."
            value={url} onChange={e => setUrl(e.target.value)} />
        </div>

        <div>
          <p className="form-label">Description (Optional)</p>
          <input className="form-input" type="text" placeholder="e.g. Follow my tech account"
            value={desc} onChange={e => setDesc(e.target.value)} />
        </div>

        <div>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
            <p className="form-label" style={{ margin:0 }}>Slots: {slots}</p>
            <p style={{ color:"#1d9bf0", fontSize:13, margin:0, fontWeight:700 }}>Cost: {slots} pts</p>
          </div>
          <input type="range" min={1} max={Math.min(50, user?.points ?? 50)} value={slots}
            onChange={e => setSlots(Number(e.target.value))} style={{ width:"100%", accentColor:"#1d9bf0" }} />
        </div>

        {error && <p className="form-error">{error}</p>}

        <button className="btn-primary" onClick={handleCreate} disabled={loading || !url} style={{ opacity: !url ? 0.5 : 1 }}>
          {loading ? "Creating..." : `Create Task (−${slots} pts)`}
        </button>
      </div>
    </div>
  );
}

// ── TASKS ─────────────────────────────────────────────────────────────────────
function TaskPage({ user, onUserUpdate }) {
  const [tab,       setTab]       = useState("available");
  const [tasks,     setTasks]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState({});
  const [toast,     setToast]     = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(tab === "mine" ? "/api/tasks/mine" : "/api/tasks");
      setTasks(data);
    } catch { showToast("Failed to load tasks", "error"); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function handleComplete(taskId) {
    try {
      await api.post(`/api/tasks/${taskId}/complete`);
      setSubmitted(prev => ({ ...prev, [taskId]: true }));
      showToast("Completion request sent to task creator!");
    } catch (e) {
      showToast(e.response?.data?.error || "Error", "error");
    }
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100%" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      <div className="page-header">
        <h2 className="page-title">Tasks</h2>
        <button className="fab" onClick={() => setShowModal(true)}>+</button>
      </div>

      <div className="tab-bar">
        {["available","mine"].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? "tab-btn-active" : ""}`} onClick={() => setTab(t)}>
            {t === "available" ? "Available" : "My Tasks"}
          </button>
        ))}
      </div>

      <div className="list-gap" style={{ paddingBottom:16 }}>
        {loading ? <Spinner /> : tasks.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize:40, marginBottom:8 }}>📋</p>
            <p>{tab === "available" ? "No tasks available right now" : "You haven't created any tasks"}</p>
          </div>
        ) : tasks.map((task, i) => {
          const c   = TYPE_CFG[task.type];
          const pct = Math.round((task.usedSlots / task.maxSlots) * 100);
          const done = submitted[task.id];
          return (
            <div key={task.id} className="card fade-up" style={{ animationDelay:`${i * 0.04}s` }}>
              {task.creator && (
                <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:10 }}>
                  <div className="creator-avatar">{task.creator.name?.[0]?.toUpperCase()}</div>
                  <span style={{ color:"#6b7280", fontSize:12 }}>{task.creator.name}</span>
                  {tab === "mine" && (
                    <span className={`status-pill ${task.isApproved ? "pill-green" : "pill-yellow"}`}>
                      {task.isApproved ? "✅ Live" : "⏳ Pending"}
                    </span>
                  )}
                </div>
              )}

              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <span style={{ background:c.bg, border:`1px solid ${c.bd}`, color:c.tx, borderRadius:999, padding:"3px 10px", fontSize:12, fontWeight:700 }}>
                    {c.icon} {c.label}
                  </span>
                  {task.description && (
                    <p style={{ color:"#e5e7eb", fontSize:13, margin:"8px 0 0", lineHeight:1.4 }}>{task.description}</p>
                  )}
                  <p style={{ color:"#374151", fontSize:11, margin:"4px 0 0", wordBreak:"break-all" }}>{task.targetUrl}</p>
                </div>
                <span style={{ color:"#1d9bf0", fontWeight:800, fontSize:16, marginLeft:10 }}>+1</span>
              </div>

              <div style={{ marginBottom: tab === "available" ? 12 : 0 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                  <span style={{ color:"#6b7280", fontSize:11 }}>{task.usedSlots}/{task.maxSlots} slots</span>
                  <span style={{ color: pct > 80 ? "#ef4444" : "#6b7280", fontSize:11, fontWeight:600 }}>{pct}%</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width:`${pct}%`, background: pct > 80 ? "#ef4444" : "#1d9bf0" }} />
                </div>
              </div>

              {tab === "available" && (
                done ? (
                  <div className="complete-sent">✅ Completion request sent</div>
                ) : (
                  <button className="btn-complete" onClick={() => handleComplete(task.id)}>
                    Mark as Complete
                  </button>
                )
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <AddTaskModal
          user={user}
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); setTab("mine"); fetchTasks(); }}
        />
      )}
    </div>
  );
}

// ── REQUESTS ──────────────────────────────────────────────────────────────────
function RequestPage() {
  const [tab,     setTab]     = useState("incoming");
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2800);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/api/requests/${tab}`);
      setItems(data);
    } catch { showToast("Failed to load", "error"); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  async function handle(id, action) {
    try {
      await api.patch(`/api/requests/${id}`, { action });
      showToast(action === "approve" ? "Approved! +1pt sent." : "Request rejected.");
      fetchItems();
    } catch (e) {
      showToast(e.response?.data?.error || "Error", "error");
    }
  }

  return (
    <div>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      <div className="page-header">
        <div>
          <h2 className="page-title">Requests</h2>
          <p style={{ color:"#6b7280", fontSize:13, margin:"2px 0 0" }}>Approve completions from others</p>
        </div>
      </div>

      <div className="tab-bar">
        {["incoming","outgoing"].map(t => (
          <button key={t} className={`tab-btn ${tab === t ? "tab-btn-active" : ""}`} onClick={() => setTab(t)}>
            {t === "incoming" ? "📥 Incoming" : "📤 Outgoing"}
          </button>
        ))}
      </div>

      <div className="list-gap" style={{ paddingBottom:16 }}>
        {loading ? <Spinner /> : items.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize:40, marginBottom:8 }}>📭</p>
            <p>No requests yet</p>
          </div>
        ) : items.map(req => {
          const st  = req.status;
          const ss  = getStatusStyle(st);
          const c   = TYPE_CFG[req.task?.type] || TYPE_CFG.FOLLOW;
          const who = tab === "incoming" ? req.user?.name : req.task?.creator?.name;
          return (
            <div key={req.id} className="card">
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom: st === "PENDING" && tab === "incoming" ? 12 : 0 }}>
                <div className="creator-avatar" style={{ width:42, height:42, fontSize:16 }}>
                  {who?.[0]?.toUpperCase() || "?"}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ color:"#e5e7eb", fontSize:14, fontWeight:700, margin:"0 0 5px" }}>{who}</p>
                  <span style={{ background:c.bg, border:`1px solid ${c.bd}`, color:c.tx, borderRadius:999, padding:"2px 9px", fontSize:11, fontWeight:700 }}>
                    {c.icon} {c.label}
                  </span>
                </div>
                <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", gap:4 }}>
                  <span style={{ background:ss.bg, border:`1px solid ${ss.bd}`, color:ss.tx, borderRadius:999, padding:"3px 10px", fontSize:11, fontWeight:700 }}>
                    {ss.label}
                  </span>
                  <span style={{ color:"#4b5563", fontSize:11 }}>
                    {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {tab === "incoming" && st === "PENDING" && (
                <div style={{ display:"flex", gap:8 }}>
                  <button className="btn-approve" onClick={() => handle(req.id, "approve")}>✅ Approve +1pt</button>
                  <button className="btn-reject"  onClick={() => handle(req.id, "reject")}>❌ Reject</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── LEADERBOARD ───────────────────────────────────────────────────────────────
function LeaderboardPage({ user }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/api/leaderboard")
      .then(({ data }) => setUsers(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const medals      = ["🥇","🥈","🥉"];
  const top3        = users.slice(0, 3);
  const rest        = users.slice(3);
  const podiumOrder = [top3[1], top3[0], top3[2]].filter(Boolean);
  const podiumH     = [92, 130, 72];
  const podiumRank  = [1, 0, 2];
  const podiumBg    = ["rgba(234,179,8,0.16)","rgba(29,155,240,0.16)","rgba(156,163,175,0.12)"];
  const podiumBd    = ["rgba(234,179,8,0.35)","rgba(29,155,240,0.35)","rgba(156,163,175,0.28)"];

  return (
    <div className="page">
      <h2 className="page-title">Leaderboard</h2>
      <p style={{ color:"#6b7280", fontSize:13, margin:"-8px 0 16px" }}>Top 100 X growers 🏆</p>

      {loading ? <Spinner /> : <>
        {top3.length === 3 && (
          <div style={{ display:"flex", alignItems:"flex-end", justifyContent:"center", gap:8, marginBottom:18, height:168 }}>
            {podiumOrder.map((u, i) => u && (
              <div key={u.id} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center" }}>
                <div className="podium-avatar" style={{ width: podiumRank[i] === 0 ? 48 : 36, height: podiumRank[i] === 0 ? 48 : 36, border:`2px solid ${podiumBd[i]}`, fontSize: podiumRank[i] === 0 ? 20 : 14, marginBottom:4 }}>
                  {u.name?.[0]?.toUpperCase()}
                </div>
                <span style={{ fontSize: podiumRank[i] === 0 ? 20 : 15, marginBottom:2 }}>{medals[podiumRank[i]]}</span>
                <div style={{ width:"100%", height:podiumH[i], background:podiumBg[i], border:`1px solid ${podiumBd[i]}`, borderRadius:"10px 10px 0 0", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column" }}>
                  <span style={{ color:"#fff", fontWeight:800, fontSize:14 }}>{u.points}</span>
                  <span style={{ color:"#6b7280", fontSize:10 }}>pts</span>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="list-gap">
          {rest.map((u, i) => {
            const isMe = u.id === user?.id;
            return (
              <div key={u.id} className={`leaderboard-row ${isMe ? "leaderboard-row-me" : ""}`}>
                <span style={{ color: (i+4) <= 10 ? "#eab308" : "#4b5563", fontWeight:800, width:24, textAlign:"center", fontSize:13, flexShrink:0 }}>
                  {i + 4}
                </span>
                <div className="creator-avatar">{u.name?.[0]?.toUpperCase()}</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <p style={{ color:"#e5e7eb", fontSize:13, fontWeight:700, margin:0, display:"flex", alignItems:"center", gap:5 }}>
                    {u.name}
                    {isMe && <span className="you-badge">YOU</span>}
                  </p>
                </div>
                <span style={{ color: isMe ? "#1d9bf0" : "#6b7280", fontWeight:800, fontSize:14, flexShrink:0 }}>
                  {u.points}
                </span>
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}

// ── BOTTOM NAV ────────────────────────────────────────────────────────────────
function BottomNav({ active, onChange }) {
  const tabs = [
    { id:"home",        icon:"🏠", label:"Home"     },
    { id:"task",        icon:"📋", label:"Tasks"    },
    { id:"request",     icon:"🔔", label:"Requests" },
    { id:"leaderboard", icon:"🏆", label:"Rankings" },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button key={t.id} className={`nav-btn ${active === t.id ? "nav-btn-active" : ""}`} onClick={() => onChange(t.id)}>
          <span style={{ fontSize:20 }}>{t.icon}</span>
          <span style={{ fontSize:10, fontWeight:700, marginTop:3 }}>{t.label}</span>
          {active === t.id && <div className="nav-dot" />}
        </button>
      ))}
    </nav>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { tg, user: tgUser } = useTelegram();
  const [screen,    setScreen]    = useState("loading");
  const [activeTab, setActiveTab] = useState("home");
  const [appUser,   setAppUser]   = useState(null);

  useEffect(() => {
    tg?.ready();
    tg?.expand();
    tg?.setHeaderColor?.("#0a0e14");
    tg?.setBackgroundColor?.("#0a0e14");
    checkStatus();
  }, []);

  async function checkStatus() {
    const id = tgUser?.id;
    if (!id) { setScreen("auth"); return; }
    try {
      const { data } = await api.get(`/api/auth/status/${id}`);
      if (data.status === "approved") {
        const me = await api.get("/api/users/me");
        setAppUser(me.data);
        setScreen("app");
      } else {
        setScreen("auth");
      }
    } catch { setScreen("auth"); }
  }

  async function handleApproved() {
    try {
      const me = await api.get("/api/users/me");
      setAppUser(me.data);
      setScreen("app");
    } catch { setScreen("auth"); }
  }

  const pages = {
    home:        <HomePage        user={appUser} />,
    task:        <TaskPage        user={appUser} onUserUpdate={setAppUser} />,
    request:     <RequestPage />,
    leaderboard: <LeaderboardPage user={appUser} />,
  };

  if (screen === "loading") return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#0a0e14" }}>
      <div className="spinner" />
    </div>
  );

  if (screen === "auth") return <AuthPage tgUser={tgUser} onApproved={handleApproved} />;

  return (
    <div className="app-root">
      <div className="app-scroll">{pages[activeTab]}</div>
      <BottomNav active={activeTab} onChange={setActiveTab} />
    </div>
  );
}