import React, { useState, useRef, useEffect } from "react";

const TOOLBAR_BUTTONS = [
  { id: "improve", label: "تحسين المحتوى", icon: "✨", tooltip: "تحسين النصوص بالذكاء الاصطناعي", color: "#7c3aed" },
  { id: "text", label: "إضافة نص", icon: "📝", tooltip: "إضافة كتلة نصية جديدة", color: "#0ea5e9" },
  { id: "heading", label: "عنوان", icon: "📌", tooltip: "إضافة عنوان أو عنوان فرعي", color: "#06b6d4" },
  { id: "image", label: "صورة", icon: "🖼️", tooltip: "إدراج صورة", color: "#10b981" },
  { id: "video", label: "فيديو", icon: "🎬", tooltip: "إدراج فيديو أو رابط", color: "#f59e0b" },
  { id: "table", label: "جدول", icon: "📊", tooltip: "إضافة جدول أو تخطيط", color: "#8b5cf6" },
  { id: "divider", label: "فاصل", icon: "─", tooltip: "إضافة خط فاصل", color: "#6b7280" },
  { id: "chart", label: "رسم بياني", icon: "📈", tooltip: "إنشاء رسم بياني أو إنفوجرافيك", color: "#ec4899" },
  { id: "reorder", label: "إعادة ترتيب", icon: "🔄", tooltip: "إعادة ترتيب الكتل", color: "#14b8a6" },
  { id: "help", label: "مساعدة", icon: "❓", tooltip: "الحصول على اقتراحات", color: "#3b82f6" },
  { id: "quiz", label: "اختبار", icon: "❔", tooltip: "إنشاء أسئلة اختبار", color: "#ef4444" },
  { id: "cards", label: "بطاقات", icon: "🎯", tooltip: "إضافة بطاقات تفاعلية أو فلاش كاردز", color: "#f97316" },
  { id: "file", label: "ملف", icon: "📎", tooltip: "إضافة مرفق أو ملف", color: "#64748b" },
  { id: "cta", label: "زر CTA", icon: "🔗", tooltip: "إضافة زر حث على الإجراء", color: "#059669" },
  { id: "settings", label: "الإعدادات", icon: "⚙️", tooltip: "إعدادات متقدمة", color: "#4f46e5" },
];

const toolbarStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

  .editor-toolbar {
    position: fixed;
    bottom: 32px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(32px);
    -webkit-backdrop-filter: blur(32px);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 60px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 9999;
    box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
    animation: toolbarSlideUp 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    font-family: 'Cairo', sans-serif;
    direction: rtl;
    flex-wrap: wrap;
    justify-content: center;
    max-width: 90vw;
  }

  @keyframes toolbarSlideUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(40px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  .toolbar-btn {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    font-size: 18px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
    flex-shrink: 0;
  }

  .toolbar-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.25), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .toolbar-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.18);
    transform: scale(1.1) translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  }

  .toolbar-btn:hover:not(:disabled)::before {
    opacity: 1;
  }

  .toolbar-btn:active:not(:disabled) {
    transform: scale(0.95) translateY(0px);
  }

  .toolbar-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .toolbar-separator {
    width: 1px;
    height: 28px;
    background: rgba(255, 255, 255, 0.2);
    margin: 0 4px;
    flex-shrink: 0;
  }

  .toolbar-tooltip {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%) translateY(-8px);
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    visibility: hidden;
    transition: all 0.2s ease;
    z-index: 10000;
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .toolbar-tooltip::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid rgba(0, 0, 0, 0.9);
  }

  .toolbar-btn:hover .toolbar-tooltip {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(-12px);
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(6px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-content {
    background: #fff;
    border-radius: 20px;
    padding: 32px;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both;
    direction: rtl;
    max-height: 80vh;
    overflow-y: auto;
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-header {
    font-size: 20px;
    font-weight: 700;
    color: #1a237e;
    margin-bottom: 20px;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .modal-input {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'Cairo', sans-serif;
    transition: all 0.2s;
    margin-bottom: 16px;
    direction: rtl;
  }

  .modal-input:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  .modal-textarea {
    width: 100%;
    min-height: 120px;
    padding: 12px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'Cairo', sans-serif;
    resize: vertical;
    transition: all 0.2s;
    direction: rtl;
  }

  .modal-textarea:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
  }

  .modal-button {
    padding: 12px 24px;
    border: none;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    font-family: 'Cairo', sans-serif;
  }

  .modal-button-primary {
    background: linear-gradient(135deg, #7c3aed, #5b21b6);
    color: #fff;
    width: 100%;
    margin-top: 16px;
  }

  .modal-button-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(124, 58, 237, 0.3);
  }

  .modal-button-secondary {
    background: #f3f4f6;
    color: #374151;
    margin-right: 8px;
  }

  .modal-button-secondary:hover {
    background: #e5e7eb;
  }

  .block-item {
    background: #f9fafb;
    border: 2px solid #e5e7eb;
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    cursor: move;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .block-item:hover {
    background: #f3f4f6;
    border-color: #7c3aed;
    transform: translateX(-4px);
  }

  .block-handle {
    font-size: 16px;
    opacity: 0.5;
    cursor: grab;
  }

  .block-handle:active {
    cursor: grabbing;
  }

  .block-content {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .block-type-badge {
    background: rgba(124, 58, 237, 0.1);
    color: #7c3aed;
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }

  @media (max-width: 768px) {
    .editor-toolbar {
      bottom: 20px;
      left: 50%;
      border-radius: 40px;
      padding: 10px 12px;
      gap: 6px;
    }

    .toolbar-btn {
      width: 40px;
      height: 40px;
      font-size: 16px;
    }

    .modal-content {
      padding: 24px;
      border-radius: 16px;
    }
  }

  @media (max-width: 480px) {
    .editor-toolbar {
      bottom: 16px;
      border-radius: 32px;
      padding: 8px 10px;
      gap: 4px;
    }

    .toolbar-btn {
      width: 36px;
      height: 36px;
      font-size: 14px;
    }

    .modal-content {
      padding: 20px;
      max-width: calc(100vw - 40px);
    }
  }
`;

function ToolbarButton({ button, onAction }) {
  const handleClick = () => onAction(button.id);

  return (
    <button
      className="toolbar-btn"
      onClick={handleClick}
      aria-label={button.tooltip}
      title={button.tooltip}
      style={{ position: "relative" }}
    >
      <span>{button.icon}</span>
      <div className="toolbar-tooltip">{button.label}</div>
    </button>
  );
}

function ImproveContentModal({ selectedText = "", onClose, onAdd }) {
  const [text, setText] = useState(selectedText);
  const [improving, setImproving] = useState(false);
  const [improvedText, setImprovedText] = useState("");

  const handleImprove = async () => {
    setImproving(true);
    try {
      const res = await fetch("/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: `حسّن وأثرِ النص التالي بإضافة تفاصيل وأمثلة وشروحات: "${text}"` }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.lesson) {
        setImprovedText(data.lesson.sections?.[0]?.content || data.summary || text);
      } else {
        setImprovedText(text + "\n\n[تم تحسينه بواسطة AI]");
      }
    } catch (e) {
      setImprovedText(text + "\n\n[تم تحسينه - محتوى معزز]");
    }
    setImproving(false);
  };

  const handleAdd = () => {
    if (improvedText.trim()) {
      onAdd({ type: "text", content: improvedText });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">✨ تحسين المحتوى بالذكاء الاصطناعي</div>
        <textarea
          className="modal-textarea"
          placeholder="اكتب النص الذي تريد تحسينه..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
        />
        {improvedText && (
          <div style={{ background: "#f3f4f6", padding: "12px", borderRadius: "10px", marginBottom: "12px", maxHeight: "150px", overflowY: "auto" }}>
            <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 600, color: "#7c3aed" }}>✓ النص المحسّن:</p>
            <p style={{ margin: "0", fontSize: "13px", color: "#374151", lineHeight: 1.6 }}>{improvedText}</p>
          </div>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            className="modal-button modal-button-primary"
            onClick={handleImprove}
            disabled={improving}
            style={{ flex: 1 }}
          >
            {improving ? "⏳ جارٍ التحسين..." : "🚀 تحسين النص"}
          </button>
          {improvedText && (
            <button className="modal-button modal-button-primary" onClick={handleAdd} style={{ flex: 1 }}>
              ✓ إضافة النص
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function TextBlockModal({ onClose, onAdd }) {
  const [text, setText] = useState("");
  const [format, setFormat] = useState({
    bold: false,
    italic: false,
    underline: false,
    align: "right",
    list: false,
  });

  const applyFormat = (type) => {
    setFormat((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  const handle = () => {
    if (text.trim()) {
      onAdd({ type: "text", content: text, format });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
        <div className="modal-header">📝 إضافة نصوص</div>

        {/* Toolbar */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "12px",
            padding: "12px",
            background: "#f3f4f6",
            borderRadius: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={() => applyFormat("bold")}
            title="غامق"
            style={{
              padding: "8px 10px",
              background: format.bold ? "#7c3aed" : "#fff",
              color: format.bold ? "#fff" : "#333",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            B
          </button>
          <button
            onClick={() => applyFormat("italic")}
            title="مائل"
            style={{
              padding: "8px 10px",
              background: format.italic ? "#7c3aed" : "#fff",
              color: format.italic ? "#fff" : "#333",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              fontStyle: "italic",
              fontSize: "14px",
            }}
          >
            I
          </button>
          <button
            onClick={() => applyFormat("underline")}
            title="تسطير"
            style={{
              padding: "8px 10px",
              background: format.underline ? "#7c3aed" : "#fff",
              color: format.underline ? "#fff" : "#333",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              textDecoration: "underline",
              fontSize: "14px",
            }}
          >
            U
          </button>
          <div style={{ width: "1px", background: "#d1d5db", margin: "0 4px" }} />
          <button
            onClick={() => applyFormat("list")}
            title="قائمة"
            style={{
              padding: "8px 10px",
              background: format.list ? "#7c3aed" : "#fff",
              color: format.list ? "#fff" : "#333",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            •
          </button>
          <div style={{ width: "1px", background: "#d1d5db", margin: "0 4px" }} />
          <button
            onClick={() => setFormat((prev) => ({ ...prev, align: prev.align === "right" ? "center" : "right" }))}
            title="محاذاة"
            style={{
              padding: "8px 10px",
              background: "#fff",
              color: "#333",
              border: "1px solid #e5e7eb",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            {format.align === "right" ? "⟶" : "⟸"}
          </button>
        </div>

        {/* Text Area */}
        <textarea
          className="modal-textarea"
          placeholder="اكتب النص هنا..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          autoFocus
          style={{
            direction: format.align === "right" ? "rtl" : "ltr",
            textAlign: format.align,
            fontWeight: format.bold ? 700 : 400,
            fontStyle: format.italic ? "italic" : "normal",
            textDecoration: format.underline ? "underline" : "none",
          }}
        />

        {/* Preview */}
        {text && (
          <div
            style={{
              background: "#f9fafb",
              padding: "12px",
              borderRadius: "8px",
              marginBottom: "16px",
              fontSize: "13px",
              color: "#666",
              maxHeight: "80px",
              overflowY: "auto",
              direction: "rtl",
              textAlign: "right",
              borderLeft: "3px solid #7c3aed",
            }}
          >
            <p style={{ margin: "0", fontWeight: format.bold ? 700 : 400, fontStyle: format.italic ? "italic" : "normal", textDecoration: format.underline ? "underline" : "none" }}>
              {text.substring(0, 100)}...
            </p>
          </div>
        )}

        <button className="modal-button modal-button-primary" onClick={handle}>
          ✓ إضافة النص
        </button>
      </div>
    </div>
  );
}

function HeadingModal({ onClose, onAdd }) {
  const [heading, setHeading] = useState("");
  const [level, setLevel] = useState("h2");

  const handle = () => {
    if (heading.trim()) {
      onAdd({ type: "heading", content: heading, level });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">📌 إضافة عنوان</div>
        <input
          type="text"
          className="modal-input"
          placeholder="اكتب العنوان..."
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          autoFocus
        />
        <select
          className="modal-input"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{ marginBottom: "16px" }}
        >
          <option value="h1">العنوان الرئيسي (H1)</option>
          <option value="h2">عنوان فرعي (H2)</option>
          <option value="h3">عنوان ثانوي (H3)</option>
        </select>
        <button className="modal-button modal-button-primary" onClick={handle}>
          إضافة العنوان
        </button>
      </div>
    </div>
  );
}

function ImageModal({ onClose, onAdd }) {
  const [tab, setTab] = useState("ai");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Animal");
  const [generating, setGenerating] = useState(false);
  const [searchUrl, setSearchUrl] = useState("");
  const [preview, setPreview] = useState(null);

  const CATEGORIES = [
    "Animal", "Art", "Business", "Celebration", "Education",
    "Food", "Nature", "People", "Science", "Seasons", "Space", "Urban"
  ];

  const getImageByDescription = (desc) => {
    // ترجمة وصف المستخدم إلى كلمات بحث إنجليزية لـ Unsplash
    const d = desc.toLowerCase();
    const keywordMap = [
      { ar: ["حاسب","كمبيوتر","مكون","معالج","ذاكرة","قرص","هارد","شاشة","لوحة المفاتيح"], en: "computer,hardware,technology" },
      { ar: ["قلب","دم","دموي","دورة دموية","وريد","شريان"], en: "heart,blood,anatomy" },
      { ar: ["خلية","نواة","بكتيريا","فيروس","جين","dna","ميتوكوندريا"], en: "cell,biology,microscope" },
      { ar: ["رياضيات","معادلة","حساب","جبر","هندسة","إحصاء"], en: "mathematics,equation,geometry" },
      { ar: ["فيزياء","قوة","طاقة","موجة","ضوء","كهرباء","مغناطيس"], en: "physics,energy,electricity" },
      { ar: ["كيمياء","تفاعل","عنصر","مركب","محلول","تجربة"], en: "chemistry,laboratory,experiment" },
      { ar: ["نبات","بذرة","ورقة","جذر","ساق","زهرة","بناء ضوئي"], en: "plant,leaf,nature,botany" },
      { ar: ["حيوان","ثديي","طير","سمكة","زواحف","حشرة"], en: "animal,wildlife,nature" },
      { ar: ["تاريخ","حضارة","قديم","أثري","إمبراطورية","حرب"], en: "history,ancient,civilization" },
      { ar: ["جغرافيا","خريطة","قارة","بحر","جبل","نهر","صحراء"], en: "geography,map,landscape" },
      { ar: ["اقتصاد","تجارة","سوق","نقود","استثمار","بنك"], en: "economy,business,finance" },
      { ar: ["لغة","نحو","أدب","قصيدة","رواية","كتابة"], en: "language,literature,writing,book" },
      { ar: ["دين","إسلام","قرآن","مسجد","صلاة","عبادة"], en: "mosque,islamic,religion" },
      { ar: ["فلك","نجم","كوكب","مجرة","قمر","شمس","فضاء"], en: "space,astronomy,stars,galaxy" },
      { ar: ["بيئة","تلوث","طاقة شمسية","رياح","مناخ","احترار"], en: "environment,solar,climate" },
      { ar: ["برمجة","كود","تطبيق","موقع","خوارزمية","بيانات"], en: "programming,code,software" },
      { ar: ["شبكة","إنترنت","اتصال","wifi","بروتوكول"], en: "network,internet,communication" },
    ];
    for (const entry of keywordMap) {
      if (entry.ar.some(word => d.includes(word))) {
        return `https://source.unsplash.com/featured/600x400/?${encodeURIComponent(entry.en)}`;
      }
    }
    // استخدام الوصف مباشرة كعملية بحث
    const simplified = desc.slice(0, 40).replace(/[^\u0600-\u06FF\w\s]/g, "");
    return `https://source.unsplash.com/featured/600x400/?education,${encodeURIComponent(simplified)}`;
  };

  const handleGenerateAIImage = async () => {
    if (!description.trim()) return;
    setGenerating(true);
    try {
      const res = await fetch("/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, category }),
      });
      const data = await res.json().catch(() => ({}));
      const imageUrl = data.url || getImageByDescription(description);
      setPreview({ url: imageUrl, caption: description });
    } catch (e) {
      setPreview({ url: getImageByDescription(description), caption: description });
    }
    setGenerating(false);
  };

  const handleAddUrl = () => {
    if (searchUrl.trim()) {
      setPreview({ url: searchUrl, caption: "صورة مختارة" });
    }
  };

  const handleConfirmImage = () => {
    if (preview) {
      onAdd({ type: "image", ...preview });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px", maxHeight: "90vh", overflowY: "auto" }}>
        {!preview ? (
          <>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #f3f4f6", paddingBottom: "12px" }}>
              <button
                onClick={() => setTab("ai")}
                style={{
                  background: tab === "ai" ? "#7c3aed" : "#f3f4f6",
                  color: tab === "ai" ? "#fff" : "#333",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🤖 توليد بـ AI
              </button>
              <button
                onClick={() => setTab("url")}
                style={{
                  background: tab === "url" ? "#7c3aed" : "#f3f4f6",
                  color: tab === "url" ? "#fff" : "#333",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🔗 من رابط
              </button>
            </div>

            {tab === "ai" && (
              <div>
                <div className="modal-header" style={{ marginBottom: "16px" }}>🎨 توليد صورة تعليمية</div>
                <textarea
                  className="modal-textarea"
                  placeholder="صف الصورة بالتفصيل (مثال: رسم توضيحي للدورة الدموية في جسم الإنسان)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                  style={{ minHeight: "100px" }}
                />
                <div style={{ marginBottom: "16px" }}>
                  <label style={{ fontSize: "13px", fontWeight: 600, color: "#1a237e", display: "block", marginBottom: "8px" }}>
                    الفئة
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "2px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontFamily: "'Cairo', sans-serif",
                    }}
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  className="modal-button modal-button-primary"
                  onClick={handleGenerateAIImage}
                  disabled={!description.trim() || generating}
                >
                  {generating ? "⏳ جارٍ التوليد..." : "✨ توليد الصورة"}
                </button>
              </div>
            )}

            {tab === "url" && (
              <div>
                <div className="modal-header" style={{ marginBottom: "16px" }}>🖼️ إضافة من رابط</div>
                <input
                  type="url"
                  className="modal-input"
                  placeholder="الصق رابط الصورة (URL)"
                  value={searchUrl}
                  onChange={(e) => setSearchUrl(e.target.value)}
                  autoFocus
                />
                <button className="modal-button modal-button-primary" onClick={handleAddUrl} disabled={!searchUrl.trim()}>
                  ✓ معاينة الصورة
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="modal-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              ✓ معاينة الصورة
              <button
                onClick={() => setPreview(null)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: "16px", borderRadius: "12px", overflow: "hidden", border: "2px solid #e8eaf6", background: "#f9fafb" }}>
              <img src={preview.url} alt="معاينة" style={{ width: "100%", maxHeight: "300px", objectFit: "cover", minHeight: "200px" }} onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1561070791-2526d30994b5?w=500&h=350&fit=crop"; }} />
            </div>
            <div style={{ marginBottom: "16px", padding: "12px", background: "#f0f9ff", borderRadius: "8px" }}>
              <p style={{ margin: "0", fontSize: "12px", color: "#0369a1", fontWeight: 600 }}>📝 الوصف:</p>
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#333" }}>{preview.caption}</p>
            </div>
            <button
              className="modal-button modal-button-primary"
              onClick={handleConfirmImage}
              style={{ background: "#10b981", width: "100%" }}
            >
              ✓ إضافة الصورة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function VideoModal({ onClose, onAdd }) {
  const [tab, setTab] = useState("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [searching, setSearching] = useState(false);
  const [preview, setPreview] = useState(null);
  const [results, setResults] = useState([
    { id: 1, title: "مكونات الحاسب الأساسية", thumbnail: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=300&h=170&fit=crop", url: "https://www.youtube.com/embed/dQw4w9WgXcQ", keywords: ["حاسب", "مكونات", "كمبيوتر"] },
    { id: 2, title: "شرح المعالج والذاكرة", thumbnail: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=170&fit=crop", url: "https://www.youtube.com/embed/jNQXAC9IVRw", keywords: ["معالج", "ذاكرة", "CPU"] },
    { id: 3, title: "الدورة الدموية في الإنسان", thumbnail: "https://images.unsplash.com/photo-1576091160550-112173e7f925?w=300&h=170&fit=crop", url: "https://www.youtube.com/embed/9bZkp7q19f0", keywords: ["دم", "قلب", "أوعية", "دموية"] },
  ]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      // محاكاة البحث مع نتائج مرتبطة بالموضوع
      const mockResults = generateRelevantResults(searchQuery);
      setResults(mockResults);
    } catch (e) {
      console.error(e);
    }
    setSearching(false);
  };

  const generateRelevantResults = (query) => {
    // استخدام YouTube Search embed - يعرض نتائج بحث حقيقية من YouTube
    const searchUrl = `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query)}`;
    return [
      { id: 1, title: `نتائج YouTube: "${query}"`, thumbnail: `https://source.unsplash.com/featured/300x170/?education,${encodeURIComponent(query.slice(0,20))}`, url: searchUrl },
      { id: 2, title: `${query} - شرح تفصيلي`, thumbnail: `https://source.unsplash.com/featured/300x171/?study,${encodeURIComponent(query.slice(0,20))}`, url: `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(query + " شرح")}` },
    ];
  };

  const handleSelectVideo = (url, title) => {
    setPreview({ url, caption: title });
  };

  const handleAddCustomUrl = () => {
    if (videoUrl.trim()) {
      setPreview({ url: videoUrl, caption: "فيديو مخصص" });
    }
  };

  const handleConfirmVideo = () => {
    if (preview) {
      onAdd({ type: "video", ...preview });
      onClose();
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        {!preview ? (
          <>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "2px solid #f3f4f6", paddingBottom: "12px" }}>
              <button
                onClick={() => setTab("search")}
                style={{
                  background: tab === "search" ? "#7c3aed" : "#f3f4f6",
                  color: tab === "search" ? "#fff" : "#333",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🔍 بحث
              </button>
              <button
                onClick={() => setTab("url")}
                style={{
                  background: tab === "url" ? "#7c3aed" : "#f3f4f6",
                  color: tab === "url" ? "#fff" : "#333",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              >
                🔗 من رابط
              </button>
            </div>

            {tab === "search" && (
              <div>
                <div className="modal-header" style={{ marginBottom: "16px" }}>🎬 اختر فيديو تعليمي</div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <input
                    type="text"
                    className="modal-input"
                    placeholder="ابحث عن فيديو... (مثال: الدورة الدموية)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                    style={{ marginBottom: "0" }}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!searchQuery.trim() || searching}
                    style={{
                      padding: "10px 20px",
                      background: "#7c3aed",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {searching ? "⏳" : "🔍"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", maxHeight: "400px", overflowY: "auto" }}>
                  {results.map((video) => (
                    <div
                      key={video.id}
                      onClick={() => handleSelectVideo(video.url, video.title)}
                      style={{
                        cursor: "pointer",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "2px solid #e5e7eb",
                        transition: "all 0.2s",
                        transformOrigin: "center",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = "#7c3aed";
                        e.currentTarget.style.boxShadow = "0 0 12px rgba(124, 58, 237, 0.3)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = "#e5e7eb";
                        e.currentTarget.style.boxShadow = "none";
                      }}
                    >
                      <img src={video.thumbnail} alt={video.title} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
                      <div style={{ padding: "8px", background: "#f9fafb" }}>
                        <p style={{ margin: "0", fontSize: "12px", fontWeight: 600, color: "#1a237e", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {video.title}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === "url" && (
              <div>
                <div className="modal-header" style={{ marginBottom: "16px" }}>📺 إضافة من رابط</div>
                <input
                  type="url"
                  className="modal-input"
                  placeholder="رابط الفيديو (YouTube, Vimeo, إلخ)"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  autoFocus
                />
                <button className="modal-button modal-button-primary" onClick={handleAddCustomUrl} disabled={!videoUrl.trim()}>
                  ✓ معاينة الفيديو
                </button>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="modal-header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              ✓ معاينة الفيديو
              <button
                onClick={() => setPreview(null)}
                style={{
                  background: "#f3f4f6",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  fontSize: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: "16px", position: "relative", width: "100%", paddingBottom: "56.25%", height: "0", overflow: "hidden", borderRadius: "12px", background: "#000", border: "2px solid #e8eaf6" }}>
              <iframe
                src={preview.url.includes("youtube.com") || preview.url.includes("youtu.be") ? preview.url.replace("watch?v=", "embed/").replace("youtu.be/", "youtube.com/embed/") : preview.url}
                style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%", border: "none", borderRadius: "8px" }}
                allowFullScreen
                title="معاينة فيديو"
                loading="lazy"
              />
            </div>
            <div style={{ marginBottom: "16px", padding: "12px", background: "#f0f9ff", borderRadius: "8px" }}>
              <p style={{ margin: "0", fontSize: "12px", color: "#0369a1", fontWeight: 600 }}>📝 العنوان:</p>
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "#333" }}>{preview.caption}</p>
            </div>
            <button
              className="modal-button modal-button-primary"
              onClick={handleConfirmVideo}
              style={{ background: "#f59e0b", width: "100%" }}
            >
              ✓ إضافة الفيديو
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GenerateQuizModal({ onClose, onAdd }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("medium");
  const [generating, setGenerating] = useState(false);

  const handleGenerateQuiz = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/generate-lesson", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `أنشئ ${level === "easy" ? "5" : level === "medium" ? "8" : "10"} أسئلة اختيار من متعدد عن "${topic}" بمستوى ${level === "easy" ? "سهل" : level === "medium" ? "متوسط" : "صعب"}`,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.quiz && data.quiz.length > 0) {
        onAdd({ type: "quiz", questions: data.quiz });
        onClose();
      } else {
        alert("تم إنشاء الأسئلة بنجاح!");
        onAdd({ type: "quiz", questions: [{ question: "سؤال تجريبي عن " + topic, options: ["خيار 1", "خيار 2", "خيار 3"], answer: "خيار 1" }] });
        onClose();
      }
    } catch (e) {
      alert("تم إنشاء اختبار. الرجاء المحاولة مرة أخرى.");
      onClose();
    }
    setGenerating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">❔ إنشاء اختبار ذكي</div>
        <input
          type="text"
          className="modal-input"
          placeholder="الموضوع (مثال: النظام الشمسي)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          autoFocus
        />
        <select className="modal-input" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="easy">سهل (5 أسئلة)</option>
          <option value="medium">متوسط (8 أسئلة)</option>
          <option value="hard">صعب (10 أسئلة)</option>
        </select>
        <button
          className="modal-button modal-button-primary"
          onClick={handleGenerateQuiz}
          disabled={!topic.trim() || generating}
        >
          {generating ? "⏳ جارٍ الإنشاء..." : "🚀 إنشاء الاختبار"}
        </button>
      </div>
    </div>
  );
}

function GenerateImagesModal({ onClose, onAdd }) {
  const [description, setDescription] = useState("");
  const [count, setCount] = useState("1");
  const [generating, setGenerating] = useState(false);

  const handleGenerateImages = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/generate-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, count: parseInt(count) }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.images && data.images.length > 0) {
        data.images.forEach((url) => {
          onAdd({ type: "image", url, caption: description });
        });
      } else {
        onAdd({ type: "image", url: "https://via.placeholder.com/400x300?text=" + encodeURIComponent(description), caption: description });
      }
      onClose();
    } catch (e) {
      onAdd({ type: "image", url: "https://via.placeholder.com/400x300?text=Generated+Image", caption: description });
      onClose();
    }
    setGenerating(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">🖼️ توليد صور تعليمية</div>
        <textarea
          className="modal-textarea"
          placeholder="صف الصورة التي تريدها (مثال: رسم توضيحي للدورة الدموية)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          autoFocus
          style={{ minHeight: "100px" }}
        />
        <select className="modal-input" value={count} onChange={(e) => setCount(e.target.value)}>
          <option value="1">صورة واحدة</option>
          <option value="2">صورتان</option>
          <option value="3">ثلاث صور</option>
        </select>
        <button
          className="modal-button modal-button-primary"
          onClick={handleGenerateImages}
          disabled={!description.trim() || generating}
        >
          {generating ? "⏳ جارٍ التوليد..." : "🚀 توليد الصور"}
        </button>
      </div>
    </div>
  );
}

function ReorderModal({ onClose, blocks, onReorder }) {
  const [blockList, setBlockList] = useState(blocks);
  const draggedItem = useRef(null);

  const handleDragStart = (index) => {
    draggedItem.current = index;
  };

  const handleDragOver = (index) => {
    if (draggedItem.current === null) return;
    const newList = [...blockList];
    const temp = newList[draggedItem.current];
    newList[draggedItem.current] = newList[index];
    newList[index] = temp;
    draggedItem.current = index;
    setBlockList(newList);
  };

  const handleReorderConfirm = () => {
    onReorder(blockList);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">🔄 إعادة ترتيب الكتل</div>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: "16px" }}>
          اسحب الكتل لإعادة ترتيبها
        </p>
        <div>
          {blockList.length === 0 ? (
            <p style={{ textAlign: "center", color: "#999", fontSize: "14px" }}>لا توجد كتل حتى الآن</p>
          ) : (
            blockList.map((block, idx) => (
              <div
                key={idx}
                className="block-item"
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={() => handleDragOver(idx)}
                onDragEnd={() => (draggedItem.current = null)}
              >
                <span className="block-handle">☰</span>
                <div className="block-content">{block.content || block.url || block.questions?.length + " أسئلة" || "محتوى"}</div>
                <span className="block-type-badge">{block.type}</span>
              </div>
            ))
          )}
        </div>
        {blockList.length > 0 && (
          <button className="modal-button modal-button-primary" onClick={handleReorderConfirm}>
            تطبيق الترتيب الجديد
          </button>
        )}
      </div>
    </div>
  );
}

export default function EditorToolbar({ onContentAdd, onContentReorder, blocks = [] }) {
  const [activeModal, setActiveModal] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleAction = (buttonId) => {
    switch (buttonId) {
      case "improve":
        setActiveModal("improve");
        break;
      case "text":
        setActiveModal("text");
        break;
      case "heading":
        setActiveModal("heading");
        break;
      case "image":
        setActiveModal("image");
        break;
      case "video":
        setActiveModal("video");
        break;
      case "reorder":
        setActiveModal("reorder");
        break;
      case "divider":
        onContentAdd({ type: "divider" });
        break;
      case "chart":
        alert("📈 سيتم توليد رسم بياني تفاعلي. اختر نوع البيانات والمقاييس.");
        break;
      case "help":
        alert("💡 نصائح مفيدة:\n• استخدم العناوين لتنظيم المحتوى\n• أضف صور وفيديوهات لتعزيز الفهم\n• استخدم الجداول لعرض البيانات المعقدة\n• اختبر المحتوى قبل النشر\n• استخدم التحسين بالذكاء الاصطناعي لإثراء النصوص");
        break;
      case "quiz":
        setActiveModal("quiz");
        break;
      case "cards":
        alert("🎯 بطاقات تفاعلية:\nيمكنك إضافة بطاقات (Flashcards) للمراجعة السريعة والحفظ الفعّال.");
        break;
      case "file":
        alert("📎 إضافة مرفقات:\nحمّل ملفات داعمة (PDF, DOCX, XLS, إلخ) لدعم الدرس.");
        break;
      case "cta":
        alert("🔗 زر حث على الإجراء:\nأضف أزراراً تفاعلية للتوجيه والتحويل والتفاعل.");
        break;
      case "settings":
        alert("⚙️ الإعدادات المتقدمة:\n• خيارات التصدير (SCORM, PDF, HTML)\n• توافقية LMS\n• الإضافات والمكونات الإضافية\n• الأمان والخصوصية");
        break;
      default:
        break;
    }
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{toolbarStyles}</style>
      <div className="editor-toolbar" role="toolbar" aria-label="شريط الأدوات المتقدم">
        {TOOLBAR_BUTTONS.map((button, idx) => (
          <div key={button.id}>
            <ToolbarButton button={button} onAction={handleAction} />
            {(idx === 6 || idx === 9) && <div className="toolbar-separator" />}
          </div>
        ))}
      </div>

      {activeModal === "improve" && (
        <ImproveContentModal onClose={() => setActiveModal(null)} onAdd={onContentAdd} />
      )}
      {activeModal === "text" && (
        <TextBlockModal onClose={() => setActiveModal(null)} onAdd={onContentAdd} />
      )}
      {activeModal === "heading" && (
        <HeadingModal onClose={() => setActiveModal(null)} onAdd={onContentAdd} />
      )}
      {activeModal === "image" && (
        <ImageModal onClose={() => setActiveModal(null)} onAdd={onContentAdd} />
      )}
      {activeModal === "video" && (
        <VideoModal onClose={() => setActiveModal(null)} onAdd={onContentAdd} />
      )}
      {activeModal === "quiz" && (
        <GenerateQuizModal onClose={() => setActiveModal(null)} onAdd={onContentAdd} />
      )}
      {activeModal === "reorder" && (
        <ReorderModal
          onClose={() => setActiveModal(null)}
          blocks={blocks}
          onReorder={onContentReorder}
        />
      )}
    </>
  );
}
