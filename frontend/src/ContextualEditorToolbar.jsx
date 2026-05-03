import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildLessonContextPayload, requestContextualGeneration, requestMediaProviderStatus, toEmbedUrl, blockTitle } from "./contextualGeneration";

const TOOLBAR_BUTTONS = [
  { id: "improve", icon: "✨", label: "تحرير AI", tone: "#6d28d9" },
  { id: "image", icon: "🖼️", label: "صور", tone: "#059669" },
  { id: "video", icon: "🎬", label: "فيديو", tone: "#ea580c" },
  { id: "chart", icon: "📊", label: "مخططات", tone: "#2563eb" },
  { id: "heading", icon: "📌", label: "عنوان", tone: "#0f766e" },
  { id: "text", icon: "📝", label: "نص", tone: "#0284c7" },
  { id: "quiz", icon: "❔", label: "اختبار", tone: "#dc2626" },
  { id: "divider", icon: "─", label: "فاصل", tone: "#64748b" },
  { id: "reorder", icon: "↕", label: "ترتيب", tone: "#0f766e" },
  { id: "help", icon: "❓", label: "السياق", tone: "#4f46e5" },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');

  .ctx-toolbar {
    position: fixed;
    inset-inline: 0;
    bottom: 22px;
    display: flex;
    justify-content: center;
    pointer-events: none;
    z-index: 9998;
    font-family: 'Cairo', sans-serif;
  }

  .ctx-toolbar-shell {
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.72);
    backdrop-filter: blur(22px);
    border: 1px solid rgba(255,255,255,0.14);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.28);
    max-width: calc(100vw - 28px);
    overflow-x: auto;
  }

  .ctx-toolbar-button {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #fff;
    background: rgba(255,255,255,0.08);
    transition: transform .18s ease, box-shadow .18s ease, background .18s ease;
    position: relative;
    flex: 0 0 auto;
  }

  .ctx-toolbar-button:hover {
    transform: translateY(-3px) scale(1.04);
    background: rgba(255,255,255,0.16);
    box-shadow: 0 10px 20px rgba(15,23,42,.22);
  }

  .ctx-toolbar-tooltip {
    position: absolute;
    bottom: calc(100% + 8px);
    inset-inline-start: 50%;
    transform: translateX(-50%);
    background: rgba(15,23,42,.96);
    color: #fff;
    padding: 6px 10px;
    border-radius: 10px;
    font-size: 12px;
    white-space: nowrap;
    opacity: 0;
    pointer-events: none;
    transition: opacity .16s ease, transform .16s ease;
  }

  .ctx-toolbar-button:hover .ctx-toolbar-tooltip {
    opacity: 1;
    transform: translateX(-50%) translateY(-3px);
  }

  .ctx-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.48);
    backdrop-filter: blur(8px);
    z-index: 10000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px;
    direction: rtl;
  }

  .ctx-modal {
    width: min(1180px, 100%);
    max-height: calc(100vh - 36px);
    overflow: auto;
    background: #ffffff;
    border-radius: 28px;
    box-shadow: 0 30px 80px rgba(15, 23, 42, 0.22);
    border: 1px solid #e2e8f0;
  }

  .ctx-modal-body {
    padding: 28px;
  }

  .ctx-header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    margin-bottom: 20px;
  }

  .ctx-title {
    font-size: 28px;
    font-weight: 800;
    color: #1e1b4b;
    margin: 0;
  }

  .ctx-subtitle {
    margin: 8px 0 0;
    color: #64748b;
    font-size: 14px;
    line-height: 1.8;
  }

  .ctx-close {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: none;
    background: #f1f5f9;
    color: #334155;
    cursor: pointer;
    flex: 0 0 auto;
    font-size: 18px;
  }

  .ctx-banner {
    display: grid;
    grid-template-columns: 1.3fr .7fr;
    gap: 18px;
    margin-bottom: 22px;
  }

  .ctx-card {
    background: linear-gradient(180deg, #ffffff, #fbfbff);
    border: 1px solid #e2e8f0;
    border-radius: 22px;
    padding: 18px;
  }

  .ctx-banner-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .ctx-stat {
    background: #f8fafc;
    border-radius: 16px;
    padding: 12px 14px;
  }

  .ctx-stat-label {
    color: #64748b;
    font-size: 12px;
    margin-bottom: 6px;
  }

  .ctx-stat-value {
    color: #0f172a;
    font-size: 15px;
    font-weight: 700;
  }

  .ctx-chip-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .ctx-chip {
    border-radius: 999px;
    border: 1px solid #dbeafe;
    background: #eff6ff;
    color: #1d4ed8;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
  }

  .ctx-segmented {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 14px;
  }

  .ctx-segmented button {
    border: 1px solid #e2e8f0;
    background: #fff;
    color: #334155;
    padding: 10px 14px;
    border-radius: 14px;
    cursor: pointer;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
  }

  .ctx-segmented button.active {
    background: #ede9fe;
    color: #5b21b6;
    border-color: #c4b5fd;
  }

  .ctx-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 360px;
    gap: 18px;
  }

  .ctx-input,
  .ctx-select,
  .ctx-textarea {
    width: 100%;
    border: 1px solid #dbe3ef;
    border-radius: 16px;
    padding: 13px 15px;
    font: inherit;
    font-size: 14px;
    color: #0f172a;
    background: #fff;
    box-sizing: border-box;
  }

  .ctx-textarea {
    min-height: 120px;
    resize: vertical;
    line-height: 1.8;
  }

  .ctx-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 14px;
  }

  .ctx-media-card {
    border-radius: 20px;
    border: 1px solid #e2e8f0;
    overflow: hidden;
    background: #fff;
    cursor: pointer;
    transition: transform .16s ease, box-shadow .16s ease, border-color .16s ease;
  }

  .ctx-media-card:hover,
  .ctx-media-card.selected {
    transform: translateY(-2px);
    border-color: #8b5cf6;
    box-shadow: 0 18px 30px rgba(99,102,241,.14);
  }

  .ctx-thumb {
    width: 100%;
    aspect-ratio: 16 / 10;
    object-fit: cover;
    display: block;
    background: linear-gradient(135deg, #ede9fe, #dbeafe);
  }

  .ctx-media-copy {
    padding: 12px 14px 14px;
  }

  .ctx-media-title {
    margin: 0 0 6px;
    font-size: 14px;
    color: #1e1b4b;
    font-weight: 800;
    line-height: 1.7;
  }

  .ctx-media-caption {
    margin: 0;
    color: #64748b;
    font-size: 12px;
    line-height: 1.8;
  }

  .ctx-preview {
    position: sticky;
    top: 18px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .ctx-preview-stage {
    min-height: 240px;
    border-radius: 20px;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    background: linear-gradient(180deg, #f8fafc, #fff);
  }

  .ctx-preview-stage img,
  .ctx-preview-stage iframe,
  .ctx-preview-stage video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    min-height: 240px;
    border: none;
  }

  .ctx-preview-stage svg {
    width: 100%;
    height: auto;
    display: block;
  }

  .ctx-preview-empty {
    display: flex;
    min-height: 240px;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 24px;
    color: #64748b;
    line-height: 1.9;
    font-size: 14px;
  }

  .ctx-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
  }

  .ctx-button {
    border: none;
    border-radius: 16px;
    padding: 12px 16px;
    font: inherit;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
  }

  .ctx-button.primary {
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    color: #fff;
    flex: 1;
  }

  .ctx-button.secondary {
    background: #f8fafc;
    color: #334155;
    border: 1px solid #e2e8f0;
  }

  .ctx-button.success {
    background: linear-gradient(135deg, #10b981, #059669);
    color: #fff;
    flex: 1;
  }

  .ctx-button.warning {
    background: linear-gradient(135deg, #f59e0b, #ea580c);
    color: #fff;
    flex: 1;
  }

  .ctx-upload {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 160px;
    border: 1.5px dashed #cbd5e1;
    border-radius: 18px;
    background: #f8fafc;
    color: #475569;
    text-align: center;
    padding: 18px;
    cursor: pointer;
  }

  .ctx-skeleton {
    height: 230px;
    border-radius: 20px;
    background: linear-gradient(90deg, #eef2ff 0%, #f8fafc 50%, #eef2ff 100%);
    background-size: 200% 100%;
    animation: shimmer 1.2s linear infinite;
  }

  .ctx-inline-note {
    color: #64748b;
    font-size: 12px;
    line-height: 1.8;
  }

  @keyframes shimmer {
    from { background-position: 200% 0; }
    to { background-position: -200% 0; }
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @media (max-width: 960px) {
    .ctx-banner,
    .ctx-layout {
      grid-template-columns: 1fr;
    }

    .ctx-preview {
      position: static;
    }
  }

  @media (max-width: 640px) {
    .ctx-modal-body {
      padding: 20px;
    }

    .ctx-title {
      font-size: 24px;
    }

    .ctx-banner-grid {
      grid-template-columns: 1fr;
    }

    .ctx-grid {
      grid-template-columns: 1fr;
    }
  }
`;

function getPreviewLabel(item) {
  if (!item) return "";
  return item.caption || item.title || item.query || "معاينة";
}

function fallbackImageData(label = "Media") {
  const text = encodeURIComponent(label.slice(0, 32));
  return `https://dummyimage.com/960x540/e2e8f0/334155.png&text=${text}`;
}

function getSourceBadge(item) {
  if (!item?.providerLabel) return null;
  if (item.searchMode === "live") {
    return { text: `${item.providerLabel} · Live`, color: "#065f46", background: "#d1fae5" };
  }
  if (item.searchMode === "fallback") {
    return { text: `${item.providerLabel} · Fallback`, color: "#92400e", background: "#fef3c7" };
  }
  return { text: item.providerLabel, color: "#4338ca", background: "#ede9fe" };
}

function isDirectVideoFile(url = "") {
  return /\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.startsWith("blob:") || url.startsWith("data:video");
}

function ModalShell({ title, subtitle, lessonContext, blocks, onClose, children }) {
  const contextChips = useMemo(() => {
    return (lessonContext.keyTerms || []).slice(0, 5).map((term) => term.term || term).filter(Boolean);
  }, [lessonContext]);

  return (
    <div className="ctx-modal-overlay" onClick={onClose}>
      <div className="ctx-modal" onClick={(event) => event.stopPropagation()}>
        <div className="ctx-modal-body">
          <div className="ctx-header">
            <div>
              <h2 className="ctx-title">{title}</h2>
              <p className="ctx-subtitle">{subtitle}</p>
            </div>
            <button className="ctx-close" onClick={onClose} aria-label="إغلاق">✕</button>
          </div>

          <div className="ctx-banner">
            <div className="ctx-card">
              <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 800, marginBottom: 8 }}>سياق التوليد الحالي</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>{lessonContext.title || "عنوان الدرس غير متوفر"}</div>
              <div className="ctx-inline-note">{lessonContext.summary || "سيستخدم المحرك عنوان الدرس والأقسام والمصطلحات وأي كتل مضافة حديثًا لاقتراح نتائج مرتبطة فقط بالمحتوى الحالي."}</div>
              {contextChips.length > 0 && <div className="ctx-chip-row" style={{ marginTop: 14 }}>{contextChips.map((chip) => <span key={chip} className="ctx-chip">{chip}</span>)}</div>}
            </div>
            <div className="ctx-banner-grid">
              <div className="ctx-stat">
                <div className="ctx-stat-label">الأقسام</div>
                <div className="ctx-stat-value">{lessonContext.sections?.length || 0}</div>
              </div>
              <div className="ctx-stat">
                <div className="ctx-stat-label">المصطلحات</div>
                <div className="ctx-stat-value">{lessonContext.keyTerms?.length || 0}</div>
              </div>
              <div className="ctx-stat">
                <div className="ctx-stat-label">الكتل المضافة</div>
                <div className="ctx-stat-value">{blocks.length}</div>
              </div>
            </div>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}

function LoadingGrid({ count = 4 }) {
  return <div className="ctx-grid">{Array.from({ length: count }).map((_, index) => <div key={index} className="ctx-skeleton" />)}</div>;
}

function PreviewPanel({ item, emptyLabel, onRegenerate, onInsert, onReset, accent = "primary" }) {
  const sourceBadge = getSourceBadge(item);
  return (
    <div className="ctx-preview">
      <div className="ctx-card">
        <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 800, marginBottom: 10 }}>المعاينة النهائية</div>
        <div className="ctx-preview-stage">
          {!item && <div className="ctx-preview-empty">{emptyLabel}</div>}
          {item?.svg && <div dangerouslySetInnerHTML={{ __html: item.svg }} />}
          {item?.url && item.type !== "video" && !item.svg && (
            <img
              src={item.url}
              alt={getPreviewLabel(item)}
              onError={(event) => {
                console.error("[PreviewPanel] image load failed:", item?.url);
                event.currentTarget.src = fallbackImageData(getPreviewLabel(item));
              }}
            />
          )}
          {item?.videoType === "file" && item.url && <video src={item.url} controls />}
          {!item?.videoType && item?.embedUrl && <iframe src={item.embedUrl} title={getPreviewLabel(item)} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />}
          {!item?.videoType && !item?.embedUrl && item?.url && item.type === "video" && <iframe src={toEmbedUrl(item.url)} title={getPreviewLabel(item)} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />}
        </div>
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>{item ? getPreviewLabel(item) : ""}</div>
          {item?.caption && <div className="ctx-inline-note">{item.caption}</div>}
          {item?.query && <div className="ctx-inline-note">بحث سياقي: {item.query}</div>}
          {sourceBadge && <div className="ctx-inline-note"><span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: sourceBadge.background, color: sourceBadge.color, fontWeight: 800 }}>{sourceBadge.text}</span></div>}
        </div>
      </div>
      <div className="ctx-actions">
        <button className="ctx-button secondary" onClick={onReset}>إلغاء</button>
        <button className="ctx-button secondary" onClick={onRegenerate}>إعادة التوليد</button>
        {item?.externalUrl && (
          <a className="ctx-button secondary" href={item.externalUrl} target="_blank" rel="noreferrer" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            فتح المصدر
          </a>
        )}
        <button className={`ctx-button ${accent}`} onClick={onInsert} disabled={!item}>تأكيد الإدراج</button>
      </div>
    </div>
  );
}

