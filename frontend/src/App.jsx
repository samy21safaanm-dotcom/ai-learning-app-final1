import React, { useState, useEffect, useRef } from "react";
import LessonPage from "./LessonPage";
import LoginPage from "./LoginPage";

// ── Error Boundary ──────────────────────────────────────────────────────────
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f9fafb", direction: "rtl", textAlign: "right", padding: "20px" }}>
          <div style={{ maxWidth: "500px", background: "#fff", borderRadius: "16px", padding: "32px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)", border: "1px solid #fee2e2" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
            <h2 style={{ margin: "0 0 12px", fontSize: "18px", fontWeight: 700, color: "#dc2626" }}>حدث خطأ</h2>
            <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#666", lineHeight: 1.6 }}>
              حدثت مشكلة غير متوقعة في التطبيق. تفاصيل الخطأ:
            </p>
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "12px", marginBottom: "16px", fontSize: "12px", color: "#991b1b", fontFamily: "monospace", overflow: "auto", maxHeight: "200px" }}>
              {String(this.state.error?.message || "خطأ غير معروف")}
            </div>
            <button
              style={{ background: "#dc2626", color: "#fff", border: "none", borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600 }}
              onClick={() => window.location.reload()}
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Login & Main App ────────────────────────────────────────────────────────
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("ar-SA", { year: "numeric", month: "short", day: "numeric" });
}

function formatWaitTime(seconds) {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return "";
  if (s < 60) return `${Math.ceil(s)} ثانية`;
  const mins = Math.floor(s / 60);
  const rem = Math.ceil(s % 60);
  return rem ? `${mins} دقيقة و${rem} ثانية` : `${mins} دقيقة`;
}

function buildGenerationErrorMessage(data, status, fallback) {
  const isDailyLimit = status === 429 && data?.code === "DAILY_TOKEN_LIMIT";
  const isThrottled = status === 429 && data?.code === "THROTTLED";
  
  if (isDailyLimit) {
    const waitText = formatWaitTime(data?.retryAfterSeconds);
    return waitText
      ? `تم استهلاك الحد اليومي للتوكنات. حاول مرة أخرى بعد ${waitText}.`
      : "تم استهلاك الحد اليومي للتوكنات. يرجى الانتظار ثم إعادة المحاولة لاحقًا.";
  }
  
  if (isThrottled) {
    const waitText = formatWaitTime(data?.retryAfterSeconds);
    return waitText
      ? `الخدمة مشغولة حالياً. يرجى محاولة المرة القادمة بعد ${waitText}.`
      : "الخدمة مشغولة حالياً. يرجى الانتظار والمحاولة مرة أخرى.";
  }
  
  return data?.error || fallback;
}

