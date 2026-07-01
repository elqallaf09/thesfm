"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
//  وكيل (WAKEEL) — مساعد صوتي ذكي داخل THE SFM
//  • الإيقاظ: تصفيق · ضغط الدائرة · زر · نداء بالاسم
//  • العقل: /api/wakeel  (Claude + بحث مباشر + محفظتك من Supabase)
//  • البيانات: /api/portfolio  (محفظتك الحقيقية + الزكاة)
//  • الصوت: متصفح مجاني، أو /api/tts (ElevenLabs بدون كشف المفتاح)
// ============================================================

const STYLES = `
.wk-root{position:relative;width:100%;min-height:100vh;background:#05080F;color:#E8F6FF;
  font-family:ui-monospace,'SF Mono','JetBrains Mono','Cascadia Code',monospace;overflow:hidden;
  display:flex;flex-direction:column;direction:ltr}
.wk-root::before{content:"";position:absolute;inset:0;pointer-events:none;
  background:radial-gradient(circle at 50% 40%,rgba(34,211,238,.10),transparent 55%),
             radial-gradient(circle at 50% 112%,rgba(255,157,66,.10),transparent 50%)}
.wk-root::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:.5;
  background:repeating-linear-gradient(0deg,transparent 0 2px,rgba(34,211,238,.025) 2px 3px)}
.wk-corner{position:absolute;width:34px;height:34px;border:1px solid rgba(34,211,238,.45);z-index:3}
.wk-corner.tl{top:14px;left:14px;border-right:0;border-bottom:0}
.wk-corner.tr{top:14px;right:14px;border-left:0;border-bottom:0}
.wk-corner.bl{bottom:14px;left:14px;border-right:0;border-top:0}
.wk-corner.br{bottom:14px;right:14px;border-left:0;border-top:0}
.wk-top{display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:22px 26px 8px;font-size:12px;letter-spacing:.16em;color:#5B8597;z-index:4;flex-wrap:wrap}
.wk-name{color:#22D3EE;font-weight:600;text-shadow:0 0 12px rgba(34,211,238,.6);
  font-family:system-ui,'Segoe UI',sans-serif;letter-spacing:0}
.wk-stat{display:flex;align-items:center;gap:8px}
.wk-dot{width:8px;height:8px;border-radius:50%;background:#22D3EE;box-shadow:0 0 10px #22D3EE;animation:wk-blink 1.6s infinite}
@keyframes wk-blink{0%,100%{opacity:1}50%{opacity:.25}}
.wk-meter{width:80px;height:4px;background:rgba(34,211,238,.15);border-radius:3px;overflow:hidden}
.wk-meter > i{display:block;height:100%;width:0%;background:linear-gradient(90deg,#22D3EE,#FF9D42);border-radius:3px}
.wk-stage{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:22px;padding:8px 18px 26px;z-index:2}
.wk-core{--level:0;position:relative;width:min(54vw,260px);height:min(54vw,260px);display:flex;align-items:center;justify-content:center;cursor:pointer;user-select:none}
.wk-ring{position:absolute;border-radius:50%}
.wk-ring.r1{inset:0;border:1px dashed rgba(34,211,238,.35);animation:wk-spin 26s linear infinite}
.wk-ring.r2{inset:9%;border:1px solid rgba(34,211,238,.18)}
.wk-ring.r3{inset:18%;border-top:2px solid #22D3EE;border-left:2px solid transparent;border-right:2px solid transparent;border-bottom:2px solid rgba(34,211,238,.25);animation:wk-spin 8s linear infinite reverse}
.wk-ticks{position:absolute;inset:4%;border-radius:50%;background:conic-gradient(from 0deg,rgba(34,211,238,.55) 0 1deg,transparent 1deg 15deg);-webkit-mask:radial-gradient(transparent 60%,#000 61%);mask:radial-gradient(transparent 60%,#000 61%);opacity:.5;animation:wk-spin 60s linear infinite}
.wk-orb{position:relative;width:46%;height:46%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#9DF3FF,#22D3EE 45%,#0a5f73 100%);box-shadow:0 0 calc(24px + var(--level)*120px) rgba(34,211,238,.75),inset 0 0 30px rgba(5,15,25,.55);transform:scale(calc(1 + var(--level)*.55));transition:transform .05s linear,box-shadow .05s linear}
@keyframes wk-spin{to{transform:rotate(360deg)}}
@keyframes wk-pulse{0%,100%{opacity:.4}50%{opacity:1}}
.wk-root[data-status="thinking"] .wk-orb{background:radial-gradient(circle at 35% 30%,#FFD9A8,#FF9D42 45%,#7a4310 100%);box-shadow:0 0 50px rgba(255,157,66,.8),inset 0 0 30px rgba(5,15,25,.55)}
.wk-root[data-status="thinking"] .wk-ring.r3{border-top-color:#FF9D42;animation-duration:1.4s}
.wk-root[data-status="thinking"] .wk-ticks{animation-duration:6s}
.wk-root[data-status="sleeping"] .wk-orb{filter:saturate(.5) brightness(.6)}
.wk-root[data-status="sleeping"] .wk-dot{background:#3a5a66;box-shadow:none}
.wk-root[data-status="speaking"] .wk-ring.r2{animation:wk-pulse 1.1s infinite}
.wk-statusline{text-align:center;min-height:24px}
.wk-statusline b{color:#22D3EE;letter-spacing:.3em;font-size:13px;text-transform:uppercase}
.wk-root[data-status="thinking"] .wk-statusline b{color:#FF9D42}
.wk-hint{color:#4d6f7d;font-size:11px;margin-top:6px;font-family:system-ui,sans-serif;direction:rtl}
.wk-chips{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;direction:rtl}
.wk-chip{background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.3);color:#7fd9e8;padding:7px 13px;border-radius:20px;font-size:12px;cursor:pointer;font-family:system-ui,sans-serif;transition:.15s}
.wk-chip:hover{background:rgba(34,211,238,.16)}
.wk-chip:disabled{opacity:.35;cursor:not-allowed}
.wk-panel{width:min(92vw,640px);background:rgba(10,20,30,.6);border:1px solid rgba(34,211,238,.18);border-radius:10px;padding:14px 16px;backdrop-filter:blur(4px);direction:rtl}
.wk-said{color:#7fd9e8;font-size:13px;word-break:break-word;min-height:18px;font-family:system-ui,sans-serif}
.wk-said span{color:#456}
.wk-reply{margin-top:10px;color:#E8F6FF;font-size:15px;line-height:1.6;word-break:break-word;font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
.wk-log{width:min(92vw,640px);display:flex;flex-direction:column;gap:8px;max-height:130px;overflow:auto;direction:rtl}
.wk-log .q{color:#5B8597;font-size:12px;font-family:system-ui,sans-serif}
.wk-log .a{color:#9fb6c2;font-size:12px;font-family:system-ui,sans-serif;border-right:2px solid rgba(34,211,238,.3);padding-right:8px}
.wk-controls{display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap}
.wk-btn{background:rgba(34,211,238,.08);border:1px solid rgba(34,211,238,.4);color:#22D3EE;padding:11px 18px;border-radius:8px;font-family:inherit;font-size:12px;letter-spacing:.1em;cursor:pointer;transition:.15s}
.wk-btn:hover{background:rgba(34,211,238,.18);box-shadow:0 0 16px rgba(34,211,238,.3)}
.wk-btn.amber{border-color:rgba(255,157,66,.5);color:#FF9D42;background:rgba(255,157,66,.08)}
.wk-btn.ghost{background:transparent;border:1px solid rgba(91,133,151,.4);color:#5B8597}
.wk-btn:disabled{opacity:.35;cursor:not-allowed}
.wk-row{display:flex;gap:8px;width:min(92vw,640px)}
.wk-input{flex:1;background:rgba(10,20,30,.7);border:1px solid rgba(34,211,238,.25);color:#E8F6FF;padding:10px 12px;border-radius:8px;font-family:system-ui,sans-serif;font-size:14px;outline:none;direction:rtl}
.wk-input:focus{border-color:#22D3EE;box-shadow:0 0 12px rgba(34,211,238,.25)}
.wk-modal{position:absolute;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(2,6,12,.8);backdrop-filter:blur(3px);padding:16px}
.wk-card{width:min(94vw,440px);max-height:88vh;overflow:auto;background:#0a131d;border:1px solid rgba(34,211,238,.3);border-radius:12px;padding:20px;display:flex;flex-direction:column;gap:14px}
.wk-card h3{margin:0;color:#22D3EE;letter-spacing:.2em;font-size:13px}
.wk-card h4{margin:6px 0 0;color:#FF9D42;font-size:11px;letter-spacing:.16em}
.wk-field{display:flex;flex-direction:column;gap:5px}
.wk-field label{font-size:11px;color:#5B8597;font-family:system-ui,sans-serif;direction:rtl}
.wk-field select,.wk-field input{background:#06101a;border:1px solid rgba(34,211,238,.25);color:#E8F6FF;padding:9px 10px;border-radius:7px;font-family:inherit;font-size:13px;outline:none}
.wk-grid2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.wk-zak{background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.2);border-radius:8px;padding:10px 12px;font-family:system-ui,sans-serif;font-size:12px;color:#9fb6c2;direction:rtl}
.wk-zak b{color:#22D3EE}
.wk-toggle{display:flex;align-items:center;gap:8px;font-family:system-ui,sans-serif;font-size:12px;color:#9fb6c2;direction:rtl}
.wk-err{color:#ff9a9a;font-size:12px;font-family:system-ui,sans-serif;direction:rtl;text-align:center}
.wk-note{color:#6f8a96;font-size:10px;font-family:system-ui,sans-serif;direction:rtl}
@media (max-width:560px){.wk-top{font-size:10px;letter-spacing:.08em}}
`;