function ContextualTextModal({ lessonContext, blocks, onClose, onAdd, defaultMode = "generate" }) {
  const contextPayload = useMemo(() => buildLessonContextPayload(lessonContext, blocks), [lessonContext, blocks]);
  const [mode, setMode] = useState(defaultMode);
  const [instruction, setInstruction] = useState(lessonContext.title || "");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const modes = [
    ["generate", "توليد جديد"],
    ["rewrite", "إعادة صياغة"],
    ["expand", "توسيع"],
    ["summarize", "تلخيص"],
    ["simplify", "تبسيط"],
    ["examples", "أمثلة وشروح"],
  ];

  const run = async () => {
    if (!instruction.trim()) return;
    setLoading(true);
    setErrorMessage("");
    try {
      console.log("[ContextualTextModal] Request", { mode, instruction });
      const data = await requestContextualGeneration({
        kind: "text",
        lessonContext: contextPayload,
        instruction,
        mode,
      });
      console.log("[ContextualTextModal] Response", data);
      setPreview(data.preview);
    } catch (error) {
      setErrorMessage(error.message || "تعذر تنفيذ طلب توليد النص");
      setPreview({ title: "تعذر التوليد", content: error.message, rationale: "" });
    }
    setLoading(false);
  };

  useEffect(() => {
    if (instruction.trim()) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalShell
      title="مولد النصوص السياقي"
      subtitle="يستخدم عنوان الدرس والأقسام والمصطلحات الحالية لصياغة نصوص مرتبطة بالسياق فقط، مع معاينة كاملة قبل الإدراج."
      lessonContext={lessonContext}
      blocks={blocks}
      onClose={onClose}
    >
      <div className="ctx-layout">
        <div className="ctx-card">
          <div className="ctx-segmented">
            {modes.map(([value, label]) => (
              <button key={value} className={mode === value ? "active" : ""} onClick={() => setMode(value)}>{label}</button>
            ))}
          </div>
          <textarea className="ctx-textarea" value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="مثال: أنشئ شرحًا أكاديميًا يوضح الفرق بين مكونات الحاسب ووظيفة كل منها" />
          <div className="ctx-actions" style={{ marginTop: 12 }}>
            <button className="ctx-button primary" onClick={run} disabled={loading || !instruction.trim()}>{loading ? "جارٍ التوليد..." : "توليد المعاينة"}</button>
          </div>
          {errorMessage && <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{errorMessage}</div>}
          {preview && (
            <div className="ctx-card" style={{ marginTop: 16, background: "#f8fafc" }}>
              <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 800, marginBottom: 8 }}>نتيجة AI</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginBottom: 10 }}>{preview.title}</div>
              <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.9, color: "#334155", fontSize: 14 }}>{preview.content}</div>
              {preview.rationale && <div className="ctx-inline-note" style={{ marginTop: 12 }}>الملاءمة: {preview.rationale}</div>}
            </div>
          )}
        </div>
        <PreviewPanel
          item={preview ? { title: preview.title, caption: preview.rationale } : null}
          emptyLabel="اكتب توجيهًا واضحًا وسيتم إنشاء نص مرتبط مباشرة بمحتوى الدرس الحالي."
          onRegenerate={run}
          onReset={onClose}
          onInsert={() => preview && onAdd({ type: "text", title: preview.title, content: preview.content, meta: { mode } })}
        />
      </div>
    </ModalShell>
  );
}