function buildFallbackNotice(data) {
  if (data?.fallbackReason === "credentials") {
    return "تم إنشاء الدرس في وضع سريع (بدون AI) لأن بيانات اعتماد AWS منتهية الصلاحية أو غير صحيحة. حدّث ملف .env بمفاتيح AWS وأعد تشغيل الخادم للحصول على درس مولَّد بالكامل بالذكاء الاصطناعي.";
  }
  const waitSeconds = Number(data?.retryAfterSeconds);
  const waitText = formatWaitTime(waitSeconds);

  if (waitText) {
    const retryAt = new Date(Date.now() + waitSeconds * 1000).toLocaleTimeString("ar-SA", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `تم إنشاء الدرس بنجاح في وضع سريع لضمان الاستمرارية. للحصول على صياغة ذكاء اصطناعي موسعة، جرّب لاحقًا بعد ${waitText} (تقريبًا عند ${retryAt}).`;
  }

  return "تم إنشاء الدرس بنجاح في وضع سريع لضمان الاستمرارية. يمكنك إعادة المحاولة لاحقًا للحصول على نسخة ذكاء اصطناعي موسعة.";
}

// ── Spinner ────────────────────────────────────────────────────────────────
function Spinner({ small }) {
  const size = small ? "14px" : "24px";
  return (
    <div style={{ width: size, height: size, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block", flexShrink: 0 }} />
  );
}

// ── SCORM Export ───────────────────────────────────────────────────────────
function generateSCORM(lessonData, contentBlocks = []) {
  const { lesson = {}, summary = "", quiz = [], imageCards = [], video = null, simulation = null, conceptMap = null } = lessonData || {};
  const mergedContentBlocks = Array.isArray(contentBlocks) && contentBlocks.length
    ? contentBlocks
    : (Array.isArray(lessonData?.contentBlocks) ? lessonData.contentBlocks : []);
  const exportId = `scorm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const orgId = `org-${exportId}`;
  const itemId = `item-${exportId}`;
  const resId = `res-${exportId}`;

  const escapeXml = (value) => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");

  const payload = JSON.stringify({ lesson, summary, quiz, imageCards, video, simulation, conceptMap, contentBlocks: mergedContentBlocks })
    .replace(/</g, "\\u003c")
    .replace(/<\/script/gi, "<\\/script");

  const indexHTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeXml(lesson.title || "درس تفاعلي")}</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div id="scorm-root"></div>
  <script id="lesson-data" type="application/json">${payload}</script>
  <script src="script.js"></script>
</body>
</html>`;

  const stylesCSS = `
:root {
  --navy: #1a237e;
  --purple: #7c3aed;
  --purple-light: #ede9fe;
  --sky: #eef2ff;
  --line: #e8eaf6;
  --text: #334155;
  --muted: #64748b;
  --surface: #ffffff;
  --surface-soft: #f8fafc;
  --danger: #dc2626;
  --danger-soft: #fee2e2;
  --success: #059669;
  --success-soft: #d1fae5;
  --shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
}

* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; min-height: 100%; }
body {
  font-family: Tahoma, Arial, sans-serif;
  direction: rtl;
  background: linear-gradient(180deg, #eef2ff 0%, #f8fafc 45%, #eef2ff 100%);
  color: var(--text);
}

.page-shell { min-height: 100vh; }
.page-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: linear-gradient(135deg, #0d1b6e, #1a237e, #7c3aed);
  color: #fff;
  box-shadow: 0 10px 24px rgba(13, 27, 110, 0.18);
}
.page-header__inner {
  max-width: 1360px;
  margin: 0 auto;
  padding: 14px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.brand-wrap { display: flex; align-items: center; gap: 12px; min-width: 0; }
.brand-icon {
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: rgba(255,255,255,0.18);
  display: grid;
  place-items: center;
  font-size: 20px;
  flex-shrink: 0;
}
.brand-project { font-size: 11px; opacity: 0.82; font-weight: 700; }
.brand-title {
  font-size: clamp(16px, 2vw, 22px);
  font-weight: 800;
  line-height: 1.3;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.header-badge {
  background: rgba(255,255,255,0.14);
  border: 1px solid rgba(255,255,255,0.22);
  color: #fff;
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.hero-strip {
  max-width: 1360px;
  margin: 0 auto;
  padding: 18px 24px 0;
}
.hero-panel {
  background: rgba(255,255,255,0.92);
  border: 1px solid rgba(255,255,255,0.9);
  backdrop-filter: blur(10px);
  border-radius: 18px;
  box-shadow: var(--shadow);
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.hero-copy h2 { margin: 0 0 4px; color: var(--navy); font-size: 16px; }
.hero-copy p { margin: 0; color: var(--muted); font-size: 13px; line-height: 1.7; }
.hero-stats { display: flex; gap: 10px; flex-wrap: wrap; }
.hero-stat {
  min-width: 96px;
  background: linear-gradient(135deg, #f8faff, #eef2ff);
  border: 1px solid #dbe4ff;
  border-radius: 14px;
  padding: 10px 12px;
}
.hero-stat__label { font-size: 11px; color: var(--muted); margin-bottom: 4px; }
.hero-stat__value { font-size: 18px; font-weight: 800; color: var(--navy); }

.top-nav {
  max-width: 1360px;
  margin: 12px auto 0;
  padding: 0 24px;
  display: flex;
  gap: 8px;
  overflow-x: auto;
}
.top-nav__link {
  text-decoration: none;
  color: var(--navy);
  background: #fff;
  border: 1px solid var(--line);
  border-radius: 999px;
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.lesson-shell {
  max-width: 1360px;
  margin: 18px auto 0;
  padding: 0 24px 28px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 20px;
  align-items: start;
}
.main-column, .side-column { min-width: 0; }
.main-column { display: flex; flex-direction: column; gap: 18px; }
.side-column { display: flex; flex-direction: column; gap: 18px; position: sticky; top: 148px; }

.card {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: 18px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.05);
  overflow: hidden;
}
.card__header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 18px;
  border-bottom: 1px solid #f1f5f9;
  background: linear-gradient(180deg, #ffffff, #fbfcff);
}
.card__header--space { justify-content: space-between; }
.card__icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--purple-light);
  display: grid;
  place-items: center;
  font-size: 17px;
  color: var(--purple);
  flex-shrink: 0;
}
.card__title { font-size: 15px; font-weight: 800; color: var(--navy); }
.card__body { padding: 18px; }
.section-list { display: flex; flex-direction: column; gap: 14px; }

.lesson-title {
  margin: 0 0 14px;
  font-size: clamp(22px, 2vw, 30px);
  line-height: 1.5;
  color: var(--navy);
}
.objective-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.objective-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: linear-gradient(135deg, #faf5ff, #f8fafc);
  border: 1px solid #e9d5ff;
  border-radius: 12px;
  padding: 12px 14px;
}
.objective-mark {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--navy), var(--purple));
  color: #fff;
  font-size: 12px;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  margin-top: 2px;
}

.content-block { border: 1px solid #edf2f7; border-radius: 16px; overflow: hidden; background: #fff; }
.content-block__head {
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
  background: #fcfdff;
  border-bottom: 1px solid #eef2f7;
}
.content-block__line { width: 5px; height: 28px; border-radius: 99px; background: linear-gradient(180deg, var(--navy), var(--purple)); }
.content-block__title { margin: 0; font-size: 16px; color: var(--navy); font-weight: 800; }
.content-block__text { margin: 0; padding: 16px; line-height: 1.9; font-size: 15px; color: var(--text); background: #f8fafc; }

.interactive-grid { display: grid; gap: 14px; }
.interactive-card {
  border: 1px solid #e9d5ff;
  border-radius: 16px;
  overflow: hidden;
  background: linear-gradient(180deg, #ffffff, #faf5ff);
}
.interactive-card__toggle {
  width: 100%;
  background: transparent;
  border: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  cursor: pointer;
  font: inherit;
}
.interactive-card__title { font-size: 15px; font-weight: 800; color: var(--navy); text-align: right; }
.interactive-card__body { padding: 0 18px 18px; color: var(--text); line-height: 1.9; }
.interactive-card__body[hidden] { display: none; }
.interactive-card__meta {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e9d5ff;
  border-radius: 999px;
  color: var(--purple);
  font-size: 11px;
  font-weight: 700;
  padding: 5px 10px;
}

.video-panel {
  display: grid;
  gap: 14px;
}
.video-frame {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%;
  background: #000;
  border-radius: 16px;
  overflow: hidden;
}
.video-frame iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
.video-link {
  display: flex;
  align-items: center;
  gap: 14px;
  text-decoration: none;
  color: inherit;
  background: #fff5f5;
  border: 1px solid #fca5a5;
  border-radius: 14px;
  padding: 14px;
}
.video-link__icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--danger);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 22px;
  flex-shrink: 0;
}

.simulation {
  border: 2px solid #86efac;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  border-radius: 20px;
  overflow: hidden;
}
.simulation__header {
  background: linear-gradient(135deg, #059669, #34d399);
  color: #fff;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.simulation__header h3 { margin: 0 0 4px; font-size: 16px; }
.simulation__header p { margin: 0; font-size: 12px; opacity: 0.86; }
.simulation__body { padding: 18px; display: grid; gap: 14px; }
.simulation__scenario {
  background: #fff;
  border: 1px solid #bbf7d0;
  border-radius: 14px;
  padding: 14px;
  line-height: 1.8;
}
.simulation__step {
  background: #fff;
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 16px;
}
.simulation__step h4 { margin: 0 0 10px; color: #065f46; font-size: 16px; }
.simulation__question { margin: 0 0 12px; font-weight: 700; color: #065f46; }
.sim-options { display: grid; gap: 10px; }
.sim-option {
  width: 100%;
  text-align: right;
  border: 1px solid #d1fae5;
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  font: inherit;
}
.sim-option.is-correct { background: #d1fae5; border-color: #6ee7b7; color: #065f46; }
.sim-option.is-wrong { background: #fee2e2; border-color: #fca5a5; color: #991b1b; }
.sim-answer {
  width: 100%;
  min-height: 110px;
  border: 1px solid #bbf7d0;
  border-radius: 12px;
  padding: 12px;
  resize: vertical;
  font: inherit;
  line-height: 1.8;
}
.sim-feedback {
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.8;
}
.sim-feedback.is-correct { background: #d1fae5; border: 1px solid #6ee7b7; color: #065f46; }
.sim-feedback.is-wrong { background: #fee2e2; border: 1px solid #fca5a5; color: #991b1b; }
.sim-actions { display: flex; gap: 10px; flex-wrap: wrap; }

.button {
  border: none;
  border-radius: 12px;
  padding: 11px 18px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.button--primary { background: linear-gradient(135deg, var(--navy), var(--purple)); color: #fff; }
.button--ghost { background: #fff; border: 1px solid var(--line); color: var(--muted); }
.button--success { background: linear-gradient(135deg, #059669, #10b981); color: #fff; }

.summary-text { line-height: 1.9; font-size: 14px; color: var(--text); background: #f8fafc; border-radius: 14px; padding: 14px; }
.glossary-list { display: flex; flex-direction: column; gap: 10px; }
.glossary-item {
  background: linear-gradient(135deg, #f5f3ff, #ede9fe);
  border: 1px solid #ddd6fe;
  border-radius: 14px;
  padding: 14px;
  display: grid;
  gap: 6px;
}
.glossary-item__term { font-weight: 800; color: var(--purple); font-size: 14px; }
.glossary-item__def { color: #475569; line-height: 1.8; font-size: 13px; }

.quiz-card .question { background: #f8f9ff; border: 1px solid var(--line); border-radius: 14px; padding: 16px; margin-bottom: 14px; }
.quiz-card .question:last-child { margin-bottom: 0; }
.quiz-card .q-title { margin: 0 0 12px; font-size: 15px; font-weight: 800; color: var(--navy); }
.quiz-card .q-options { display: grid; gap: 10px; }
.quiz-card .q-option {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #fff;
  border: 2px solid #e2e8f0;
  border-radius: 12px;
  padding: 11px 13px;
  cursor: pointer;
  transition: all 0.2s ease;
}
.quiz-card .q-option:hover { border-color: #cbd5e1; background: #f9fafb; }
.quiz-card .q-option.is-selected { border-color: var(--purple); background: #faf5ff; font-weight: 600; box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1); }
.quiz-card .q-feedback {
  margin-top: 12px;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px;
  line-height: 1.8;
}
.quiz-card .q-feedback.is-correct { background: var(--success-soft); border: 1px solid #6ee7b7; color: var(--success); }
.quiz-card .q-feedback.is-wrong { background: var(--danger-soft); border: 1px solid #fca5a5; color: var(--danger); }
.quiz-score {
  margin-top: 16px;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  border: 1px solid #dbeafe;
  border-radius: 16px;
  padding: 16px;
  text-align: center;
}
.quiz-score__value { font-size: 30px; font-weight: 900; color: var(--navy); }

.map-placeholder {
  min-height: 200px;
  border-radius: 16px;
  border: 1px dashed #c4b5fd;
  background: linear-gradient(135deg, #faf5ff, #eef2ff);
  padding: 18px;
  color: var(--muted);
  line-height: 1.8;
}
.visually-hidden {
  position: absolute !important;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (max-width: 1100px) {
  .lesson-shell { grid-template-columns: 1fr; }
  .side-column { position: static; }
}

@media (max-width: 720px) {
  .page-header__inner,
  .hero-strip,
  .top-nav,
  .lesson-shell { padding-right: 16px; padding-left: 16px; }
  .page-header__inner { flex-wrap: wrap; }
  .hero-panel { padding: 14px; }
  .hero-stats { width: 100%; }
  .hero-stat { flex: 1 1 100px; }
}
`;

  const scriptJS = `
(function () {
  var dataNode = document.getElementById("lesson-data");
  var root = document.getElementById("scorm-root");
  if (!dataNode || !root) return;

  var state = {
    lessonData: JSON.parse(dataNode.textContent || "{}"),
    quizAnswers: {},
    simulationStep: 0,
    simulationFeedback: null,
    simulationScore: 0,
    simulationDone: false,
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function nl2br(value) {
    return escapeHtml(value).replace(/\\n/g, "<br />");
  }

  function embedUrl(url) {
    if (!url) return "";
    if (url.indexOf("youtube.com/watch") >= 0) return url.replace("watch?v=", "embed/");
    if (url.indexOf("youtu.be/") >= 0) return url.replace("youtu.be/", "youtube.com/embed/");
    return url;
  }

  function getSimulationStep() {
    var simulation = state.lessonData.simulation;
    if (!simulation || !Array.isArray(simulation.steps)) return null;
    return simulation.steps[state.simulationStep] || null;
  }

  function renderObjectives(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return '<div class="card" id="objectives"><div class="card__header card__header--space"><div style="display:flex;align-items:center;gap:10px"><div class="card__icon">🎯</div><div class="card__title">أهداف الدرس</div></div><span class="interactive-card__meta">عرض جماعي</span></div><div class="card__body"><ul class="objective-list">' +
      list.map(function (item) {
        return '<li class="objective-item"><span class="objective-mark">✓</span><span>' + escapeHtml(item) + '</span></li>';
      }).join("") +
      '</ul></div></div>';
  }

  function renderSections(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return '<div class="card" id="content"><div class="card__header"><div class="card__icon">📘</div><div class="card__title">محتوى الدرس</div></div><div class="card__body"><div class="section-list">' +
      list.map(function (section) {
        return '<article class="content-block"><div class="content-block__head"><div style="display:flex;align-items:center;gap:10px"><div class="content-block__line"></div><h3 class="content-block__title">' + escapeHtml(section.heading || "عنوان") + '</h3></div></div><p class="content-block__text">' + nl2br(section.content || "") + '</p></article>';
      }).join("") +
      '</div></div></div>';
  }

  function renderInteractiveCards(list) {
    if (!Array.isArray(list) || !list.length) return "";
    return '<div class="card" id="cards"><div class="card__header"><div class="card__icon">🖼️</div><div class="card__title">بطاقات توضيحية تفاعلية</div></div><div class="card__body"><div class="interactive-grid">' +
      list.map(function (card, index) {
        var cardId = 'interactive-card-' + index;
        return '<section class="interactive-card"><button class="interactive-card__toggle" type="button" data-toggle-card="' + cardId + '"><div style="display:flex;align-items:center;gap:10px"><span class="interactive-card__meta">AI</span><span class="interactive-card__title">' + escapeHtml(card.title || ('بطاقة ' + (index + 1))) + '</span></div><span>⌄</span></button><div class="interactive-card__body" id="' + cardId + '"' + (index > 0 ? ' hidden' : '') + '><p>' + nl2br(card.description || card.caption || '') + '</p></div></section>';
      }).join("") +
      '</div></div></div>';
  }

  function renderVideo(video) {
    if (!video || !video.url) return "";
    return '<div class="card" id="video"><div class="card__header"><div class="card__icon">🎬</div><div class="card__title">فيديو تعليمي</div></div><div class="card__body"><div class="video-panel"><div class="video-frame"><iframe src="' + escapeHtml(embedUrl(video.embedUrl || video.url)) + '" title="فيديو تعليمي" allowfullscreen loading="lazy"></iframe></div><a class="video-link" href="' + escapeHtml(video.url) + '" target="_blank" rel="noreferrer"><span class="video-link__icon">▶</span><div><div style="font-weight:800;color:#dc2626;margin-bottom:4px">مشاهدة على YouTube</div><div style="font-size:13px;color:#555">' + escapeHtml(video.searchQuery || video.title || 'فيديو مقترح مرتبط بالدرس') + '</div></div></a></div></div></div>';
  }

  function renderSimulation() {
    var simulation = state.lessonData.simulation;
    if (!simulation || !Array.isArray(simulation.steps) || !simulation.steps.length) return "";
    var current = getSimulationStep();
    var isChoice = current && current.type === "choice";
    var isInput = current && current.type === "input";
    var feedback = state.simulationFeedback;
    var body = "";

    if (state.simulationDone) {
      var pct = Math.round((state.simulationScore / simulation.steps.length) * 100);
      body = '<div class="simulation__step"><h4>اكتملت المحاكاة</h4><div class="quiz-score"><div class="quiz-score__value">' + pct + '%</div><p>أتممت ' + state.simulationScore + ' من ' + simulation.steps.length + ' خطوات بنجاح.</p></div>' +
        (simulation.outcome ? '<div class="sim-feedback is-correct" style="margin-top:12px"><strong>ما تعلمته:</strong> ' + escapeHtml(simulation.outcome) + '</div>' : '') +
        '<div class="sim-actions" style="margin-top:12px"><button class="button button--success" data-reset-sim>إعادة المحاكاة</button></div></div>';
    } else {
      body = '<div class="simulation__step"><h4>' + escapeHtml(current.title || ('الخطوة ' + (state.simulationStep + 1))) + '</h4><p style="margin:0 0 12px;line-height:1.8">' + nl2br(current.description || '') + '</p><p class="simulation__question">❓ ' + escapeHtml(current.question || '') + '</p>';
      if (isChoice) {
        body += '<div class="sim-options">' + (current.choices || []).map(function (choice) {
          var className = 'sim-option';
          if (feedback && feedback.selected === choice.id && choice.correct) className += ' is-correct';
          else if (feedback && feedback.selected === choice.id && !choice.correct) className += ' is-wrong';
          else if (feedback && choice.correct) className += ' is-correct';
          return '<button type="button" class="' + className + '" data-sim-choice="' + escapeHtml(choice.id) + '">' + escapeHtml(choice.text) + '</button>';
        }).join("") + '</div>';
      }
      if (isInput) {
        body += '<textarea class="sim-answer" id="sim-answer" placeholder="اكتب إجابتك هنا..."></textarea><div class="sim-actions" style="margin-top:10px"><button class="button button--success" data-check-input>تحقق من الإجابة</button></div>';
      }
      if (feedback) {
        body += '<div class="sim-feedback ' + (feedback.correct ? 'is-correct' : 'is-wrong') + '" style="margin-top:12px">' + escapeHtml(feedback.text || '') + '</div>';
        body += '<div class="sim-actions" style="margin-top:12px"><button class="button button--primary" data-next-sim>' + (state.simulationStep < simulation.steps.length - 1 ? 'الخطوة التالية' : 'إنهاء المحاكاة') + '</button></div>';
      }
      body += '</div>';
    }

    return '<section class="simulation card" id="simulation"><div class="simulation__header"><div><h3>محاكاة تفاعلية</h3><p>' + escapeHtml(simulation.role || 'طالب') + ' · ' + simulation.steps.length + ' خطوات</p></div><div class="interactive-card__meta" style="background:rgba(255,255,255,0.18);color:#fff;border-color:rgba(255,255,255,0.24)">' + (state.simulationDone ? 'تمت' : ((state.simulationStep + 1) + '/' + simulation.steps.length)) + '</div></div><div class="simulation__body"><div class="simulation__scenario">📋 ' + nl2br(simulation.scenario || '') + '</div>' + body + '</div></section>';
  }

  function renderConceptMap(map) {
    if (!map) return "";
    var content = map.indexOf && map.indexOf("<svg") >= 0
      ? map
      : '<div class="map-placeholder">🗺️ تم تضمين خريطة مفاهيم لهذا الدرس. إذا لم تسمح منصة Blackboard بعرض الرسومات المضمنة مباشرة، يمكنك إبقاء هذا القسم كمرجع بصري نصي داخل محتوى SCORM.</div>';
    return '<div class="card" id="map"><div class="card__header"><div class="card__icon">🗺️</div><div class="card__title">خريطة المفاهيم</div></div><div class="card__body">' + content + '</div></div>';
  }

  function renderAdditionalContent(blocks) {
    if (!Array.isArray(blocks) || !blocks.length) return "";
    var html = '<div class="card" id="additional-content"><div class="card__header"><div class="card__icon">➕</div><div class="card__title">محتوى إضافي</div></div><div class="card__body">';
    for (var i = 0; i < blocks.length; i++) {
      var block = blocks[i];
      var blockType = block.type || 'text';
      if (blockType === 'text' && block.content) {
        html += '<div style="margin-bottom:14px;padding:12px;background:#f8fafc;border-right:3px solid #7c3aed;border-radius:6px"><p style="margin:0;line-height:1.8">' + nl2br(block.content) + '</p></div>';
      } else if (blockType === 'image') {
        if (block.svg && block.svg.indexOf && block.svg.indexOf('<svg') >= 0) {
          html += '<div style="margin-bottom:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff">' + block.svg + (block.caption ? '<p style="margin:0;padding:8px 10px;font-size:13px;color:#666;border-top:1px solid #e5e7eb">' + escapeHtml(block.caption) + '</p>' : '') + '</div>';
        } else if (block.url) {
          html += '<div style="margin-bottom:14px"><img src="' + escapeHtml(block.url) + '" alt="' + escapeHtml(block.caption || block.title || 'صورة') + '" style="max-width:100%;border-radius:8px;border:1px solid #e5e7eb" />' + (block.caption ? '<p style="margin:6px 0 0;font-size:13px;color:#666">' + escapeHtml(block.caption) + '</p>' : '') + '</div>';
        }
      } else if (blockType === 'chart' && block.svg) {
        html += '<div style="margin-bottom:14px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;background:#fff">' + block.svg + (block.caption ? '<p style="margin:0;padding:8px 10px;font-size:13px;color:#666;border-top:1px solid #e5e7eb">' + escapeHtml(block.caption) + '</p>' : '') + '</div>';
      } else if (blockType === 'video' && (block.url || block.embedUrl)) {
        var videoUrl = embedUrl(block.embedUrl || block.url);
        html += '<div style="margin-bottom:14px"><div style="position:relative;width:100%;padding-bottom:56.25%;overflow:hidden;border-radius:8px"><iframe src="' + escapeHtml(videoUrl) + '" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none" allowfullscreen loading="lazy"></iframe></div></div>';
      } else if (blockType === 'quiz' && Array.isArray(block.questions)) {
        html += '<div class="card quiz-card" style="margin-bottom:14px;border:1px solid #e5e7eb"><div class="card__header" style="background:#f3f4f6"><div class="card__icon">✏️</div><div class="card__title">' + escapeHtml(block.title || 'اختبار إضافي') + '</div></div><div class="card__body">';
        for (var q = 0; q < block.questions.length; q++) {
          var question = block.questions[q];
          var qKey = 'addon-q-' + i + '-' + q;
          var selectedAnswer = state.quizAnswers[qKey];
          var feedback = '';
          if (selectedAnswer && selectedAnswer.submitted) {
            feedback = '<div class="q-feedback ' + (selectedAnswer.correct ? 'is-correct' : 'is-wrong') + '">' + (selectedAnswer.correct ? '✓ إجابة صحيحة' : ('✗ الإجابة الصحيحة: ' + escapeHtml(question.answer || 'غير محددة'))) + (question.explanation ? '<br />' + escapeHtml(question.explanation) : '') + '</div>';
          }
          var prompt = question.question || question.text || question.prompt || '';
          html += '<div class="question"><p class="q-title">س' + (q + 1) + ': ' + escapeHtml(prompt) + '</p><div class="q-options">' +
            (Array.isArray(question.options) ? question.options.map(function(opt, optIndex) {
              var isSelected = selectedAnswer && selectedAnswer.selected === optIndex;
              return '<label class="q-option' + (isSelected ? ' is-selected' : '') + '"><input class="visually-hidden" type="radio" name="' + qKey + '" value="' + optIndex + '" ' + (isSelected ? 'checked' : '') + ' data-addon-quiz-option="' + qKey + ':' + optIndex + '" /><span>' + escapeHtml(opt) + '</span></label>';
            }).join('') : '') +
            '</div>' + feedback + '</div>';
        }
        html += '<div class="sim-actions"><button class="button button--primary" data-submit-addon-quiz="' + i + '">إرسال الإجابات</button></div><div id="addon-quiz-score-' + i + '"></div></div></div>';
      }
    }
    html += '</div></div>';
    return html;
  }

  function renderSummary(summary) {
    return '<div class="card"><div class="card__header"><div class="card__icon">📋</div><div class="card__title">ملخص الدرس</div></div><div class="card__body"><div class="summary-text">' + nl2br(summary || 'لا يوجد ملخص.') + '</div></div></div>';
  }

  function renderGlossary(terms) {
    if (!Array.isArray(terms) || !terms.length) {
      return '<div class="card"><div class="card__header"><div class="card__icon">📚</div><div class="card__title">المصطلحات</div></div><div class="card__body"><div class="summary-text">لا توجد مصطلحات متاحة لهذا الدرس.</div></div></div>';
    }
    return '<div class="card"><div class="card__header"><div class="card__icon">📚</div><div class="card__title">المصطلحات</div></div><div class="card__body"><div class="glossary-list">' +
      terms.map(function (term) {
        return '<div class="glossary-item"><div class="glossary-item__term">' + escapeHtml(term.term || '') + '</div><div class="glossary-item__def">' + escapeHtml(term.definition || '') + '</div></div>';
      }).join("") +
      '</div></div></div>';
  }

  function renderQuiz(quiz) {
    if (!Array.isArray(quiz) || !quiz.length) return "";
    return '<div class="card quiz-card" id="quiz"><div class="card__header"><div class="card__icon">✏️</div><div class="card__title">اختبر نفسك</div></div><div class="card__body">' +
      quiz.map(function (q, index) {
        var answer = state.quizAnswers[index];
        var feedback = '';
        if (answer && answer.submitted) {
          feedback = '<div class="q-feedback ' + (answer.correct ? 'is-correct' : 'is-wrong') + '">' + (answer.correct ? '✓ إجابة صحيحة' : ('✗ الإجابة الصحيحة: ' + escapeHtml(q.answer))) + (q.explanation ? '<br />' + escapeHtml(q.explanation) : '') + '</div>';
        }
        return '<div class="question"><p class="q-title">س' + (index + 1) + ': ' + escapeHtml(q.question) + '</p><div class="q-options">' +
          (q.options || []).map(function (opt, optIndex) {
            var selected = answer && answer.selected === optIndex;
            return '<label class="q-option' + (selected ? ' is-selected' : '') + '"><input class="visually-hidden" type="radio" name="q' + index + '" value="' + optIndex + '" ' + (selected ? 'checked' : '') + ' data-quiz-option="' + index + ':' + optIndex + '" /><span>' + escapeHtml(opt) + '</span></label>';
          }).join("") +
          '</div>' + feedback + '</div>';
      }).join("") +
      '<div class="sim-actions"><button class="button button--primary" data-submit-quiz>إرسال الإجابات</button></div><div id="quiz-score-slot"></div></div></div>';
  }

  function render() {
    var lesson = state.lessonData.lesson || {};
    var sections = Array.isArray(lesson.sections) ? lesson.sections : [];
    var objectives = Array.isArray(lesson.objectives) ? lesson.objectives : [];
    var terms = Array.isArray(lesson.keyTerms) ? lesson.keyTerms : [];
    var cards = Array.isArray(state.lessonData.imageCards) ? state.lessonData.imageCards : [];
    var navItems = [
      ['title', 'العنوان'],
      objectives.length ? ['objectives', 'الأهداف'] : null,
      sections.length ? ['content', 'المحتوى'] : null,
      cards.length ? ['cards', 'البطاقات'] : null,
      state.lessonData.video ? ['video', 'الفيديو'] : null,
      state.lessonData.simulation ? ['simulation', 'المحاكاة'] : null,
      state.lessonData.conceptMap ? ['map', 'الخريطة'] : null,
      ['quiz', 'الاختبار'],
    ].filter(Boolean);

    root.innerHTML =
      '<div class="page-shell">' +
        '<header class="page-header">' +
          '<div class="page-header__inner">' +
            '<div class="brand-wrap"><div class="brand-icon">🎓</div><div><div class="brand-project">EduAI Studio · SCORM 1.2</div><div class="brand-title">' + escapeHtml(lesson.title || 'درس تفاعلي') + '</div></div></div>' +
            '<div class="header-badge">جامعة القصيم · الكلية التطبيقية</div>' +
          '</div>' +
        '</header>' +
        '<div class="hero-strip"><div class="hero-panel"><div class="hero-copy"><h2>واجهة SCORM مطابقة لتبويب الدرس</h2><p>تم الحفاظ على التخطيط ثنائي الأعمدة حتى بعد الرفع على Blackboard، مع بطاقات رئيسية وشريط جانبي ثابت.</p></div><div class="hero-stats"><div class="hero-stat"><div class="hero-stat__label">الأقسام</div><div class="hero-stat__value">' + sections.length + '</div></div><div class="hero-stat"><div class="hero-stat__label">المصطلحات</div><div class="hero-stat__value">' + terms.length + '</div></div><div class="hero-stat"><div class="hero-stat__label">الأسئلة</div><div class="hero-stat__value">' + (Array.isArray(state.lessonData.quiz) ? state.lessonData.quiz.length : 0) + '</div></div></div></div></div>' +
        '<nav class="top-nav">' + navItems.map(function (item) { return '<a class="top-nav__link" href="#' + item[0] + '">' + item[1] + '</a>'; }).join('') + '</nav>' +
        '<div class="lesson-shell">' +
          '<main class="main-column">' +
            '<section class="card" id="title"><div class="card__body"><h1 class="lesson-title">' + escapeHtml(lesson.title || 'عنوان الدرس') + '</h1><div class="summary-text">هذا المحتوى منشور بصيغة SCORM مع الحفاظ على نفس الهيكل البصري المستخدم داخل المنصة التعليمية.</div></div></section>' +
            renderObjectives(objectives) +
            renderSections(sections) +
            renderInteractiveCards(cards) +
            renderAdditionalContent(state.lessonData.contentBlocks || []) +
            renderVideo(state.lessonData.video) +
            renderSimulation() +
            renderConceptMap(state.lessonData.conceptMap) +
            renderQuiz(state.lessonData.quiz || []) +
          '</main>' +
          '<aside class="side-column">' +
            renderSummary(state.lessonData.summary) +
            renderGlossary(terms) +
          '</aside>' +
        '</div>' +
      '</div>';

    var scoreSlot = document.getElementById('quiz-score-slot');
    if (scoreSlot) {
      var submitted = Object.keys(state.quizAnswers).length && Object.values(state.quizAnswers).every(function (answer) { return answer.submitted; });
      if (submitted && Array.isArray(state.lessonData.quiz) && state.lessonData.quiz.length) {
        var total = state.lessonData.quiz.length;
        var score = Object.values(state.quizAnswers).filter(function (answer) { return answer.correct; }).length;
        var pct = Math.round((score / total) * 100);
        scoreSlot.innerHTML = '<div class="quiz-score"><div class="quiz-score__value">' + pct + '%</div><p>' + score + ' من ' + total + ' إجابة صحيحة</p></div>';
      } else {
        scoreSlot.innerHTML = '';
      }
    }

    bindEvents();
    syncLayoutMode();
  }

  function bindEvents() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-toggle-card]'), function (button) {
      button.addEventListener('click', function () {
        var target = document.getElementById(button.getAttribute('data-toggle-card'));
        if (!target) return;
        target.hidden = !target.hidden;
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-quiz-option]'), function (input) {
      input.addEventListener('change', function () {
        var parts = input.getAttribute('data-quiz-option').split(':');
        var qIndex = Number(parts[0]);
        var optIndex = Number(parts[1]);
        state.quizAnswers[qIndex] = { selected: optIndex, submitted: false, correct: false };
        render();
      });
    });

    var submitQuizBtn = document.querySelector('[data-submit-quiz]');
    if (submitQuizBtn) {
      submitQuizBtn.addEventListener('click', function () {
        var quiz = Array.isArray(state.lessonData.quiz) ? state.lessonData.quiz : [];
        quiz.forEach(function (q, index) {
          var answer = state.quizAnswers[index] || { selected: -1 };
          var selectedOption = (q.options || [])[answer.selected] || '';
          state.quizAnswers[index] = {
            selected: answer.selected,
            submitted: true,
            correct: selectedOption === q.answer,
          };
        });
        updateScormScore();
        render();
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll('[data-addon-quiz-option]'), function (input) {
      input.addEventListener('change', function () {
        var parts = input.getAttribute('data-addon-quiz-option').split(':');
        var qKey = parts[0];
        var optIndex = Number(parts[1]);
        state.quizAnswers[qKey] = { selected: optIndex, submitted: false, correct: false };
        render();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-submit-addon-quiz]'), function (button) {
      button.addEventListener('click', function () {
        var addonIndex = Number(button.getAttribute('data-submit-addon-quiz'));
        var blocks = Array.isArray(state.lessonData.contentBlocks) ? state.lessonData.contentBlocks : [];
        var block = blocks[addonIndex];
        if (!block || block.type !== 'quiz' || !Array.isArray(block.questions)) return;
        block.questions.forEach(function (q, qIndex) {
          var qKey = 'addon-q-' + addonIndex + '-' + qIndex;
          var answer = state.quizAnswers[qKey] || { selected: -1 };
          var selectedOption = (q.options || [])[answer.selected] || '';
          state.quizAnswers[qKey] = {
            selected: answer.selected,
            submitted: true,
            correct: selectedOption === q.answer,
          };
        });
        updateScormScore();
        render();
      });
    });

    Array.prototype.forEach.call(document.querySelectorAll('[data-sim-choice]'), function (button) {
      button.addEventListener('click', function () {
        if (state.simulationFeedback) return;
        var current = getSimulationStep();
        if (!current || !Array.isArray(current.choices)) return;
        var selectedId = button.getAttribute('data-sim-choice');
        var selected = current.choices.find(function (choice) { return String(choice.id) === String(selectedId); });
        if (!selected) return;
        if (selected.correct) state.simulationScore += 1;
        state.simulationFeedback = { selected: selected.id, correct: !!selected.correct, text: selected.feedback || '' };
        render();
      });
    });

    var inputCheckBtn = document.querySelector('[data-check-input]');
    if (inputCheckBtn) {
      inputCheckBtn.addEventListener('click', function () {
        if (state.simulationFeedback) return;
        var current = getSimulationStep();
        var input = document.getElementById('sim-answer');
        if (!current || !input) return;
        var value = input.value.trim().toLowerCase();
        var keywords = Array.isArray(current.expectedKeywords) ? current.expectedKeywords : [];
        var matched = keywords.filter(function (keyword) { return value.indexOf(String(keyword).toLowerCase()) >= 0; });
        var correct = matched.length >= Math.ceil((keywords.length || 1) / 2);
        if (correct) state.simulationScore += 1;
        state.simulationFeedback = {
          selected: 'input',
          correct: correct,
          text: correct
            ? ('✓ إجابة جيدة! ذكرت ' + matched.length + ' من المفاهيم الأساسية.')
            : ('يمكن تحسين الإجابة. ركّز على: ' + keywords.join('، ')),
        };
        render();
      });
    }

    var nextSimBtn = document.querySelector('[data-next-sim]');
    if (nextSimBtn) {
      nextSimBtn.addEventListener('click', function () {
        var simulation = state.lessonData.simulation;
        if (!simulation || !Array.isArray(simulation.steps)) return;
        if (state.simulationStep < simulation.steps.length - 1) {
          state.simulationStep += 1;
          state.simulationFeedback = null;
        } else {
          state.simulationDone = true;
        }
        render();
      });
    }

    var resetSimBtn = document.querySelector('[data-reset-sim]');
    if (resetSimBtn) {
      resetSimBtn.addEventListener('click', function () {
        state.simulationStep = 0;
        state.simulationFeedback = null;
        state.simulationScore = 0;
        state.simulationDone = false;
        render();
      });
    }
  }

  function syncLayoutMode() {
    var shell = document.querySelector('.lesson-shell');
    if (!shell) return;
    shell.dataset.layout = window.innerWidth <= 1100 ? 'stacked' : 'two-columns';
  }

  function findScormApi(win) {
    while (win) {
      try {
        if (win.API) return win.API;
      } catch (err) {}
      if (win.parent && win.parent !== win) win = win.parent;
      else break;
    }
    return null;
  }

  var api = findScormApi(window);
  function initScorm() {
    if (!api) return;
    try { api.LMSInitialize(''); } catch (err) {}
  }
  function updateScormScore() {
    if (!api || !Array.isArray(state.lessonData.quiz) || !state.lessonData.quiz.length) return;
    try {
      var total = state.lessonData.quiz.length;
      var score = Object.values(state.quizAnswers).filter(function (answer) { return answer.correct; }).length;
      var pct = Math.round((score / total) * 100);
      api.LMSSetValue('cmi.core.score.raw', String(pct));
      api.LMSSetValue('cmi.core.lesson_status', pct >= 60 ? 'passed' : 'completed');
      api.LMSCommit('');
    } catch (err) {}
  }
  function closeScorm() {
    if (!api) return;
    try { api.LMSCommit(''); api.LMSFinish(''); } catch (err) {}
  }

  window.addEventListener('resize', syncLayoutMode);
  window.addEventListener('beforeunload', closeScorm);
  initScorm();
  render();
})();
`;

  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${exportId}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2">
  <metadata><schema>ADL SCORM</schema><schemaversion>1.2</schemaversion></metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${escapeXml(lesson.title || "درس تفاعلي")}</title>
      <item identifier="${itemId}" identifierref="${resId}">
        <title>${escapeXml(lesson.title || "درس تفاعلي")}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="${resId}" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
      <file href="styles.css"/>
      <file href="script.js"/>
    </resource>
  </resources>
</manifest>`;

  return { indexHTML, stylesCSS, scriptJS, manifest };
}

async function downloadSCORM(lessonData, contentBlocks = []) {
  const { default: JSZip } = await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm");
  const { indexHTML, stylesCSS, scriptJS, manifest } = generateSCORM(lessonData, contentBlocks);
  const zip = new JSZip();
  zip.file("imsmanifest.xml", manifest);
  zip.file("index.html", indexHTML);
  zip.file("styles.css", stylesCSS);
  zip.file("script.js", scriptJS);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.download = `${lessonData.lesson.title || "lesson"}-scorm-${stamp}.zip`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Enrich Options Panel ───────────────────────────────────────────────────
function EnrichPanel({ options, onChange, compact = false }) {
  const items = [
    {
      key: "images",
      icon: "🖼️",
      title: "صور توضيحية",
      desc: "صور مرتبطة بمحتوى الدرس تلقائياً",
      color: "#7c3aed",
      gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)",
      bg: "#faf5ff",
    },
    {
      key: "video",
      icon: "🎬",
      title: "فيديو تعليمي",
      desc: "بحث YouTube بعنوان الدرس",
      color: "#dc2626",
      gradient: "linear-gradient(135deg, #dc2626, #f87171)",
      bg: "#fff5f5",
    },
    {
      key: "simulation",
      icon: "🧪",
      title: "محاكاة تفاعلية",
      desc: "سيناريو تطبيقي بالذكاء الاصطناعي",
      color: "#059669",
      gradient: "linear-gradient(135deg, #059669, #34d399)",
      bg: "#f0fdf4",
    },
    {
      key: "conceptMap",
      icon: "🗺️",
      title: "خريطة مفاهيم",
      desc: "مخطط بصري لعلاقات المفاهيم",
      color: "#1a237e",
      gradient: "linear-gradient(135deg, #1a237e, #4f46e5)",
      bg: "#eef2ff",
    },
  ];

  const selectedCount = Object.values(options).filter(Boolean).length;

  return (
    <div style={{ ...ep.wrap, ...(compact ? ep.wrapCompact : {}) }}>
      {/* Header */}
      <div style={ep.header}>
        <div style={ep.headerIcon}>✨</div>
        <div style={{ flex: 1 }}>
          <div style={ep.title}>إثراء محتوى الدرس</div>
          <div style={ep.sub}>اختر عناصر إضافية لتعزيز التجربة التعليمية</div>
        </div>
        {selectedCount > 0 && (
          <div style={ep.selectedBadge}>{selectedCount} مختار</div>
        )}
      </div>

      {/* Cards grid */}
      <div style={ep.grid}>
        {items.map(({ key, icon, title, desc, color, gradient, bg }) => {
          const checked = options[key];
          return (
            <label key={key} style={{ ...ep.card, ...(checked ? { background: bg, borderColor: color, boxShadow: `0 4px 16px ${color}22` } : {}) }}>
              <input type="checkbox" checked={checked} onChange={() => onChange({ ...options, [key]: !checked })} style={{ display: "none" }} />

              {/* Icon */}
              <div style={{ ...ep.iconWrap, background: checked ? gradient : "#f3f4f6" }}>
                <span style={{ fontSize: "22px" }}>{icon}</span>
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: "14px", color: checked ? color : "#374151", marginBottom: "3px" }}>{title}</div>
                <div style={{ fontSize: "12px", color: "#9ca3af", lineHeight: 1.5 }}>{desc}</div>
              </div>

              {/* Toggle */}
              <div style={{ ...ep.toggle, background: checked ? gradient : "#e5e7eb" }}>
                <div style={{ ...ep.toggleDot, transform: checked ? "translateX(-20px)" : "translateX(0)" }} />
              </div>
            </label>
          );
        })}
      </div>

      {selectedCount > 0 && (
        <div style={ep.hint}>
          <span style={{ fontSize: "14px" }}>💡</span>
          سيتم إضافة {[options.images && "الصور", options.video && "الفيديو", options.simulation && "المحاكاة", options.conceptMap && "خريطة المفاهيم"].filter(Boolean).join(" و ")} تلقائياً داخل الدرس
        </div>
      )}
    </div>
  );
}

const ep = {
  wrap: { background: "#fff", border: "1px solid #e8eaf6", borderRadius: "20px", padding: "22px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" },
  wrapCompact: { marginBottom: 0, borderRadius: "16px", padding: "18px" },
  header: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" },
  headerIcon: { width: "40px", height: "40px", background: "linear-gradient(135deg, #1a237e, #7c3aed)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0 },
  title: { fontWeight: 700, fontSize: "15px", color: "#1a237e" },
  sub: { fontSize: "12px", color: "#9ca3af", marginTop: "2px" },
  selectedBadge: { background: "linear-gradient(135deg, #1a237e, #7c3aed)", color: "#fff", borderRadius: "20px", padding: "4px 12px", fontSize: "12px", fontWeight: 700, flexShrink: 0 },
  grid: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" },
  card: { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "12px", padding: "16px", background: "#f9fafb", border: "2px solid #e5e7eb", borderRadius: "14px", cursor: "pointer", transition: "all 0.2s", userSelect: "none" },
  iconWrap: { width: "48px", height: "48px", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" },
  toggle: { width: "44px", height: "24px", borderRadius: "12px", position: "relative", transition: "all 0.3s", alignSelf: "flex-end", flexShrink: 0 },
  toggleDot: { position: "absolute", top: "3px", right: "3px", width: "18px", height: "18px", background: "#fff", borderRadius: "50%", transition: "transform 0.3s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" },
  hint: { display: "flex", alignItems: "center", gap: "8px", marginTop: "14px", background: "#f0f4ff", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#1a237e", fontWeight: 500 },
};

// ── Modal ──────────────────────────────────────────────────────────────────
function TextModal({ file, onClose }) {
  const [tab, setTab] = useState("original");
  const [extractedText, setExtractedText] = useState(null);
  const [translatedText, setTranslatedText] = useState(null);
  const [lessonData, setLessonData] = useState(null);
  const [contentBlocks, setContentBlocks] = useState([]);
  const contentBlocksRef = useRef([]);
  const [loading, setLoading] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [enrichOpts, setEnrichOpts] = useState({ images: true, video: true, simulation: true, conceptMap: true });
  const [genStatus, setGenStatus] = useState("");
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== "undefined" ? window.innerWidth < 1080 : false));

  useEffect(() => {
    const onResize = () => setIsNarrow(window.innerWidth < 1080);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/extract/${encodeURIComponent(file.key)}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error("استخراج النص فشل: " + r.statusText)))
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setExtractedText(d.text || "(No text found)");
      })
      .catch((e) => setError(e.message || "خطأ في استخراج النص"))
      .finally(() => setLoading(false));
  }, [file.key]);

  const handleTranslate = async () => {
    setTranslating(true); setError("");
    try {
      const res = await fetch("/translate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: extractedText }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الترجمة");

      const translated = String(data.translatedText || "").trim();
      if (!translated) {
        throw new Error("لم يتم استلام نص مترجم");
      }

      const sourceNorm = String(extractedText || "").replace(/\s+/g, " ").trim();
      const translatedNorm = translated.replace(/\s+/g, " ").trim();
      const hasArabic = /[\u0600-\u06FF]/.test(translated);
      const unchanged = sourceNorm && translatedNorm && sourceNorm === translatedNorm;

      setTranslatedText(translated);

      if (unchanged && !hasArabic) {
        setError(data.warning || "تعذرت الترجمة حالياً. تأكد من اتصال الإنترنت أو مزود الترجمة.");
        return;
      }

      setTab("arabic");
    } catch (e) { setError(e.message || "خطأ في الترجمة"); }
    finally { setTranslating(false); }
  };

  const handleGenerateLesson = async () => {
    setGenerating(true); setError("");
    setGenStatus(enrichOpts.images && enrichOpts.simulation ? "🤖 جارٍ توليد الدرس والصور والمحاكاة..." :
                 enrichOpts.images ? "🤖 جارٍ توليد الدرس والصور..." :
                 enrichOpts.simulation ? "🤖 جارٍ توليد الدرس والمحاكاة..." :
                 enrichOpts.conceptMap ? "🤖 جارٍ توليد الدرس وخريطة المفاهيم..." :
                 "🤖 جارٍ توليد الدرس...");
    try {
      const res = await fetch("/generate-lesson", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: translatedText, enrich: enrichOpts }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(buildGenerationErrorMessage(data, res.status, "فشل إنشاء الدرس"));
      }
      contentBlocksRef.current = [];
      setContentBlocks([]);
      setLessonData(data);
      setTab("lesson");
    } catch (e) { setError(e.message); }
    finally { setGenerating(false); setGenStatus(""); }
  };

  const handleContentBlocksChange = (nextValue) => {
    const nextBlocks = typeof nextValue === "function"
      ? nextValue(Array.isArray(contentBlocksRef.current) ? contentBlocksRef.current : [])
      : nextValue;
    const safeBlocks = Array.isArray(nextBlocks) ? nextBlocks : [];
    contentBlocksRef.current = safeBlocks;
    setContentBlocks(safeBlocks);
  };

  const handleDownloadSCORM = async () => {
    setDownloading(true);
    const blocksForExport = Array.isArray(contentBlocksRef.current) ? contentBlocksRef.current : [];
    try { await downloadSCORM(lessonData, blocksForExport); }
    catch (e) { setError("فشل تحميل SCORM: " + e.message); }
    finally { setDownloading(false); }
  };

  const anyEnrich = enrichOpts.images || enrichOpts.video || enrichOpts.simulation || enrichOpts.conceptMap;

  const tabs = [
    { key: "original", label: "النص الأصلي" },
    { key: "arabic", label: `الترجمة ${translatedText ? "✓" : ""}`, disabled: !translatedText },
    { key: "lesson", label: `الدرس ${lessonData ? "✓" : ""}`, disabled: !lessonData },
  ];

  const sourceChars = extractedText ? extractedText.length : 0;
  const sourceWords = extractedText ? extractedText.trim().split(/\s+/).filter(Boolean).length : 0;
  const sourceLines = extractedText ? extractedText.split("\n").length : 0;
  const fileKind = file.name.toLowerCase().endsWith(".pdf") ? "PDF" : "DOCX";

  return (
    <div style={modal.overlay}>
      <div style={modal.box}>
        <div style={modal.header}>
          <div style={modal.headerLeft}>
            <span style={{ fontSize: "22px" }}>{file.name.endsWith(".pdf") ? "📄" : "📝"}</span>
            <div>
              <div style={modal.projectName}>EduAI Studio · منصة الترجمة التعليمية</div>
              <div style={modal.headerTitle}>{file.name}</div>
              <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.6)", marginTop: "2px" }}>
                {extractedText ? `${extractedText.length.toLocaleString()} حرف` : ""}
                {translatedText ? " · تمت الترجمة ✓" : ""}
                {lessonData ? " · تم إنشاء الدرس ✓" : ""}
              </div>
            </div>
          </div>
          <button style={modal.closeBtn} onClick={onClose}>✕ إغلاق</button>
        </div>
        <div style={modal.tabs}>
          {tabs.map(({ key, label, disabled }) => (
            <button key={key} style={{ ...modal.tab, ...(tab === key ? modal.tabActive : {}), ...(disabled ? { opacity: 0.4, cursor: "default" } : {}) }}
              onClick={() => !disabled && setTab(key)} disabled={disabled}>{label}</button>
          ))}
        </div>
        <div style={{ ...modal.body, padding: tab === "lesson" ? 0 : "28px 32px" }}>
          {error && <div style={{ ...modal.error, marginBottom: "16px" }}>{error}</div>}

          {tab === "original" && (loading
            ? <div style={modal.centered}><Spinner /><p style={{ color: "#aaa", fontSize: "13px" }}>جارٍ استخراج النص...</p></div>
            : <div style={modal.workspaceWrap}>
                <div style={modal.originalHero}>
                  <div style={modal.originalHeroIcon}>📘</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={modal.originalHeroTitle}>النص الأصلي المستخرج</div>
                    <div style={modal.originalHeroSub}>محتوى المصدر قبل الترجمة، جاهز للمراجعة ثم التحويل إلى العربية.</div>
                  </div>
                  <div style={modal.originalFileType}>{fileKind}</div>
                </div>

                <div style={{ ...modal.originalGrid, gridTemplateColumns: isNarrow ? "1fr" : "300px 1fr" }}>
                  <div style={modal.originalSide}>
                    <div style={modal.originalInfoCard}>
                      <div style={modal.originalInfoTitle}>معلومات الملف</div>
                      <div style={modal.originalFileName}>{file.name}</div>
                      <div style={modal.originalStatsGrid}>
                        <div style={modal.originalStatItem}>
                          <div style={modal.originalStatValue}>{sourceChars.toLocaleString()}</div>
                          <div style={modal.originalStatLabel}>حرف</div>
                        </div>
                        <div style={modal.originalStatItem}>
                          <div style={modal.originalStatValue}>{sourceWords.toLocaleString()}</div>
                          <div style={modal.originalStatLabel}>كلمة</div>
                        </div>
                        <div style={modal.originalStatItem}>
                          <div style={modal.originalStatValue}>{sourceLines.toLocaleString()}</div>
                          <div style={modal.originalStatLabel}>سطر</div>
                        </div>
                      </div>
                    </div>

                    <div style={modal.originalTipCard}>
                      <div style={modal.originalTipTitle}>تدفق العمل</div>
                      <div style={modal.originalTipText}>1) راجع النص الأصلي سريعًا</div>
                      <div style={modal.originalTipText}>2) اضغط زر الترجمة إلى العربية</div>
                      <div style={modal.originalTipText}>3) اختر عناصر الإثراء ثم أنشئ الدرس</div>
                    </div>
                  </div>

                  <div style={modal.originalMain}>
                    <div style={modal.translationHeaderRow}>
                      <div style={modal.translationHeading}>معاينة النص الأصلي</div>
                      <div style={modal.translationMeta}>جاهز للترجمة</div>
                    </div>
                    <pre style={{ ...modal.textBox, ...modal.originalTextBox }}>{extractedText}</pre>
                  </div>
                </div>
              </div>)}

          {tab === "arabic" && translatedText && (
            <div style={modal.workspaceWrap}>
              <div style={modal.workspaceHero}>
                <div style={modal.workspaceHeroIcon}>🎯</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={modal.workspaceTitle}>استوديو الترجمة والإثراء</div>
                  <div style={modal.workspaceSub}>راجع النص المترجم على اليسار، واختر عناصر الإثراء من اللوحة اليمنى قبل إنشاء الدرس.</div>
                </div>
                <div style={modal.workspaceBadge}>{Object.values(enrichOpts).filter(Boolean).length} خيارات مفعّلة</div>
              </div>

              <div
                style={{
                  ...modal.workspaceGrid,
                  gridTemplateColumns: isNarrow ? "1fr" : "320px 1fr",
                }}
              >
                <div style={modal.workspaceSide}>
                  {!lessonData && <EnrichPanel options={enrichOpts} onChange={setEnrichOpts} compact />}
                  <div style={modal.workspaceTipCard}>
                    <div style={modal.workspaceTipTitle}>اقتراح سريع</div>
                    <div style={modal.workspaceTipText}>لأفضل تجربة تعليمية: فعّل الصور + المحاكاة + خريطة المفاهيم، ثم اضغط على إنشاء درس مُثرى.</div>
                  </div>
                </div>

                <div style={modal.workspaceMain}>
                  <div style={modal.translationHeaderRow}>
                    <div style={modal.translationHeading}>النص المترجم</div>
                    <div style={modal.translationMeta}>{translatedText.length.toLocaleString()} حرف</div>
                  </div>
                  <pre style={{ ...modal.textBox, ...modal.translationTextBox }}>{translatedText}</pre>
                </div>
              </div>
            </div>
          )}

          {tab === "lesson" && lessonData?.fallback && (
            <div style={{ margin: "0 24px 20px", background: "#fff7ed", border: "1px solid #fdba74", color: "#9a3412", borderRadius: "12px", padding: "12px 14px", fontSize: "13px", lineHeight: 1.8 }}>
              {buildFallbackNotice(lessonData)}
            </div>
          )}
          {tab === "lesson" && lessonData && <LessonPage lessonData={lessonData} contentBlocks={contentBlocks} setContentBlocks={handleContentBlocksChange} onContentBlocksChange={handleContentBlocksChange} />}
        </div>
        <div style={modal.footer}>
          {tab === "original" && !translatedText && (
            <button style={{ ...modal.actionBtn, ...(translating || loading ? modal.btnDisabled : {}) }}
              onClick={handleTranslate} disabled={translating || loading || !extractedText}>
              {translating ? <><Spinner small /> جارٍ الترجمة...</> : "🌐 ترجمة إلى العربية"}
            </button>
          )}
          {tab === "original" && translatedText && (
            <button style={{ ...modal.actionBtn, background: "#059669" }} onClick={() => setTab("arabic")}>عرض الترجمة ←</button>
          )}
          {tab === "arabic" && translatedText && !lessonData && (
            <button style={{ ...modal.actionBtn, background: "#7c3aed", ...(generating ? modal.btnDisabled : {}) }}
              onClick={handleGenerateLesson} disabled={generating}>
              {generating
                ? <><Spinner small /> {genStatus || "جارٍ الإنشاء..."}</>
                : anyEnrich
                  ? `🎓 إنشاء درس مُثرى (${[enrichOpts.images && "صور", enrichOpts.video && "فيديو", enrichOpts.simulation && "محاكاة", enrichOpts.conceptMap && "خريطة"].filter(Boolean).join(" + ")})`
                  : "🎓 إنشاء درس + اختبار"}
            </button>
          )}
          {tab === "lesson" && lessonData && (
            <>
              <button style={{ ...modal.actionBtn, background: "#7c3aed" }} onClick={handleGenerateLesson} disabled={generating}>
                {generating ? <><Spinner small /> {genStatus}</> : "🔄 إعادة الإنشاء"}
              </button>
              <button style={{ ...modal.actionBtn, background: "#0f766e", ...(downloading ? modal.btnDisabled : {}) }}
                onClick={handleDownloadSCORM} disabled={downloading}>
                {downloading ? <><Spinner small /> جارٍ التحميل...</> : "📦 تحميل SCORM"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stats Card ─────────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "20px 24px", display: "flex", alignItems: "center", gap: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: `1px solid ${color}22` }}>
      <div style={{ width: "52px", height: "52px", borderRadius: "14px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "26px", flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: "28px", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>{label}</div>
      </div>
    </div>
  );
}

// ── Feature Card ───────────────────────────────────────────────────────────
function FeatureCard({ icon, title, desc, color, badge }) {
  return (
    <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e8eaf6", position: "relative", overflow: "hidden" }}>
      {badge && <div style={{ position: "absolute", top: "14px", left: "14px", background: "#fef3c7", color: "#92400e", borderRadius: "8px", padding: "2px 10px", fontSize: "11px", fontWeight: 700 }}>{badge}</div>}
      <div style={{ width: "48px", height: "48px", borderRadius: "14px", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "14px" }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a237e", marginBottom: "8px" }}>{title}</div>
      <div style={{ fontSize: "13px", color: "#666", lineHeight: 1.7 }}>{desc}</div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(null);
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeFile, setActiveFile] = useState(null);
  const inputRef = useRef();

  const fetchFiles = async () => {
    try {
      const res = await fetch("/files");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل تحميل الملفات");
      setFiles(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "تعذّر تحميل الملفات");
    }
  };

  useEffect(() => { fetchFiles(); }, []);

  const uploadFile = async (file) => {
    setError(""); setSuccess("");
    const allowed = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) { setError("يُقبل فقط ملفات PDF و DOCX."); return; }
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);
    try {
      const res = await fetch("/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل الرفع");
      setSuccess(`تم رفع "${data.file.name}" بنجاح.`);
      fetchFiles();
    } catch (err) { setError(err.message || "خطأ في رفع الملف"); }
    finally { setUploading(false); }
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  const handleDelete = async (key) => {
    setError("");
    try {
      const res = await fetch(`/files/${encodeURIComponent(key)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.key !== key));
    } catch (err) { setError(err.message); }
  };

  if (!user) {
    return <LoginPage onLogin={setUser} />;
  }

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        @keyframes pulse { 0%,100%{transform:scale(1);} 50%{transform:scale(1.04);} }
        @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-8px);} }
        * { box-sizing: border-box; }
        body { margin: 0; }
        .file-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(26,35,126,0.12) !important; }
        .open-btn:hover { transform: scale(1.04); }
        .step-item:hover { background: rgba(255,255,255,0.18) !important; transform: translateY(-3px); }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 8px 28px rgba(0,0,0,0.1) !important; }
      `}</style>

      {/* ══ NAVBAR ══ */}
      <nav style={st.nav}>
        <div style={st.navInner}>
          <div style={st.navLogo}>
            <div style={st.navLogoIcon}>🎓</div>
            <div>
              <div style={st.navLogoTitle}>الكلية التطبيقية · جامعة القصيم</div>
              <div style={st.navLogoSub}>EduAI · منصة الدروس التفاعلية</div>
            </div>
          </div>
          <div style={st.navBadge}>🏆 هاكاثون 2026</div>
        </div>
      </nav>

      {/* ══ HERO ══ */}
      <div style={st.hero}>
        {/* animated blobs */}
        <div style={{ ...st.blob, top: "-80px", right: "-80px", width: "400px", height: "400px", background: "rgba(124,58,237,0.25)" }} />
        <div style={{ ...st.blob, bottom: "-60px", left: "-60px", width: "300px", height: "300px", background: "rgba(59,130,246,0.2)" }} />
        <div style={{ ...st.blob, top: "40%", left: "40%", width: "200px", height: "200px", background: "rgba(16,185,129,0.15)" }} />

        <div style={st.heroInner}>
          {/* Left: text */}
          <div style={st.heroText}>
            <div style={st.heroPill}>🤖 مدعوم بـ AWS Bedrock · Claude AI</div>
            <h1 style={st.heroH1}>
              تحويل المحتوى التعليمي<br />
              <span style={st.heroAccent}>إلى دروس تفاعلية متميزة</span>
            </h1>
            <p style={st.heroDesc}>
              ارفع أي ملف PDF أو DOCX، يترجمه النظام فوراً ويحوّله إلى درس تفاعلي متكامل مع اختبارات وتصدير SCORM للبلاك بورد ألترا
            </p>
            <div style={st.heroBadges}>
              {["🌐 ترجمة فورية","📚 دروس ذكية","✏️ اختبارات تفاعلية","📦 SCORM","🧠 خريطة مفاهيم"].map(b => (
                <span key={b} style={st.heroBadge}>{b}</span>
              ))}
            </div>
          </div>

          {/* Right: upload box */}
          <div style={st.heroUpload}>
            <div style={st.uploadCard}>
              <div style={st.uploadCardHeader}>
                <span style={{ fontSize: "20px" }}>☁️</span>
                <span style={{ fontWeight: 700, fontSize: "15px", color: "#1a237e" }}>رفع المحتوى التعليمي</span>
              </div>
              <div
                style={{ ...st.dropzone, ...(dragging ? st.dropzoneActive : {}) }}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current.click()}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && inputRef.current.click()}
                aria-label="منطقة رفع الملفات">
                <input ref={inputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }}
                  onChange={(e) => e.target.files[0] && uploadFile(e.target.files[0])} />
                {uploading
                  ? <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "44px", height: "44px", border: "3px solid #ede9fe", borderTop: "3px solid #7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      <p style={{ color: "#7c3aed", fontWeight: 600, margin: 0 }}>جارٍ الرفع...</p>
                    </div>
                  : <>
                      <div style={{ fontSize: "52px", marginBottom: "10px", animation: "float 3s ease-in-out infinite" }}>📂</div>
                      <p style={{ color: "#444", fontSize: "15px", margin: "0 0 6px", fontWeight: 500 }}>اسحب الملف هنا أو <span style={{ color: "#7c3aed", fontWeight: 700, textDecoration: "underline" }}>تصفّح</span></p>
                      <p style={{ color: "#aaa", fontSize: "12px", margin: 0 }}>PDF أو DOCX · حتى 10 ميجابايت</p>
                    </>}
              </div>
              {error && <div style={st.alertErr}>{error}</div>}
              {success && <div style={st.alertOk}>{success}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS ══ */}
      <div style={st.statsBar}>
        <StatCard icon="📁" value={files.length} label="ملف مرفوع" color="#7c3aed" />
        <StatCard icon="🌐" value="AWS" label="Translate + Bedrock" color="#0ea5e9" />
        <StatCard icon="🎓" value="SCORM" label="متوافق مع Blackboard" color="#059669" />
        <StatCard icon="🤖" value="Claude" label="Haiku 4.5 AI" color="#d97706" />
      </div>

      {/* ══ MAIN CONTENT ══ */}
      <div style={st.main}>

        {/* Files */}
        <div style={st.section}>
          <div style={st.sectionHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={st.sectionIcon}>📁</div>
              <div>
                <h2 style={st.sectionTitle}>المحتوى التعليمي المرفوع</h2>
                <p style={st.sectionSub}>اضغط "فتح وتحليل" لبدء معالجة أي ملف</p>
              </div>
            </div>
            <span style={st.countBadge}>{files.length} ملف</span>
          </div>

          {files.length === 0
            ? <div style={st.empty}>
                <div style={{ fontSize: "64px", marginBottom: "16px", animation: "float 3s ease-in-out infinite" }}>🗂️</div>
                <p style={{ color: "#555", fontSize: "17px", fontWeight: 600, margin: "0 0 8px" }}>لا توجد ملفات بعد</p>
                <p style={{ color: "#aaa", fontSize: "14px", margin: 0 }}>ارفع ملفاً من الأعلى للبدء</p>
              </div>
            : <div style={st.fileGrid}>
                {files.map((f) => (
                  <div key={f.key} className="file-card" style={st.fileCard}>
                    <div style={{ display: "flex", alignItems: "center", gap: "14px", flex: 1, minWidth: 0 }}>
                      <div style={st.fileIconWrap}>{f.name.endsWith(".pdf") ? "📄" : "📝"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <a href={f.url} target="_blank" rel="noreferrer" style={st.fileName}>{f.name}</a>
                        <div style={st.fileMeta}>{formatSize(f.size)}{f.uploadedAt ? ` · ${formatDate(f.uploadedAt)}` : ""}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                      <button className="open-btn" style={st.openBtn} onClick={() => setActiveFile(f)}>🎓 فتح وتحليل</button>
                      <button style={st.delBtn} onClick={() => handleDelete(f.key)}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>}
        </div>

        {/* How it works */}
        <div style={st.howCard}>
          <div style={st.howHeader}>
            <h3 style={st.howTitle}>⚡ كيف يعمل النظام؟</h3>
            <p style={st.howSub}>أربع خطوات تحوّل أي محتوى إلى تجربة تعليمية متكاملة</p>
          </div>
          <div style={st.stepsGrid}>
            {[
              { icon: "📤", n: "1", title: "رفع الملف", desc: "PDF أو DOCX من جهازك أو بالسحب والإفلات", color: "#7c3aed" },
              { icon: "🌐", n: "2", title: "الترجمة الذكية", desc: "AWS Translate يترجم المحتوى للعربية فورياً", color: "#0ea5e9" },
              { icon: "🤖", n: "3", title: "توليد الدرس", desc: "Claude AI يبني درساً كاملاً مع أهداف وأقسام واختبار", color: "#059669" },
              { icon: "📦", n: "4", title: "تصدير SCORM", desc: "حزمة جاهزة للرفع على Blackboard Ultra", color: "#d97706" },
            ].map((s) => (
              <div key={s.n} className="step-item" style={{ ...st.stepItem, transition: "all 0.2s" }}>
                <div style={{ ...st.stepNum, background: s.color }}>{s.n}</div>
                <div style={{ fontSize: "36px", margin: "12px 0 10px" }}>{s.icon}</div>
                <div style={{ fontWeight: 700, fontSize: "15px", color: "#fff", marginBottom: "8px" }}>{s.title}</div>
                <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: 1.6 }}>{s.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Features - Educational Value */}
        <div style={st.section}>
          <div style={st.sectionHeader}>
            <div>
              <h2 style={st.sectionTitle}>🏆 المزايا التعليمية</h2>
            </div>
          </div>
          <div style={st.featGrid}>
            {[
              { icon: "🧠", title: "خريطة المفاهيم", desc: "يستخرج الذكاء الاصطناعي العلاقات بين المفاهيم ويعرضها بصرياً لتعزيز الفهم العميق", color: "#7c3aed", badge: "جديد" },
              { icon: "🎯", title: "أهداف تعليمية ذكية", desc: "يولّد أهدافاً وفق تصنيف بلوم التعليمي تلقائياً من محتوى الملف", color: "#0ea5e9" },
              { icon: "✏️", title: "اختبارات تكيّفية", desc: "أسئلة متعددة المستويات مع تغذية راجعة فورية وشرح لكل إجابة", color: "#059669" },
              { icon: "📦", title: "SCORM للبلاك بورد", desc: "تصدير مباشر بمعيار SCORM 1.2 متوافق مع Blackboard Ultra وجميع LMS", color: "#d97706" },
              { icon: "🌐", title: "ترجمة متعددة اللغات", desc: "دعم أكثر من 75 لغة عبر AWS Translate مع الحفاظ على السياق التعليمي", color: "#dc2626" },
              { icon: "☁️", title: "بنية سحابية متكاملة", desc: "AWS S3 للتخزين + Bedrock للذكاء الاصطناعي + Translate للترجمة في منظومة واحدة", color: "#6366f1" },
            ].map((f) => (
              <div key={f.title} className="feature-card" style={{ ...st.featCard, transition: "all 0.2s" }}>
                {f.badge && <div style={st.featBadge}>{f.badge}</div>}
                <div style={{ ...st.featIcon, background: `${f.color}18` }}>{f.icon}</div>
                <div style={st.featTitle}>{f.title}</div>
                <div style={st.featDesc}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* ══ FOOTER ══ */}
      <footer style={st.footer}>
        <div style={st.footerInner}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "24px" }}>🎓</span>
            <div>
              <div style={{ fontWeight: 700, color: "#fff", fontSize: "14px" }}>جامعة القصيم · الكلية التطبيقية</div>
              <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "12px" }}>توظيف الذكاء الاصطناعي في التعليم</div>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px" }}>هاكاثون 2026 · مدعوم بـ AWS</div>
        </div>
      </footer>

      {activeFile && <TextModal file={activeFile} onClose={() => setActiveFile(null)} />}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const styles = { page: {} }; // legacy - kept for modal

const st = {
  // Navbar
  nav: { background: "rgba(13,27,110,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.08)", position: "sticky", top: 0, zIndex: 50 },
  navInner: { maxWidth: "1200px", margin: "0 auto", padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" },
  navLogo: { display: "flex", alignItems: "center", gap: "12px" },
  navLogoIcon: { width: "38px", height: "38px", background: "linear-gradient(135deg, #7c3aed, #3b82f6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" },
  navLogoTitle: { fontWeight: 800, fontSize: "19px", color: "#fff", fontFamily: "'Segoe UI', sans-serif" },
  navLogoSub: { fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: 400 },
  navBadge: { background: "linear-gradient(135deg, #d97706, #f59e0b)", color: "#fff", borderRadius: "20px", padding: "5px 14px", fontSize: "12px", fontWeight: 700 },

  // Hero
  hero: { position: "relative", background: "linear-gradient(135deg, #0a0f3d 0%, #0d1b6e 35%, #1e1065 65%, #2d1b69 100%)", padding: "72px 24px 80px", overflow: "hidden", direction: "rtl", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" },
  blob: { position: "absolute", borderRadius: "50%", filter: "blur(60px)", pointerEvents: "none", animation: "float 6s ease-in-out infinite" },
  heroInner: { position: "relative", maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 420px", gap: "48px", alignItems: "center" },
  heroText: { color: "#fff" },
  heroPill: { display: "inline-flex", alignItems: "center", gap: "6px", background: "rgba(124,58,237,0.3)", border: "1px solid rgba(124,58,237,0.5)", borderRadius: "20px", padding: "6px 16px", fontSize: "13px", color: "rgba(255,255,255,0.9)", marginBottom: "20px", backdropFilter: "blur(8px)" },
  heroH1: { fontSize: "clamp(24px, 3.5vw, 40px)", fontWeight: 900, lineHeight: 1.4, margin: "0 0 16px", color: "#fff" },
  heroAccent: { background: "linear-gradient(90deg, #a78bfa, #60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  heroDesc: { fontSize: "16px", lineHeight: 1.8, color: "rgba(255,255,255,0.7)", margin: "0 0 24px", maxWidth: "520px" },
  heroBadges: { display: "flex", gap: "8px", flexWrap: "wrap" },
  heroBadge: { background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", borderRadius: "20px", padding: "5px 14px", fontSize: "12px", fontWeight: 600, border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(4px)" },

  // Upload card in hero
  heroUpload: {},
  uploadCard: { background: "rgba(255,255,255,0.97)", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", backdropFilter: "blur(20px)" },
  uploadCardHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  dropzone: { border: "2px dashed #c4b5fd", borderRadius: "14px", padding: "36px 20px", textAlign: "center", cursor: "pointer", transition: "all 0.2s", background: "#faf5ff" },
  dropzoneActive: { borderColor: "#7c3aed", background: "#ede9fe", transform: "scale(1.01)" },
  alertErr: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginTop: "12px" },
  alertOk: { background: "#f0fff4", border: "1px solid #c6f6d5", color: "#276749", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginTop: "12px" },

  // Stats
  statsBar: { maxWidth: "1200px", margin: "-32px auto 0", padding: "0 24px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", position: "relative", zIndex: 10, direction: "rtl", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" },

  // Main
  page: { minHeight: "100vh", background: "#f0f4ff", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl" },
  main: { maxWidth: "1200px", margin: "0 auto", padding: "40px 24px", display: "flex", flexDirection: "column", gap: "32px", direction: "rtl", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" },

  // Section
  section: { background: "#fff", borderRadius: "20px", padding: "28px 32px", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" },
  sectionHeader: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "24px" },
  sectionIcon: { width: "44px", height: "44px", background: "#ede9fe", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", flexShrink: 0 },
  sectionTitle: { margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#1a237e" },
  sectionSub: { margin: 0, fontSize: "13px", color: "#888" },
  countBadge: { background: "#ede9fe", color: "#7c3aed", borderRadius: "20px", padding: "5px 16px", fontSize: "13px", fontWeight: 700, flexShrink: 0 },

  // Files
  empty: { textAlign: "center", padding: "48px 0" },
  fileGrid: { display: "flex", flexDirection: "column", gap: "12px" },
  fileCard: { background: "#f8f9ff", border: "1px solid #e8eaf6", borderRadius: "14px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "14px", flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.04)", transition: "all 0.2s" },
  fileIconWrap: { width: "44px", height: "44px", background: "#e8eaf6", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 },
  fileName: { display: "block", fontWeight: 600, fontSize: "14px", color: "#1a237e", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: "3px" },
  fileMeta: { fontSize: "12px", color: "#999" },
  openBtn: { background: "linear-gradient(135deg, #1a237e, #7c3aed)", color: "#fff", border: "none", borderRadius: "10px", padding: "9px 18px", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "transform 0.15s" },
  delBtn: { background: "#fee2e2", border: "none", cursor: "pointer", fontSize: "16px", padding: "9px 12px", borderRadius: "10px", color: "#dc2626" },

  // How it works
  howCard: { background: "linear-gradient(135deg, #0a0f3d, #0d1b6e, #1e1065)", borderRadius: "20px", padding: "36px 32px", color: "#fff" },
  howHeader: { textAlign: "center", marginBottom: "32px" },
  howTitle: { margin: "0 0 8px", fontSize: "22px", fontWeight: 800 },
  howSub: { margin: 0, color: "rgba(255,255,255,0.6)", fontSize: "14px" },
  stepsGrid: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" },
  stepItem: { background: "rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px 18px", textAlign: "center", border: "1px solid rgba(255,255,255,0.12)", backdropFilter: "blur(8px)" },
  stepNum: { width: "32px", height: "32px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#fff", margin: "0 auto" },

  // Features
  featGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" },
  featCard: { background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e8eaf6", position: "relative", overflow: "hidden" },
  featBadge: { position: "absolute", top: "14px", left: "14px", background: "#fef3c7", color: "#92400e", borderRadius: "8px", padding: "2px 10px", fontSize: "11px", fontWeight: 700 },
  featIcon: { width: "48px", height: "48px", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", marginBottom: "14px" },
  featTitle: { fontWeight: 700, fontSize: "15px", color: "#1a237e", marginBottom: "8px" },
  featDesc: { fontSize: "13px", color: "#666", lineHeight: 1.7 },

  // Footer
  footer: { background: "#0a0f3d", borderTop: "1px solid rgba(255,255,255,0.06)" },
  footerInner: { maxWidth: "1200px", margin: "0 auto", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", direction: "rtl", fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif" },
};

const modal = {
  overlay: { position: "fixed", inset: 0, background: "rgba(10,10,30,0.75)", display: "flex", alignItems: "stretch", justifyContent: "stretch", zIndex: 100, padding: 0 },
  box: { background: "#f0f4ff", width: "100%", height: "100%", display: "flex", flexDirection: "column" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", background: "linear-gradient(135deg, #0d1b6e, #1a237e, #7c3aed)", flexShrink: 0 },
  headerLeft: { display: "flex", alignItems: "center", gap: "12px", minWidth: 0 },
  projectName: { fontSize: "11px", color: "rgba(255,255,255,0.78)", fontWeight: 700, marginBottom: "3px", letterSpacing: "0.2px" },
  headerTitle: { fontWeight: 700, fontSize: "16px", color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  closeBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", fontSize: "16px", cursor: "pointer", color: "#fff", borderRadius: "8px", padding: "6px 14px", flexShrink: 0, fontWeight: 600 },
  tabs: { display: "flex", gap: "0", padding: "0 28px", borderBottom: "2px solid #e8eaf6", background: "#fff", flexShrink: 0 },
  tab: { background: "none", border: "none", padding: "14px 22px", fontSize: "14px", fontWeight: 500, color: "#888", cursor: "pointer", borderBottom: "3px solid transparent", marginBottom: "-2px" },
  tabActive: { color: "#7c3aed", borderBottom: "3px solid #7c3aed", fontWeight: 700 },
  body: { flex: 1, overflow: "auto", padding: "28px 32px" },
  textBox: { margin: "0 auto", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "14px", lineHeight: 1.8, color: "#333", background: "#fff", border: "1px solid #e8eaf6", borderRadius: "12px", padding: "24px", fontFamily: "inherit", maxWidth: "900px" },
  workspaceWrap: { maxWidth: "1160px", margin: "0 auto" },
  originalHero: { background: "linear-gradient(120deg, #ffffff 0%, #f7f7ff 100%)", border: "1px solid #e4e6ff", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  originalHeroIcon: { width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #0f766e, #14b8a6)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#fff", flexShrink: 0 },
  originalHeroTitle: { color: "#0f172a", fontSize: "15px", fontWeight: 800, marginBottom: "3px" },
  originalHeroSub: { color: "#64748b", fontSize: "12px", lineHeight: 1.7 },
  originalFileType: { background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "#fff", borderRadius: "999px", padding: "6px 12px", fontSize: "12px", fontWeight: 800, letterSpacing: "0.5px", flexShrink: 0 },
  originalGrid: { display: "grid", gap: "14px", alignItems: "start" },
  originalSide: { display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "10px" },
  originalInfoCard: { background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "14px", padding: "14px" },
  originalInfoTitle: { color: "#1e293b", fontSize: "12px", fontWeight: 800, marginBottom: "8px" },
  originalFileName: { color: "#475569", fontSize: "12px", lineHeight: 1.8, marginBottom: "10px", wordBreak: "break-word" },
  originalStatsGrid: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "8px" },
  originalStatItem: { background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 6px", textAlign: "center" },
  originalStatValue: { color: "#0f172a", fontSize: "13px", fontWeight: 800, lineHeight: 1.2 },
  originalStatLabel: { color: "#64748b", fontSize: "11px", marginTop: "3px" },
  originalTipCard: { background: "#ecfeff", border: "1px solid #a5f3fc", borderRadius: "12px", padding: "12px 14px" },
  originalTipTitle: { color: "#155e75", fontSize: "12px", fontWeight: 800, marginBottom: "6px" },
  originalTipText: { color: "#0e7490", fontSize: "12px", lineHeight: 1.8 },
  originalMain: { background: "#fff", borderRadius: "16px", border: "1px solid #e8eaf6", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", padding: "14px" },
  originalTextBox: { maxWidth: "none", margin: 0, minHeight: "420px", background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)", borderColor: "#e5e7eb", borderRadius: "14px" },
  workspaceHero: { background: "linear-gradient(120deg, #ffffff 0%, #f7f8ff 100%)", border: "1px solid #e6e8ff", borderRadius: "16px", padding: "14px 16px", display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" },
  workspaceHeroIcon: { width: "40px", height: "40px", borderRadius: "12px", background: "linear-gradient(135deg, #1a237e, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", color: "#fff", flexShrink: 0 },
  workspaceTitle: { fontSize: "15px", fontWeight: 800, color: "#1a237e", marginBottom: "2px" },
  workspaceSub: { fontSize: "12px", color: "#64748b", lineHeight: 1.7 },
  workspaceBadge: { background: "linear-gradient(135deg, #0ea5e9, #0284c7)", color: "#fff", borderRadius: "999px", padding: "6px 12px", fontSize: "12px", fontWeight: 700, flexShrink: 0 },
  workspaceGrid: { display: "grid", gap: "14px", alignItems: "start" },
  workspaceSide: { display: "flex", flexDirection: "column", gap: "12px", position: "sticky", top: "10px" },
  workspaceMain: { background: "#fff", borderRadius: "16px", border: "1px solid #e8eaf6", boxShadow: "0 2px 12px rgba(15,23,42,0.06)", padding: "14px" },
  translationHeaderRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px", padding: "2px 4px" },
  translationHeading: { color: "#1a237e", fontSize: "14px", fontWeight: 800 },
  translationMeta: { color: "#64748b", fontSize: "12px", fontWeight: 600 },
  translationTextBox: { maxWidth: "none", margin: 0, minHeight: "380px", background: "linear-gradient(180deg, #ffffff 0%, #fbfcff 100%)", borderColor: "#e5e7eb", borderRadius: "14px" },
  workspaceTipCard: { background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "12px", padding: "12px 14px" },
  workspaceTipTitle: { color: "#075985", fontSize: "12px", fontWeight: 800, marginBottom: "4px" },
  workspaceTipText: { color: "#0369a1", fontSize: "12px", lineHeight: 1.7 },
  centered: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px", minHeight: "200px" },
  error: { background: "#fff5f5", border: "1px solid #fed7d7", color: "#c53030", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", maxWidth: "900px", margin: "0 auto 16px" },
  footer: { padding: "16px 28px", borderTop: "2px solid #e8eaf6", display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap", background: "#fff", flexShrink: 0 },
  actionBtn: { background: "#1a237e", color: "#fff", border: "none", borderRadius: "10px", padding: "11px 22px", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" },
  btnDisabled: { opacity: 0.6, cursor: "not-allowed" },
};