const hasArabic = (s) => /[\u0600-\u06FF]/.test(s || "");
const fmt = (n) => Number(n || 0).toLocaleString("en-US");

export default function Wakeel() {
  const [name, setName] = useState("وكيل");
  const [lang, setLang] = useState("ar");
  const [status, setStatus] = useState("offline");
  const [said, setSaid] = useState("");
  const [reply, setReply] = useState("");
  const [log, setLog] = useState([]);
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voices, setVoices] = useState([]);
  const [voiceURI, setVoiceURI] = useState("");
  const [rate, setRate] = useState(1);
  const [clock, setClock] = useState("--:--:--");
  const [textInput, setTextInput] = useState("");
  const [wakeWordOn, setWakeWordOn] = useState(false);
  const [engine, setEngine] = useState("browser"); // browser | server

  const [fin, setFin] = useState({
    currency: "د.إ", cash: 0, investments: 0, gold: 0, receivables: 0, liabilities: 0, nisab: 24000,
  });
  const zBase = Math.max(0, fin.cash + fin.investments + fin.gold + fin.receivables - fin.liabilities);
  const zTotal = fin.cash + fin.investments + fin.gold + fin.receivables;
  const zDue = zBase >= fin.nisab ? Math.round(zBase * 0.025) : 0;

  const statusRef = useRef("offline");
  const reactorRef = useRef(null);
  const meterRef = useRef(null);
  const analyserRef = useRef(null);
  const timeDataRef = useRef(null);
  const rafRef = useRef(0);
  const baselineRef = useRef(0);
  const lastClapRef = useRef(0);
  const recRef = useRef(null);
  const wakeRef = useRef(null);
  const historyRef = useRef([]);
  const finalRef = useRef("");
  const audioRef = useRef(null);

  const setStat = (s) => { statusRef.current = s; setStatus(s); };
  useEffect(() => { statusRef.current = status; }, [status]);

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date(); const p = (n) => String(n).padStart(2, "0");
      setClock(`${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`);
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis ? window.speechSynthesis.getVoices() : [];
      if (v.length) {
        setVoices(v);
        setVoiceURI((cur) => cur || (v.find((x) => x.lang && x.lang.toLowerCase().startsWith("ar")) || v[0]).voiceURI);
      }
    };
    load();
    if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = load;
    return () => { if (window.speechSynthesis) window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  // جلب المحفظة الحقيقية من السيرفر
  const loadProfile = useCallback(async () => {
    try {
      const r = await fetch("/api/portfolio", { credentials: "include" });
      if (!r.ok) return;
      const s = await r.json();
      setFin({
        currency: s.currency, cash: s.cash, investments: s.investments, gold: s.gold,
        receivables: s.receivables, liabilities: s.liabilities, nisab: s.nisab,
      });
    } catch (_) {}
  }, []);

  const initialize = useCallback(async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx(); await ctx.resume();
      const src = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
      src.connect(analyser);
      analyserRef.current = analyser;
      timeDataRef.current = new Uint8Array(analyser.fftSize);
      setStat("sleeping");
      loadProfile();
      loop();
      if (wakeWordOn) startWake();
    } catch (e) {
      setError("ما قدرت أوصل للمايك. اسمح بالإذن، أو استخدم الكتابة تحت.");
      setStat("offline");
    }
  }, [wakeWordOn, loadProfile]); // eslint-disable-line

  const loop = useCallback(() => {
    const analyser = analyserRef.current, data = timeDataRef.current;
    if (analyser && data) {
      analyser.getByteTimeDomainData(data);
      let peak = 0, sumSq = 0;
      for (let i = 0; i < data.length; i++) { const v = Math.abs(data[i] - 128) / 128; if (v > peak) peak = v; sumSq += v * v; }
      const rms = Math.sqrt(sumSq / data.length);
      if (reactorRef.current) reactorRef.current.style.setProperty("--level", String(Math.min(rms * 4, 1)));
      if (meterRef.current) meterRef.current.style.width = Math.min(rms * 320, 100) + "%";
      const base = baselineRef.current; baselineRef.current = base * 0.94 + peak * 0.06;
      if (statusRef.current === "sleeping") {
        const now = performance.now();
        if (peak > 0.33 && peak > base * 4 && now - lastClapRef.current > 800) { lastClapRef.current = now; wake(); }
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, []); // eslint-disable-line

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const matchName = (txt) => {
    const t = (txt || "").toLowerCase();
    return t.includes("وكيل") || t.includes(name.toLowerCase()) || t.includes("wakeel") || t.includes("wakil") || t.includes("agent");
  };

  const startWake = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    try { if (wakeRef.current) wakeRef.current.stop(); } catch (e) {}
    const w = new SR(); wakeRef.current = w;
    w.lang = lang === "ar" ? "ar-SA" : "en-US";
    w.continuous = true; w.interimResults = true;
    w.onresult = (ev) => {
      const txt = Array.from(ev.results).map((r) => r[0].transcript).join(" ");
      if (statusRef.current === "sleeping" && matchName(txt)) { stopWake(); wake(); }
    };
    w.onend = () => { if (wakeWordOn && statusRef.current === "sleeping") { try { w.start(); } catch (e) {} } };
    try { w.start(); } catch (e) {}
  }, [lang, wakeWordOn, name]); // eslint-disable-line

  const stopWake = useCallback(() => { try { if (wakeRef.current) { wakeRef.current.onend = null; wakeRef.current.stop(); } } catch (e) {} }, []);
  const goSleep = useCallback(() => { setStat("sleeping"); if (wakeWordOn) startWake(); }, [wakeWordOn, startWake]);

  useEffect(() => {
    if (status === "sleeping" && wakeWordOn) startWake();
    if (!wakeWordOn) stopWake();
  }, [wakeWordOn]); // eslint-disable-line

  const wake = useCallback(() => {
    if (statusRef.current === "offline") return;
    stopWake();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStat("sleeping"); setError("متصفحك ما يدعم التعرف الصوتي. استخدم الكتابة، أو افتحه بـ Chrome."); return; }
    setError(""); setSaid(""); setReply(""); setStat("listening"); finalRef.current = "";
    const rec = new SR(); recRef.current = rec;
    rec.lang = lang === "ar" ? "ar-SA" : "en-US";
    rec.interimResults = true; rec.continuous = false; rec.maxAlternatives = 1;
    rec.onresult = (ev) => {
      let interim = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const t = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) finalRef.current += t; else interim += t;
      }
      setSaid(finalRef.current + interim);
    };
    rec.onerror = () => {};
    rec.onend = () => { const text = (finalRef.current || "").trim(); if (text) ask(text); else goSleep(); };
    try { rec.start(); } catch (e) { goSleep(); }
    setTimeout(() => { try { rec.stop(); } catch (e) {} }, 9000);
  }, [lang, goSleep]); // eslint-disable-line

  // العقل عبر السيرفر
  const ask = useCallback(async (text) => {
    setSaid(text); setReply(""); setStat("thinking"); setError("");
    historyRef.current = [...historyRef.current, { role: "user", content: text }].slice(-12);
    try {
      const r = await fetch("/api/wakeel", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ messages: historyRef.current, name }),
      });
      const data = await r.json();
      if (!r.ok || data.error) throw new Error(data.error || "api");
      const out = (data.text || "…").trim();
      historyRef.current = [...historyRef.current, { role: "assistant", content: out }].slice(-12);
      setReply(out);
      setLog((L) => [...L, { q: text, a: out }].slice(-6));
      speak(out);
    } catch (e) {
      setError("صار خطأ بالاتصال بالوكيل. حاول مرة ثانية.");
      goSleep();
    }
  }, [name, goSleep]); // eslint-disable-line

  const browserSpeak = (text) => {
    if (!window.speechSynthesis) { goSleep(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const ar = hasArabic(text);
    u.lang = ar ? "ar-SA" : "en-US";
    const chosen = voices.find((x) => x.voiceURI === voiceURI);
    if (chosen && (chosen.lang || "").toLowerCase().startsWith(ar ? "ar" : "en")) u.voice = chosen;
    else { const m = voices.find((x) => (x.lang || "").toLowerCase().startsWith(ar ? "ar" : "en")); if (m) u.voice = m; }
    u.rate = rate; u.pitch = 1;
    u.onstart = () => setStat("speaking");
    u.onend = () => goSleep(); u.onerror = () => goSleep();
    window.speechSynthesis.speak(u);
  };

  const speak = useCallback(async (text) => {
    if (engine === "server") {
      try {
        setStat("speaking");
        const r = await fetch("/api/tts", {
          method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
          body: JSON.stringify({ text }),
        });
        if (!r.ok) throw new Error("tts");
        const blob = await r.blob();
        const url = URL.createObjectURL(blob);
        if (audioRef.current) audioRef.current.pause();
        const audio = new Audio(url); audioRef.current = audio;
        audio.onended = () => { URL.revokeObjectURL(url); goSleep(); };
        audio.onerror = () => { URL.revokeObjectURL(url); browserSpeak(text); };
        await audio.play();
        return;
      } catch (_) { browserSpeak(text); return; }
    }
    browserSpeak(text);
  }, [engine, voices, voiceURI, rate, goSleep]); // eslint-disable-line

  const sendText = () => { const t = textInput.trim(); if (!t || statusRef.current === "offline") return; setTextInput(""); ask(t); };
  const quick = (t) => { if (statusRef.current === "offline" || statusRef.current === "thinking") return; ask(t); };

  const statusLabel = { offline: "OFFLINE", sleeping: "STANDBY", listening: "LISTENING", thinking: "PROCESSING", speaking: "SPEAKING" }[status];
  const hint = {
    offline: "اضغط تشغيل وكيل عشان يبدأ",
    sleeping: `صفّق · اضغط الدائرة · أو قول "${name}"`,
    listening: "تكلّم الحين…",
    thinking: "وكيل يفكّر ويبحث…",
    speaking: "وكيل يرد عليك…",
  }[status];
  const busy = status === "offline" || status === "thinking";

  return (
    <div className="wk-root" data-status={status}>
      <style>{STYLES}</style>
      <span className="wk-corner tl" /><span className="wk-corner tr" />
      <span className="wk-corner bl" /><span className="wk-corner br" />

      <div className="wk-top">
        <div><span className="wk-name">{name}</span> <span style={{ opacity: .5 }}>// AI CORE</span></div>
        <div className="wk-stat">
          <span className="wk-dot" /><span>{statusLabel}</span>
          <div className="wk-meter"><i ref={meterRef} /></div>
          <span>{clock}</span>
        </div>
      </div>

      <div className="wk-stage">
        <div className="wk-core" ref={reactorRef} role="button" tabIndex={0}
          onClick={() => { if (status === "sleeping") wake(); }}
          onKeyDown={(e) => { if (e.key === "Enter" && status === "sleeping") wake(); }}>
          <div className="wk-ring r1" /><div className="wk-ticks" />
          <div className="wk-ring r2" /><div className="wk-ring r3" /><div className="wk-orb" />
        </div>

        <div className="wk-statusline">
          <b>{statusLabel}</b>
          <div className="wk-hint">{hint}</div>
        </div>

        {status !== "offline" && (
          <div className="wk-chips">
            {["لخّص لي محفظتي", "كم زكاتي؟", "أخبار الأسواق اليوم", "كم سعر الذهب الحين؟"].map((c) => (
              <button key={c} className="wk-chip" disabled={busy} onClick={() => quick(c)}>{c}</button>
            ))}
          </div>
        )}

        {(said || reply) && (
          <div className="wk-panel">
            <div className="wk-said"><span>{">"} </span>{said || "…"}</div>
            {reply && <div className="wk-reply">{reply}</div>}
          </div>
        )}

        {log.length > 1 && (
          <div className="wk-log">
            {log.slice(0, -1).reverse().map((x, i) => (
              <div key={i}><div className="q">{">"} {x.q}</div><div className="a">{x.a}</div></div>
            ))}
          </div>
        )}

        {error && <div className="wk-err">{error}</div>}

        <div className="wk-controls">
          {status === "offline"
            ? <button className="wk-btn" onClick={initialize}>⏻ تشغيل وكيل</button>
            : <button className="wk-btn" onClick={() => status === "sleeping" && wake()} disabled={status !== "sleeping"}>🎙 WAKE</button>}
          <button className="wk-btn ghost" onClick={() => setSettingsOpen(true)}>⚙ الإعدادات</button>
        </div>

        {status !== "offline" && (
          <div className="wk-row">
            <input className="wk-input" placeholder="أو اكتب أمرك هنا…" value={textInput}
              onChange={(e) => setTextInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") sendText(); }} />
            <button className="wk-btn amber" onClick={sendText}>إرسال</button>
          </div>
        )}
      </div>

      {settingsOpen && (
        <div className="wk-modal" onClick={(e) => { if (e.target.className === "wk-modal") setSettingsOpen(false); }}>
          <div className="wk-card">
            <h3>SETTINGS · الإعدادات</h3>

            <div className="wk-field">
              <label>اسم الوكيل</label>
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="wk-grid2">
              <div className="wk-field">
                <label>لغة الكلام (الإدخال)</label>
                <select value={lang} onChange={(e) => setLang(e.target.value)}>
                  <option value="ar">العربية</option><option value="en">English</option>
                </select>
              </div>
              <div className="wk-field">
                <label>سرعة الصوت</label>
                <input type="range" min="0.8" max="1.2" step="0.05" value={rate} onChange={(e) => setRate(Number(e.target.value))} />
              </div>
            </div>

            <div className="wk-toggle">
              <input type="checkbox" checked={wakeWordOn} onChange={(e) => setWakeWordOn(e.target.checked)} />
              <span>الاستماع المستمر للاسم (قول "{name}" لإيقاظه) — تجريبي</span>
            </div>

            <h4>الصوت — VOICE ENGINE</h4>
            <div className="wk-field">
              <label>محرك النطق</label>
              <select value={engine} onChange={(e) => setEngine(e.target.value)}>
                <option value="browser">المتصفح (مجاني)</option>
                <option value="server">صوت السيرفر (ElevenLabs عبر /api/tts)</option>
              </select>
            </div>
            {engine === "browser" && (
              <div className="wk-field">
                <label>صوت الرد</label>
                <select value={voiceURI} onChange={(e) => setVoiceURI(e.target.value)}>
                  {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
                </select>
              </div>
            )}
            {engine === "server" && (
              <div className="wk-note">يستخدم مفتاح ElevenLabs المخزّن في السيرفر (ENV) — لا يظهر للعميل. لو فشل، يرجع لصوت المتصفح تلقائياً.</div>
            )}

            <h4>المحفظة والزكاة — THE SFM</h4>
            <div className="wk-note">تُجلب تلقائياً من /api/portfolio عند التشغيل. التعديل هنا للتجربة فقط.</div>
            <div className="wk-grid2">
              {[["cash","نقد / حسابات"],["investments","استثمارات / أسهم"],["gold","ذهب"],["receivables","ديون لك"],["liabilities","التزامات عليك"],["nisab","النصاب"]].map(([k,labl]) => (
                <div className="wk-field" key={k}>
                  <label>{labl}</label>
                  <input type="number" value={fin[k]} onChange={(e) => setFin({ ...fin, [k]: Number(e.target.value) })} />
                </div>
              ))}
            </div>
            <div className="wk-zak">
              إجمالي الأصول: <b>{fmt(zTotal)} {fin.currency}</b> · الوعاء الزكوي: <b>{fmt(zBase)}</b> ·
              الزكاة (2.5%): <b>{fmt(zDue)} {fin.currency}</b>
              <div className="wk-note">{zBase >= fin.nisab ? "الوعاء فوق النصاب → الزكاة واجبة." : "الوعاء تحت النصاب → لا زكاة."}</div>
            </div>

            <button className="wk-btn" onClick={() => setSettingsOpen(false)}>تم</button>
          </div>
        </div>
      )}
    </div>
  );
}