function ImageAssetCard({ item, selected, onSelect }) {
  const [imgState, setImgState] = React.useState("loading"); // loading | loaded | failed | retrying
  const [retryCount, setRetryCount] = React.useState(0);
  const isAi = item.source === "ai" || item.searchMode === "pollinations";
  const retryTimerRef = React.useRef(null);

  // For Pollinations AI images: auto-retry up to 3 times with increasing delays
  // because the image is generated on-demand and may take 15-40 seconds
  const handleError = React.useCallback(() => {
    if (isAi && retryCount < 3) {
      setImgState("retrying");
      const delay = (retryCount + 1) * 8000; // 8s, 16s, 24s
      retryTimerRef.current = setTimeout(() => {
        setRetryCount(c => c + 1);
        setImgState("loading");
      }, delay);
    } else {
      setImgState("failed");
    }
  }, [isAi, retryCount]);

  React.useEffect(() => {
    return () => { if (retryTimerRef.current) clearTimeout(retryTimerRef.current); };
  }, []);

  // Force re-render of img src on retry by appending retry count as cache-buster
  const imgSrc = React.useMemo(() => {
    const base = item.url || item.thumbnailUrl || "";
    if (!isAi || retryCount === 0) return base;
    const sep = base.includes("?") ? "&" : "?";
    return `${base}${sep}_r=${retryCount}`;
  }, [item.url, item.thumbnailUrl, isAi, retryCount]);

  const isGenerating = isAi && (imgState === "loading" || imgState === "retrying");
  const generatingLabel = imgState === "retrying"
    ? `إعادة المحاولة ${retryCount}/3…`
    : "يتم التوليد…";

  return (
    <div
      className={`ctx-media-card${selected ? " selected" : ""}`}
      onClick={() => onSelect(item)}
      style={{ borderRadius: 14, overflow: "hidden", background: "#fff", border: `2px solid ${selected ? "#7c3aed" : "#e2e8f0"}`, cursor: "pointer", transition: "all .15s ease", boxShadow: selected ? "0 0 0 3px rgba(124,58,237,.2)" : "none" }}
    >
      {/* Thumbnail area */}
      <div style={{ position: "relative", aspectRatio: "16/10", overflow: "hidden", background: isAi ? "linear-gradient(135deg,#6d28d9,#4f46e5)" : "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {/* AI Generating spinner */}
        {isGenerating && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#fff", zIndex: 2 }}>
            <div style={{ width: 26, height: 26, border: "3px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: 11, fontWeight: 700 }}>{generatingLabel}</span>
            <span style={{ fontSize: 10, opacity: 0.75 }}>قد يستغرق 15–40 ثانية</span>
          </div>
        )}
        {/* AI truly failed after retries — show open link, NOT "تحتاج متصفح" */}
        {isAi && imgState === "failed" && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, color: "#fff", padding: 12, zIndex: 2, textAlign: "center" }}>
            <span style={{ fontSize: 28 }}>🎨</span>
            <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.6 }}>الصورة جاهزة<br/>افتح الرابط لعرضها</span>
            <a
              href={item.url} target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ padding: "6px 16px", background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.6)", color: "#fff", borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
            >🔗 عرض الصورة ↗</a>
          </div>
        )}
        {/* Stock failed */}
        {!isAi && imgState === "failed" && (
          <div style={{ fontSize: 28, opacity: 0.4 }}>🖼️</div>
        )}
        <img
          key={imgSrc}
          src={imgSrc}
          alt={item.title}
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: imgState === "loaded" ? 1 : 0, transition: "opacity 0.4s" }}
          onLoad={() => setImgState("loaded")}
          onError={handleError}
        />
        {/* Source badge */}
        <div style={{ position: "absolute", top: 6, right: 6, padding: "3px 8px", borderRadius: 6, fontSize: 10, fontWeight: 700, background: isAi ? "#7c3aed" : "rgba(0,0,0,0.55)", color: "#fff", zIndex: 3 }}>
          {isAi ? "⚡ AI" : (item.providerLabel || "Stock")}
        </div>
      </div>
      {/* Caption */}
      <div style={{ padding: "9px 12px 11px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#1e1b4b", lineHeight: 1.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {item.title || "صورة"}
        </div>
        {isAi && imgState === "failed" && (
          <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ display: "block", marginTop: 5, padding: "4px 0", color: "#7c3aed", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>
            🔗 عرض الصورة المولدة ↗
          </a>
        )}
      </div>
    </div>
  );
}

function ContextualImageModal({ lessonContext, blocks, onClose, onAdd }) {
  const contextPayload = useMemo(() => buildLessonContextPayload(lessonContext, blocks), [lessonContext, blocks]);

  // ── Central state ──────────────────────────────────────────────────────────
  const initialQuery = "";
  const [state, setState] = useState({
    query: initialQuery,
    activeTab: "stock",      // stock | ai | library | url | upload
    activeCategory: "photo", // photo | illustration | infographic
    mode: "search",
    results: [],
    loading: false,
    error: null,
    hasSearched: false,
  });

  // Derived aliases for readability
  const tab = state.activeTab;
  const category = state.activeCategory;
  const instruction = state.query;
  const items = state.results;
  const loading = state.loading;
  const errorMessage = state.error;
  const hasSearched = state.hasSearched;

  const [selected, setSelected] = useState(null);
  const [directUrl, setDirectUrl] = useState("");
  const inputRef = useRef(null);
  const imageLibrary = useMemo(() => blocks.filter((block) => block.type === "image"), [blocks]);

  // Focus input on mount only — search is triggered explicitly by the user
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setInstruction = (value) => setState(prev => ({ ...prev, query: value }));

  // Single SVG category to avoid duplicate low-quality outputs
  const SVG_CATEGORIES = ["infographic"];
  // Categories that always use AI image generation
  const AI_ONLY_CATEGORIES = ["illustration"];

  const doSearch = async (targetTab = tab, targetCategory = category, searchQuery = instruction) => {
    if (targetTab === "url" || targetTab === "upload" || targetTab === "library") return;
    if (!searchQuery.trim()) {
      setState(prev => ({ ...prev, error: "اكتب كلمة أو موضوعاً في حقل البحث أولاً" }));
      return;
    }
    setState(prev => ({ ...prev, loading: true, error: null, hasSearched: true }));
    try {
      // ── SVG route: infographic only ───────────────────────────────────────
      if (SVG_CATEGORIES.includes(targetCategory)) {
        const chartType = "infographic";
        const data = await requestContextualGeneration({
          kind: "chart",
          lessonContext: contextPayload,
          instruction: searchQuery,
          chartType,
        });
        const preview = data.preview;
        if (!preview?.svg) throw new Error("لم يتم توليد المخطط");
        const svgItem = {
          id: `svg-${targetCategory}-${Date.now()}`,
          title: preview.title || searchQuery,
          caption: preview.description || "",
          svg: preview.svg,
          source: "ai-svg",
          category: targetCategory,
        };
        setState(prev => ({ ...prev, loading: false, results: [svgItem], error: null }));
        setSelected(svgItem);
        return;
      }

      // ── AI illustration route ──────────────────────────────────────────────
      const forceAi = AI_ONLY_CATEGORIES.includes(targetCategory);
      const effectiveSource = forceAi ? "ai" : (targetTab === "ai" ? "ai" : "stock");

      // ── Standard image search ─────────────────────────────────────────────
      const data = await requestContextualGeneration({
        kind: "image",
        lessonContext: contextPayload,
        instruction: searchQuery,
        source: effectiveSource,
        category: targetCategory,
      });
      const nextItems = data.items || [];
      setState(prev => ({
        ...prev,
        loading: false,
        results: nextItems,
        error: nextItems.length ? null : `لا توجد نتائج لـ "${searchQuery}". جرّب كلمة أخرى.`,
      }));
      setSelected(nextItems[0] || null);
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        results: [],
        error: error.message || "تعذر تنفيذ طلب البحث",
      }));
      setSelected(null);
    }
  };

  const handleTabChange = (value) => {
    setState(prev => ({
      ...prev,
      activeTab: value,
      results: [],
      error: null,
      hasSearched: false,
    }));
    setSelected(null);
  };

  // Re-run search automatically when category changes and results already exist
  const handleCategoryChange = (value) => {
    setState(prev => ({ ...prev, activeCategory: value, results: [], hasSearched: false }));
    setSelected(null);
    if (instruction.trim()) {
      // Always re-run when changing category (SVG/AI/stock all need fresh results)
      doSearch(tab, value, instruction);
    }
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const uploaded = { id: `upload-${Date.now()}`, title: file.name, caption: "ملف من مكتبة المستخدم", url: reader.result, source: "upload" };
      setSelected(uploaded);
      setState(prev => ({ ...prev, activeTab: "upload" }));
    };
    reader.readAsDataURL(file);
  };

  const CATEGORIES = [["photo","📷 صورة"], ["illustration","🎨 رسم AI"], ["infographic","📋 إنفوجرافيك SVG"]];
  const isSearchTab = tab === "stock" || tab === "ai";

  return (
    <ModalShell
      title="🖼️ مستكشف الصور الذكي"
      subtitle="صورة = بحث ، إنفوجرافيك = SVG ذكي ، رسم = توليد AI — اكتب الموضوع واضغط توليد أو بحث"
      lessonContext={lessonContext}
      blocks={blocks}
      onClose={onClose}
    >
      <div className="ctx-layout">
        <div className="ctx-card">

          {/* ── Tabs ── */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {[["stock","🔍 Stock"], ["ai","⚡ AI توليد"], ["library","📚 مكتبتي"], ["url","🔗 رابط"], ["upload","⬆️ رفع"]].map(([value, label]) => (
              <button
                key={value}
                onClick={() => handleTabChange(value)}
                style={{
                  padding: "7px 14px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: "Cairo, Arial",
                  background: tab === value ? (value === "ai" ? "#6d28d9" : "#4f46e5") : "#f1f5f9",
                  color: tab === value ? "#fff" : "#475569",
                  transition: "all .15s"
                }}
              >{label}</button>
            ))}
          </div>

          {/* ── Info banners ── */}
          {SVG_CATEGORIES.includes(category) && (
            <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,#eff6ff,#ede9fe)", border: "1px solid #a5b4fc", fontSize: 12, fontWeight: 700, color: "#3730a3", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>📊</span>
              <span>سيُولَّد إنفوجرافيك تعليمي بصيغة SVG مرتبط بكلمة البحث — ليس صورة من الإنترنت.</span>
            </div>
          )}
          {AI_ONLY_CATEGORIES.includes(category) && (
            <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,#fdf4ff,#ede9fe)", border: "1px solid #d8b4fe", fontSize: 12, fontWeight: 700, color: "#6b21a8", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎨</span>
              <span>Pollinations AI يولّد رسماً توضيحياً من كلمتك — قد يستغرق 15–40 ثانية.</span>
            </div>
          )}
          {tab === "ai" && !SVG_CATEGORIES.includes(category) && !AI_ONLY_CATEGORIES.includes(category) && (
            <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, background: "linear-gradient(135deg,#ede9fe,#dbeafe)", border: "1px solid #c4b5fd", fontSize: 12, fontWeight: 700, color: "#5b21b6", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>⚡</span>
              <span>Pollinations AI يولّد صوراً حقيقية من كلمتك — تحتاج 15–40 ثانية للظهور. إذا ظهرت رمادية افتح الرابط ↗</span>
            </div>
          )}

          {/* ── Search area (stock & ai) ── */}
          {isSearchTab && (
            <>
              {/* Category pills */}
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {CATEGORIES.map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => handleCategoryChange(value)}
                    style={{ padding: "5px 12px", borderRadius: 16, border: `1.5px solid ${category === value ? "#7c3aed" : "#e2e8f0"}`, background: category === value ? "#ede9fe" : "#fff", color: category === value ? "#7c3aed" : "#64748b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "Cairo, Arial" }}
                  >{label}</button>
                ))}
              </div>

              {/* Search row */}
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input
                  ref={inputRef}
                  type="text"
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") doSearch(tab, category, instruction); }}
                  placeholder={
                    SVG_CATEGORIES.includes(category)
                      ? "مثال: وحدة المعالجة المركزية، دورة الماء، فوائد التكنولوجيا…"
                      : AI_ONLY_CATEGORIES.includes(category)
                      ? "مثال: شبكة عصبية، خلية حيوانية، جزيء ماء…"
                      : tab === "ai" ? "مثال: دورة دموية، طاقة شمسية، ذكاء اصطناعي..." : "مثال: قلب، كيمياء، هندسة..."
                  }
                  style={{ flex: 1, padding: "11px 14px", borderRadius: 12, border: "2px solid #e2e8f0", fontSize: 14, fontFamily: "Cairo, Arial", outline: "none", transition: "border .15s" }}
                  onFocus={e => e.target.style.borderColor = "#7c3aed"}
                  onBlur={e => e.target.style.borderColor = "#e2e8f0"}
                />
                <button
                  onClick={() => doSearch(tab, category, instruction)}
                  disabled={loading || !instruction.trim()}
                  style={{ padding: "11px 20px", borderRadius: 12, border: "none", background: loading ? "#a78bfa" : SVG_CATEGORIES.includes(category) ? "#2563eb" : AI_ONLY_CATEGORIES.includes(category) ? "#7c3aed" : tab === "ai" ? "#6d28d9" : "#4f46e5", color: "#fff", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", fontFamily: "Cairo, Arial", whiteSpace: "nowrap", minWidth: 110 }}
                >
                  {loading ? "⏳ جارٍ..."
                    : SVG_CATEGORIES.includes(category) ? "📊 توليد"
                    : AI_ONLY_CATEGORIES.includes(category) ? "🎨 توليد"
                    : tab === "ai" ? "⚡ توليد" : "🔍 بحث"}
                </button>
              </div>

              {/* Error */}
              {errorMessage && (
                <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>
                  ⚠️ {errorMessage}
                </div>
              )}

              {/* Empty state */}
              {!loading && !hasSearched && (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>
                    {SVG_CATEGORIES.includes(category) ? "📊" : AI_ONLY_CATEGORIES.includes(category) ? "🎨" : tab === "ai" ? "🎨" : "🔍"}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: "#64748b" }}>
                    {SVG_CATEGORIES.includes(category)
                      ? "ولّد إنفوجرافيك بالذكاء الاصطناعي"
                      : AI_ONLY_CATEGORIES.includes(category)
                      ? "ولّد رسماً توضيحياً بالذكاء الاصطناعي"
                      : tab === "ai" ? "ولّد صورة بالذكاء الاصطناعي" : "ابحث في ملايين الصور"}
                  </div>
                  <div style={{ fontSize: 13 }}>اكتب موضوعاً واضغط
                    {SVG_CATEGORIES.includes(category) || AI_ONLY_CATEGORIES.includes(category) ? " ⚡ توليد" : tab === "ai" ? " ⚡ توليد" : " 🔍 بحث"}
                  </div>
                </div>
              )}

              {/* Results grid */}
              {loading && <LoadingGrid />}
              {!loading && hasSearched && items.length > 0 && (
                <>
                  {/* SVG result (diagram / infographic) */}
                  {items[0]?.svg ? (
                    <div
                      onClick={() => setSelected(items[0])}
                      style={{ cursor: "pointer", borderRadius: 16, border: `2px solid ${selected?.id === items[0].id ? "#7c3aed" : "#e2e8f0"}`, overflow: "hidden", background: "#fff", boxShadow: selected?.id === items[0].id ? "0 0 0 3px rgba(124,58,237,.18)" : "none", transition: "all .15s" }}
                    >
                      <div style={{ padding: 12 }} dangerouslySetInnerHTML={{ __html: items[0].svg }} />
                      <div style={{ padding: "8px 14px 12px", borderTop: "1px solid #f1f5f9" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#1e1b4b" }}>{items[0].title}</div>
                        {items[0].caption && <div style={{ fontSize: 11, color: "#64748b", marginTop: 3 }}>{items[0].caption}</div>}
                      </div>
                    </div>
                  ) : (
                    <>
                      {tab === "ai" && (
                        <div style={{ marginBottom: 10, fontSize: 12, color: "#7c3aed", fontWeight: 700 }}>
                          ⚡ {items.length} صور AI — قد تأخذ وقتاً للظهور. انقر على الصورة لمعاينتها أو افتح الرابط ↗
                        </div>
                      )}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                        {items.map(item => (
                          <ImageAssetCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={setSelected} />
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Library tab ── */}
          {tab === "library" && (
            <div>
              {imageLibrary.length === 0
                ? <div style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8", fontSize: 14 }}>📭 لا توجد صور في مكتبتك بعد</div>
                : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                    {imageLibrary.map(item => <ImageAssetCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={setSelected} />)}
                  </div>
              }
            </div>
          )}

          {/* ── URL tab ── */}
          {tab === "url" && (
            <div>
              <div style={{ marginBottom: 8, fontSize: 13, color: "#64748b" }}>ألصق رابط صورة مباشراً (JPG, PNG, WebP...)</div>
              <input
                className="ctx-input"
                value={directUrl}
                onChange={e => setDirectUrl(e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              <div className="ctx-actions" style={{ marginTop: 12 }}>
                <button className="ctx-button primary"
                  onClick={() => setSelected({ id: `url-${Date.now()}`, title: "صورة من رابط", caption: directUrl, url: directUrl })}
                  disabled={!directUrl.trim()}>معاينة</button>
              </div>
            </div>
          )}

          {/* ── Upload tab ── */}
          {tab === "upload" && (
            <label className="ctx-upload">
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleUpload} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>⬆️ ارفع صورة من جهازك</div>
                <div className="ctx-inline-note">تظل المعاينة مطلوبة قبل الإدراج داخل الدرس.</div>
              </div>
            </label>
          )}
        </div>

        <PreviewPanel
          item={selected}
          emptyLabel="اختر صورة من الشبكة أو أنشئ نتائج سياقية جديدة، وستظهر المعاينة هنا قبل الإدراج."
          onRegenerate={() => doSearch(tab, category, instruction)}
          onReset={onClose}
          onInsert={() => selected && onAdd({ type: "image", title: selected.title, caption: selected.caption, url: selected.url, svg: selected.svg, source: selected.source })}
          accent="success"
        />
      </div>
    </ModalShell>
  );
}

function VideoCard({ item, selected, onSelect }) {
  const sourceBadge = getSourceBadge(item);
  return (
    <div className={`ctx-media-card${selected ? " selected" : ""}`} onClick={() => onSelect(item)}>
      {item.thumbnailUrl ? (
        <img
          className="ctx-thumb"
          src={item.thumbnailUrl}
          alt={item.title}
          onError={(event) => {
            console.error("[VideoCard] thumbnail load failed:", item);
            event.currentTarget.src = fallbackImageData(item.title || "Video");
          }}
        />
      ) : (
        <div className="ctx-thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, background: "linear-gradient(135deg, #7c3aed, #1d4ed8)" }}>{item.provider || "Video"}</div>
      )}
      <div className="ctx-media-copy">
        <h4 className="ctx-media-title">{item.title}</h4>
        <p className="ctx-media-caption">{item.caption}</p>
        {sourceBadge && <p className="ctx-media-caption" style={{ marginTop: 8 }}><span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 999, background: sourceBadge.background, color: sourceBadge.color, fontWeight: 800 }}>{sourceBadge.text}</span></p>}
      </div>
    </div>
  );
}

function ContextualVideoModal({ lessonContext, blocks, onClose, onAdd }) {
  const contextPayload = useMemo(() => buildLessonContextPayload(lessonContext, blocks), [lessonContext, blocks]);
  const [tab, setTab] = useState("youtube");
  const [instruction, setInstruction] = useState(lessonContext.title || "");
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [directUrl, setDirectUrl] = useState("");
  const [providerStatus, setProviderStatus] = useState(null);
  const videoLibrary = useMemo(() => blocks.filter((block) => block.type === "video"), [blocks]);

  const run = async (provider = tab) => {
    if (provider === "url" || provider === "upload" || provider === "library") return;
    setLoading(true);
    setErrorMessage("");
    try {
      console.log("[ContextualVideoModal] Request", { provider, instruction });
      const data = await requestContextualGeneration({
        kind: "video",
        lessonContext: contextPayload,
        instruction,
        provider,
      });
      console.log("[ContextualVideoModal] Response", data);
      const normalized = (data.items || []).map((item) => ({ ...item, type: "video" }));
      setItems(normalized);
      setSelected(normalized[0] || null);
      if (!normalized.length) {
        setErrorMessage(`لا توجد نتائج فيديو من مزود ${provider} حالياً. جرّب صياغة بحث مختلفة أو مزوداً آخر.`);
      }
    } catch (error) {
      setErrorMessage(error.message || "تعذر تنفيذ طلب البحث عن الفيديو");
      setItems([]);
      setSelected(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    run(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let mounted = true;
    requestMediaProviderStatus()
      .then((data) => {
        if (mounted) setProviderStatus(data);
      })
      .catch(() => {
        if (mounted) setProviderStatus(null);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelected({ id: `upload-${Date.now()}`, title: file.name, caption: "فيديو مرفوع من جهاز المستخدم", url, videoType: "file", type: "video" });
    setTab("upload");
  };

  const handleUrlPreview = () => {
    const embedUrl = toEmbedUrl(directUrl);
    setSelected({ id: `url-${Date.now()}`, title: instruction || "فيديو خارجي", caption: "تمت إضافته من رابط مباشر", url: directUrl, embedUrl, type: "video" });
  };

  return (
    <ModalShell
      title="مستكشف الفيديو السياقي"
      subtitle="النتائج مبنية على الدرس الحالي وتُعرض كاقتراحات بحث مركزة مع معاينة قبل الإدراج. في YouTube تُستخدم صيغة بحث مضمنة مرتبطة بالسياق مباشرة."
      lessonContext={lessonContext}
      blocks={blocks}
      onClose={onClose}
    >
      <div className="ctx-layout">
        <div className="ctx-card">
          <div className="ctx-segmented">
            {[["youtube", "YouTube"], ["vimeo", "Vimeo"], ["library", "المكتبة"], ["url", "رابط"], ["upload", "رفع"]].map(([value, label]) => (
              <button key={value} className={tab === value ? "active" : ""} onClick={() => { setTab(value); if (value === "youtube" || value === "vimeo") run(value); }}>{label}</button>
            ))}
          </div>

          {(tab === "youtube" || tab === "vimeo") && (
            <>
              {providerStatus && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10, marginBottom: 14 }}>
                  {[providerStatus.youtube, providerStatus.vimeo].filter(Boolean).map((provider) => {
                    const live = provider.mode === "live";
                    return (
                      <div key={provider.label} style={{ borderRadius: 16, padding: "12px 14px", border: `1px solid ${live ? "#86efac" : "#fcd34d"}`, background: live ? "#f0fdf4" : "#fffbeb" }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: live ? "#166534" : "#92400e", marginBottom: 4 }}>{live ? "Live" : "Fallback"}</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{provider.label}</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <input className="ctx-input" value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="ابحث في سياق الدرس الحالي" />
              <div className="ctx-actions" style={{ marginTop: 12, marginBottom: 16 }}>
                <button className="ctx-button primary" onClick={() => run(tab)} disabled={loading || !instruction.trim()}>{loading ? "جارٍ تجهيز النتائج..." : `بحث ${tab === "youtube" ? "YouTube" : "Vimeo"}`}</button>
              </div>
              {errorMessage && <div style={{ marginBottom: 12, padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{errorMessage}</div>}
              <div className="ctx-inline-note" style={{ marginBottom: 12 }}>إذا كانت مفاتيح `YOUTUBE_API_KEY` أو `VIMEO_ACCESS_TOKEN` متوفرة فستظهر نتائج حية بعناوين وصور مصغرة حقيقية. عند غيابها يعود النظام تلقائيًا إلى بحث سياقي منظم بدل نتائج عشوائية.</div>
              {loading ? <LoadingGrid /> : <div className="ctx-grid">{items.map((item) => <VideoCard key={item.id} item={item} selected={selected?.id === item.id} onSelect={setSelected} />)}</div>}
            </>
          )}

          {tab === "library" && (
            <div className="ctx-grid">
              {videoLibrary.length === 0 && <div className="ctx-inline-note">لا توجد فيديوهات محفوظة في المكتبة الحالية.</div>}
              {videoLibrary.map((item) => <VideoCard key={item.id} item={{ ...item, type: "video" }} selected={selected?.id === item.id} onSelect={setSelected} />)}
            </div>
          )}

          {tab === "url" && (
            <>
              <input className="ctx-input" value={directUrl} onChange={(event) => setDirectUrl(event.target.value)} placeholder="ألصق رابط YouTube أو Vimeo أو فيديو مباشر" />
              <div className="ctx-actions" style={{ marginTop: 12 }}>
                <button className="ctx-button primary" onClick={handleUrlPreview} disabled={!directUrl.trim()}>معاينة الرابط</button>
              </div>
            </>
          )}

          {tab === "upload" && (
            <label className="ctx-upload">
              <input type="file" accept="video/*" style={{ display: "none" }} onChange={handleUpload} />
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>ارفع فيديو من جهازك</div>
                <div className="ctx-inline-note">سيتم حفظه كفيديو مخصص داخل محتوى الدرس بعد المعاينة.</div>
              </div>
            </label>
          )}
        </div>

        <PreviewPanel
          item={selected}
          emptyLabel="اختر نتيجة من الشبكة أو ألصق رابطًا خارجيًا، وستُعرض المعاينة هنا قبل الإدراج."
          onRegenerate={() => run(tab)}
          onReset={onClose}
          onInsert={() => selected && onAdd({ type: "video", title: selected.title, caption: selected.caption, url: selected.url || selected.embedUrl, embedUrl: selected.embedUrl, externalUrl: selected.externalUrl, videoType: selected.videoType, provider: selected.provider })}
          accent="warning"
        />
      </div>
    </ModalShell>
  );
}

function ContextualChartModal({ lessonContext, blocks, onClose, onAdd }) {
  const contextPayload = useMemo(() => buildLessonContextPayload(lessonContext, blocks), [lessonContext, blocks]);
  const [chartType, setChartType] = useState("infographic");
  const [instruction, setInstruction] = useState(lessonContext.title || "");
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const run = async () => {
    if (!instruction.trim()) return;
    setLoading(true);
    setErrorMessage("");
    try {
      console.log("[ContextualChartModal] Request", { chartType, instruction });
      const data = await requestContextualGeneration({
        kind: "chart",
        lessonContext: contextPayload,
        instruction,
        chartType,
      });
      console.log("[ContextualChartModal] Response", data);
      setPreview(data.preview);
    } catch (error) {
      setErrorMessage(error.message || "تعذر تنفيذ طلب توليد المخطط");
      setPreview(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ModalShell
      title="مولد المخططات والرسوم التعليمية"
      subtitle="أنشئ Infographic أو Flowchart أو Timeline أو Concept Map من نفس بيانات الدرس الحالية، مع معاينة SVG قبل الإدراج."
      lessonContext={lessonContext}
      blocks={blocks}
      onClose={onClose}
    >
      <div className="ctx-layout">
        <div className="ctx-card">
          <div className="ctx-segmented">
            {[["infographic", "Infographic"], ["diagram", "Diagram"], ["flowchart", "Flowchart"], ["timeline", "Timeline"], ["concept-map", "Concept map"], ["comparison", "Comparison table"]].map(([value, label]) => (
              <button key={value} className={chartType === value ? "active" : ""} onClick={() => setChartType(value)}>{label}</button>
            ))}
          </div>
          <textarea className="ctx-textarea" value={instruction} onChange={(event) => setInstruction(event.target.value)} placeholder="مثال: أنشئ مخطط مقارنة يوضح الفرق بين وحدات الإدخال ووحدات الإخراج" />
          <div className="ctx-actions" style={{ marginTop: 12 }}>
            <button className="ctx-button primary" onClick={run} disabled={loading || !instruction.trim()}>{loading ? "جارٍ الإنشاء..." : "توليد المعاينة"}</button>
          </div>
          {errorMessage && <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{errorMessage}</div>}
          {preview && <div className="ctx-inline-note" style={{ marginTop: 14 }}>{preview.description}</div>}
        </div>
        <PreviewPanel
          item={preview}
          emptyLabel="اختر نوع المخطط واكتب التوجيه المطلوب، وسيظهر الرسم هنا قبل إدراجه داخل الدرس."
          onRegenerate={run}
          onReset={onClose}
          onInsert={() => preview && onAdd({ type: "chart", title: preview.title, caption: preview.description, chartType, svg: preview.svg })}
          accent="success"
        />
      </div>
    </ModalShell>
  );
}

function HeadingModal({ onClose, onAdd }) {
  const [heading, setHeading] = useState("");
  const [level, setLevel] = useState("h2");
  return (
    <ModalShell title="إضافة عنوان" subtitle="أدخل عنوانًا أو عنوانًا فرعيًا ليُدرج ضمن سياق الدرس الحالي." lessonContext={{}} blocks={[]} onClose={onClose}>
      <div className="ctx-card">
        <input className="ctx-input" value={heading} onChange={(event) => setHeading(event.target.value)} placeholder="العنوان" autoFocus />
        <select className="ctx-select" value={level} onChange={(event) => setLevel(event.target.value)} style={{ marginTop: 12 }}>
          <option value="h1">H1</option>
          <option value="h2">H2</option>
          <option value="h3">H3</option>
        </select>
        <div className="ctx-actions" style={{ marginTop: 14 }}>
          <button className="ctx-button success" onClick={() => heading.trim() && onAdd({ type: "heading", content: heading, level })}>إضافة العنوان</button>
        </div>
      </div>
    </ModalShell>
  );
}

function QuizModal({ lessonContext, blocks = [], onClose, onAdd }) {
  const contextPayload = useMemo(() => buildLessonContextPayload(lessonContext, blocks), [lessonContext, blocks]);
  const [level, setLevel] = useState("medium");
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const run = async () => {
    setLoading(true);
    setErrorMessage("");
    setPreview(null);
    try {
      const data = await requestContextualGeneration({
        kind: "quiz",
        lessonContext: contextPayload,
        instruction: lessonContext.title || "الدرس الحالي",
        questionCount,
        level,
      });
      const questions = data.questions || [];
      if (!questions.length) throw new Error("لم يتم توليد أي أسئلة");
      setPreview(questions);
    } catch (error) {
      setErrorMessage(error.message || "تعذر توليد الاختبار، حاول مرة أخرى");
    }
    setLoading(false);
  };

  return (
    <ModalShell
      title="🎓 مولد الاختبار السياقي"
      subtitle="ينشئ أسئلة اختيار من متعدد مرتبطة بمحتوى الدرس الحالي، مع معاينة كاملة قبل الإدراج."
      lessonContext={lessonContext}
      blocks={blocks}
      onClose={onClose}
    >
      <div className="ctx-layout">
        <div className="ctx-card">

          {/* Level selector */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>مستوى الصعوبة</div>
            <div className="ctx-segmented">
              {[["easy", "سهل 🟢"], ["medium", "متوسط 🟡"], ["hard", "متقدم 🔴"]].map(([value, label]) => (
                <button key={value} className={level === value ? "active" : ""} onClick={() => setLevel(value)}>{label}</button>
              ))}
            </div>
          </div>

          {/* Question count */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 8 }}>
              عدد الأسئلة: <span style={{ color: "#7c3aed", fontSize: 16 }}>{questionCount}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                onClick={() => setQuestionCount(c => Math.max(3, c - 1))}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}
              >−</button>
              <input
                type="range"
                min={3}
                max={15}
                value={questionCount}
                onChange={e => setQuestionCount(Number(e.target.value))}
                style={{ flex: 1, accentColor: "#7c3aed", cursor: "pointer" }}
              />
              <button
                onClick={() => setQuestionCount(c => Math.min(15, c + 1))}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "1.5px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 18, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", justifyContent: "center" }}
              >+</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "#94a3b8" }}>
              <span>3 (أدنى)</span><span>15 (أقصى)</span>
            </div>
          </div>

          <button className="ctx-button primary" onClick={run} disabled={loading}>
            {loading ? "⏳ جارٍ التوليد..." : `⚡ إنشاء ${questionCount} سؤال`}
          </button>

          {errorMessage && (
            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: 10, border: "1px solid #fecaca", background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {preview?.length > 0 && (
            <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#6366f1", marginBottom: 4 }}>
                ✅ {preview.length} سؤال تم توليده — معاينة:
              </div>
              {preview.map((question, index) => (
                <div key={index} className="ctx-card" style={{ background: "#f8fafc" }}>
                  <div style={{ fontWeight: 800, color: "#1e1b4b", marginBottom: 8, fontSize: 14 }}>
                    {index + 1}. {question.question}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {question.options?.map((opt, oi) => (
                      <div key={oi} style={{ fontSize: 13, color: opt === question.answer ? "#059669" : "#475569", fontWeight: opt === question.answer ? 700 : 400, padding: "4px 10px", borderRadius: 8, background: opt === question.answer ? "#d1fae5" : "transparent" }}>
                        {opt === question.answer ? "✓ " : "  "}{opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <PreviewPanel
          item={preview?.length ? {
            title: `اختبار: ${lessonContext.title || "الدرس الحالي"}`,
            caption: `${preview.length} سؤال اختيار من متعدد — مستوى ${level === "easy" ? "سهل" : level === "medium" ? "متوسط" : "متقدم"}`,
          } : null}
          emptyLabel="اضبط عدد الأسئلة والصعوبة ثم اضغط إنشاء، وستظهر المعاينة هنا قبل الإدراج في الدرس."
          onRegenerate={run}
          onReset={onClose}
          onInsert={() => preview?.length && onAdd({
            type: "quiz",
            title: `اختبار: ${lessonContext.title || "الدرس الحالي"}`,
            questions: preview,
          })}
        />
      </div>
    </ModalShell>
  );
}

function ContextHelpModal({ lessonContext, blocks, onClose }) {
  return (
    <ModalShell title="ملخص السياق" subtitle="ما الذي يستخدمه المحرك فعليًا قبل أي توليد؟" lessonContext={lessonContext} blocks={blocks} onClose={onClose}>
      <div className="ctx-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><strong>العنوان:</strong> {lessonContext.title || "غير متوفر"}</div>
          <div><strong>الملخص:</strong> {lessonContext.summary || "غير متوفر"}</div>
          <div><strong>عدد الأقسام:</strong> {lessonContext.sections?.length || 0}</div>
          <div><strong>عدد الكتل المضافة:</strong> {blocks.length}</div>
          <div className="ctx-inline-note">أي توليد جديد يجمع بين عنوان الدرس، أقسامه، مصطلحاته، والكتل المدرجة حديثًا ثم يطبق تعليمات المستخدم فوق هذا السياق. لا يتم الإدراج مباشرة دون معاينة.</div>
        </div>
      </div>
    </ModalShell>
  );
}

function ReorderModal({ blocks, onClose, onReorder }) {
  const [items, setItems] = useState(blocks);
  const dragging = useRef(null);

  const swap = (toIndex) => {
    if (dragging.current === null || dragging.current === toIndex) return;
    const next = [...items];
    const temp = next[dragging.current];
    next[dragging.current] = next[toIndex];
    next[toIndex] = temp;
    dragging.current = toIndex;
    setItems(next);
  };

  return (
    <ModalShell title="إعادة ترتيب المحتوى" subtitle="حرّك الكتل المضافة للحفاظ على تسلسل منطقي داخل الدرس." lessonContext={{}} blocks={blocks} onClose={onClose}>
      <div className="ctx-card">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((block, index) => (
            <div
              key={`${block.type}-${index}`}
              draggable
              onDragStart={() => { dragging.current = index; }}
              onDragOver={(event) => { event.preventDefault(); swap(index); }}
              onDragEnd={() => { dragging.current = null; }}
              style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff" }}
            >
              <span style={{ color: "#94a3b8", fontSize: 18 }}>☰</span>
              <span className="ctx-chip">{block.type}</span>
              <div style={{ fontWeight: 700, color: "#0f172a" }}>{blockTitle(block)}</div>
            </div>
          ))}
        </div>
        <div className="ctx-actions" style={{ marginTop: 16 }}>
          <button className="ctx-button success" onClick={() => onReorder(items)}>تطبيق الترتيب</button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function ContextualEditorToolbar({ lessonContext, onContentAdd, onContentReorder, blocks = [] }) {
  const [activeModal, setActiveModal] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const closeModal = () => setActiveModal(null);
  const handleAdd = (block) => {
    onContentAdd({ ...block, id: Date.now() });
    closeModal();
  };

  const handleAction = (action) => {
    if (action === "divider") {
      onContentAdd({ type: "divider", id: Date.now() });
      return;
    }
    setActiveModal(action);
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{styles}</style>
      <div className="ctx-toolbar">
        <div className="ctx-toolbar-shell" role="toolbar" aria-label="شريط التوليد السياقي">
          {TOOLBAR_BUTTONS.map((button) => (
            <button key={button.id} className="ctx-toolbar-button" onClick={() => handleAction(button.id)} style={{ boxShadow: `inset 0 0 0 1px ${button.tone}44` }}>
              <span>{button.icon}</span>
              <span className="ctx-toolbar-tooltip">{button.label}</span>
            </button>
          ))}
        </div>
      </div>

      {activeModal === "improve" && <ContextualTextModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} onAdd={handleAdd} defaultMode="rewrite" />}
      {activeModal === "text" && <ContextualTextModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} onAdd={handleAdd} defaultMode="generate" />}
      {activeModal === "image" && <ContextualImageModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} onAdd={handleAdd} />}
      {activeModal === "video" && <ContextualVideoModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} onAdd={handleAdd} />}
      {activeModal === "chart" && <ContextualChartModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} onAdd={handleAdd} />}
      {activeModal === "heading" && <HeadingModal onClose={closeModal} onAdd={handleAdd} />}
      {activeModal === "quiz" && <QuizModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} onAdd={handleAdd} />}
      {activeModal === "reorder" && <ReorderModal blocks={blocks} onClose={closeModal} onReorder={(items) => { onContentReorder(items); closeModal(); }} />}
      {activeModal === "help" && <ContextHelpModal lessonContext={lessonContext} blocks={blocks} onClose={closeModal} />}
    </>
  );
}
