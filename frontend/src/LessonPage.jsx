import React, { useState, useEffect, useRef } from "react";
import ContextualEditorToolbar from "./ContextualEditorToolbar";

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  purple: "#7c3aed",
  purpleLight: "#ede9fe",
  purpleBorder: "#c4b5fd",
  navy: "#1a237e",
  navyLight: "#e8eaf6",
  green: "#059669",
  greenLight: "#d1fae5",
  greenBorder: "#6ee7b7",
  red: "#dc2626",
  redLight: "#fee2e2",
  redBorder: "#fca5a5",
  gold: "#d97706",
  goldLight: "#fef3c7",
  gray: "#6b7280",
  grayLight: "#f3f4f6",
  grayBorder: "#e5e7eb",
  white: "#ffffff",
};

function buildStructuredLessonData(lesson = {}, summary = "", imageCards = [], video = null, simulation = null) {
  const idBase = Date.now();
  const objectives = Array.isArray(lesson?.objectives) ? lesson.objectives.map((item) => String(item || "").trim()).filter(Boolean) : [];
  const sections = Array.isArray(lesson?.sections) ? lesson.sections : [];
  const glossaryItems = Array.isArray(lesson?.keyTerms) ? lesson.keyTerms : [];

  const contentSections = [];
  sections.forEach((section, index) => {
    if (section?.heading) {
      contentSections.push({
        id: idBase + index * 2 + 1,
        type: "heading",
        content: section.heading,
        editable: true,
        order: contentSections.length + 1,
        style: { textColor: "#1a237e", backgroundColor: "#ffffff", fontSize: "18px" },
      });
    }
    if (section?.content) {
      contentSections.push({
        id: idBase + index * 2 + 2,
        type: "paragraph",
        content: section.content,
        editable: true,
        order: contentSections.length + 1,
        style: { textColor: "#334155", backgroundColor: "#f8fafc", fontSize: "15px" },
      });
    }
  });

  return {
    main: {
      title: {
        id: idBase + 1000,
        type: "title",
        content: String(lesson?.title || "").trim() || "عنوان الدرس",
        editable: true,
        order: 1,
        style: { textColor: "#1a237e", backgroundColor: "#ffffff", fontSize: "24px" },
      },
      objectives: {
        id: idBase + 1001,
        type: "objectives",
        content: objectives,
        editable: true,
        editMode: "group",
        order: 2,
        style: { textColor: "#444444", backgroundColor: "#ffffff", fontSize: "15px" },
      },
      content_sections: contentSections,
      interactive_cards: Array.isArray(imageCards)
        ? imageCards.map((card, index) => ({
            ...card,
            id: card?.id || `card-${idBase + index}`,
            interaction_type: card?.type === "comparison" ? "flip" : card?.type === "steps" ? "reveal" : "quiz",
            editable: true,
          }))
        : [],
      video: video ? { ...video, type: "video", editable: false } : null,
      simulation: simulation ? { ...simulation, type: "simulation", editable: false } : null,
    },
    sidebar: {
      summary: {
        id: idBase + 1002,
        type: "summary",
        content: String(summary || "").trim(),
        position: "top",
        editable: true,
        style: { textColor: "#333333", backgroundColor: "#eef2ff", fontSize: "14px" },
      },
      glossary: {
        id: idBase + 1003,
        type: "glossary",
        position: "bottom",
        items: glossaryItems.map((item, index) => ({
          id: idBase + 2000 + index,
          term: item?.term || "",
          definition: item?.definition || "",
        })),
        editable: true,
        style: { textColor: "#374151", backgroundColor: "#ffffff", fontSize: "13px" },
      },
    },
  };
}

// ── Count-up animation ─────────────────────────────────────────────────────
function useCountUp(target, duration = 1000) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p = Math.min((ts - start) / duration, 1);
      setVal(Math.floor(p * target));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);
  return val;
}

// ── Progress Bar ───────────────────────────────────────────────────────────
function ProgressBar({ current, total, streak }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div style={s.progressWrap}>
      <div style={s.progressMeta}>
        <span style={s.progressLabel}>السؤال {current} من {total}</span>
        {streak >= 2 && <span style={s.streakBadge}>🔥 {streak} متتالية</span>}
        <span style={s.progressPct}>{pct}%</span>
      </div>
      <div style={s.progressTrack}>
        <div style={{ ...s.progressFill, width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Question Card ──────────────────────────────────────────────────────────
function QuestionCard({ question, index, total, onAnswer, streak }) {
  const [chosen, setChosen] = useState(null);
  const [revealed, setRevealed] = useState(false);
  const [animIn, setAnimIn] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    requestAnimationFrame(() => setAnimIn(true));
    return () => clearTimeout(timerRef.current);
  }, []);

  const pick = (opt) => {
    if (revealed) return;
    setChosen(opt);
    setRevealed(true);
    const correct = opt === question.answer;
    timerRef.current = setTimeout(() => onAnswer(correct), 2000);
  };

  const isCorrect = chosen === question.answer;

  return (
    <div style={{ ...s.qCard, opacity: animIn ? 1 : 0, transform: animIn ? "translateY(0)" : "translateY(20px)", transition: "opacity 0.4s, transform 0.4s" }}>
      <ProgressBar current={index + 1} total={total} streak={streak} />

      {/* Question bubble */}
      <div style={s.qBubble}>
        <div style={s.qNumBadge}>س{index + 1}</div>
        <p style={s.qText}>{question.question}</p>
      </div>

      {/* Options */}
      <div style={s.optionsGrid}>
        {question.options.map((opt) => {
          const isChosen = chosen === opt;
          const isAnswer = opt === question.answer;
          let style = { ...s.optBtn };

          if (revealed) {
            if (isAnswer) style = { ...style, background: C.greenLight, border: `2px solid ${C.greenBorder}`, color: C.green, transform: "scale(1.01)" };
            else if (isChosen) style = { ...style, background: C.redLight, border: `2px solid ${C.redBorder}`, color: C.red };
            else style = { ...style, opacity: 0.5 };
          } else if (isChosen) {
            style = { ...style, background: C.purpleLight, border: `2px solid ${C.purpleBorder}`, color: C.purple };
          }

          return (
            <button key={opt} onClick={() => pick(opt)} disabled={revealed} style={{ ...style, cursor: revealed ? "default" : "pointer" }}>
              <span style={s.optLetter}>{revealed && isAnswer ? "✓" : revealed && isChosen ? "✗" : ""}</span>
              <span style={{ flex: 1 }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {revealed && (
        <div style={{ ...s.feedback, background: isCorrect ? C.greenLight : C.redLight, border: `1px solid ${isCorrect ? C.greenBorder : C.redBorder}`, color: isCorrect ? C.green : C.red }}>
          <span style={{ fontSize: "22px" }}>{isCorrect ? "🎉" : "💡"}</span>
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "14px" }}>{isCorrect ? "إجابة صحيحة!" : "إجابة خاطئة"}</p>
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.6 }}>{question.explanation}</p>
          </div>
        </div>
      )}

      {revealed && (
        <button style={s.nextBtn} onClick={() => { clearTimeout(timerRef.current); onAnswer(isCorrect); }}>
          {index + 1 < total ? "السؤال التالي ←" : "عرض النتائج ←"}
        </button>
      )}
    </div>
  );
}

// ── Results ────────────────────────────────────────────────────────────────
function Results({ questions, answers, onRetry, onClose }) {
  const score = answers.filter(Boolean).length;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const animPct = useCountUp(pct);

  const grade =
    pct === 100 ? { emoji: "🏆", label: "ممتاز!", color: C.gold, bg: C.goldLight }
    : pct >= 80  ? { emoji: "🌟", label: "جيد جداً", color: C.green, bg: C.greenLight }
    : pct >= 60  ? { emoji: "👍", label: "جيد", color: "#2563eb", bg: "#dbeafe" }
    :              { emoji: "📚", label: "راجع الدرس", color: C.red, bg: C.redLight };

  return (
    <div style={s.resultsWrap}>
      {/* Score circle */}
      <div style={s.scoreCircleWrap}>
        <svg width="160" height="160" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="80" cy="80" r="68" fill="none" stroke={C.navyLight} strokeWidth="10" />
          <circle cx="80" cy="80" r="68" fill="none" stroke={grade.color} strokeWidth="10"
            strokeDasharray={`${2 * Math.PI * 68}`}
            strokeDashoffset={`${2 * Math.PI * 68 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s ease" }} />
        </svg>
        <div style={s.scoreCircleInner}>
          <span style={{ fontSize: "28px" }}>{grade.emoji}</span>
          <span style={{ fontSize: "32px", fontWeight: 800, color: grade.color, lineHeight: 1 }}>{animPct}%</span>
          <span style={{ fontSize: "12px", color: C.gray }}>{score}/{total} صحيح</span>
        </div>
      </div>

      <div style={{ ...s.gradeBadge, background: grade.bg, color: grade.color }}>{grade.label}</div>

      {/* Review */}
      <div style={s.reviewWrap}>
        <p style={s.reviewTitle}>📋 مراجعة الإجابات</p>
        {questions.map((q, i) => (
          <div key={i} style={{ ...s.reviewItem, borderRight: `4px solid ${answers[i] ? C.green : C.red}` }}>
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
              <span style={{ ...s.reviewBadge, background: answers[i] ? C.greenLight : C.redLight, color: answers[i] ? C.green : C.red }}>
                {answers[i] ? "✓ صحيح" : "✗ خطأ"}
              </span>
              <p style={s.reviewQ}>{q.question}</p>
            </div>
            {!answers[i] && <p style={s.reviewAnswer}>الإجابة الصحيحة: <strong>{q.answer}</strong></p>}
          </div>
        ))}
      </div>

      <div style={s.resultActions}>
        <button style={s.retryBtn} onClick={onRetry}>🔄 إعادة الاختبار</button>
        {onClose && <button style={s.closeResultBtn} onClick={onClose}>✕ إغلاق</button>}
      </div>
    </div>
  );
}

// ── Simulation Block ───────────────────────────────────────────────────────
function SimulationBlock({ simulation }) {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [selected, setSelected] = useState(null);
  const [inputVal, setInputVal] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [score, setScore] = useState(0);

  if (!simulation || !simulation.steps?.length) return null;

  const steps = simulation.steps;
  const current = steps[step];

  const handleChoice = (choice) => {
    if (feedback) return;
    setSelected(choice.id);
    setFeedback({ correct: choice.correct, text: choice.feedback });
    if (choice.correct) setScore(s => s + 1);
  };

  const handleInput = () => {
    if (!inputVal.trim() || feedback) return;
    const keywords = current.expectedKeywords || [];
    const lower = inputVal.toLowerCase();
    const matched = keywords.filter(k => lower.includes(k.toLowerCase()));
    const correct = matched.length >= Math.ceil(keywords.length / 2);
    setFeedback({
      correct,
      text: correct
        ? `✓ إجابة جيدة! ذكرت ${matched.length} من المفاهيم الأساسية.`
        : `يمكن تحسين إجابتك. المفاهيم المهمة: ${keywords.join("، ")}`,
    });
    if (correct) setScore(s => s + 1);
  };

  const nextStep = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
      setSelected(null);
      setInputVal("");
      setFeedback(null);
      setShowHint(false);
    } else {
      setDone(true);
    }
  };

  const reset = () => {
    setStep(0); setDone(false); setSelected(null);
    setInputVal(""); setFeedback(null); setShowHint(false); setScore(0);
  };

  const pct = Math.round((score / steps.length) * 100);

  return (
    <div style={{ background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", border: "2px solid #6ee7b7", borderRadius: "18px", overflow: "visible" }}>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg, #059669, #34d399)", padding: "16px 20px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "42px", height: "42px", background: "rgba(255,255,255,0.2)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px" }}>🧪</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "16px", color: "#fff" }}>محاكاة تفاعلية</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>{simulation.role || "طالب"} · {steps.length} خطوات</div>
        </div>
        {!done && <div style={{ background: "rgba(255,255,255,0.2)", borderRadius: "20px", padding: "4px 14px", fontSize: "13px", color: "#fff", fontWeight: 700 }}>{step + 1}/{steps.length}</div>}
      </div>

      <div style={{ padding: "20px" }}>
        {/* Scenario */}
        <div style={{ background: "#fff", borderRadius: "12px", padding: "14px 16px", marginBottom: "16px", border: "1px solid #a7f3d0", display: "flex", gap: "10px" }}>
          <span style={{ fontSize: "18px", flexShrink: 0 }}>📋</span>
          <p style={{ margin: 0, fontSize: "14px", color: "#065f46", lineHeight: 1.7 }}>{simulation.scenario}</p>
        </div>

        {!done ? (
          <>
            {/* Progress bar */}
            <div style={{ display: "flex", gap: "4px", marginBottom: "18px" }}>
              {steps.map((_, i) => (
                <div key={i} style={{ flex: 1, height: "5px", borderRadius: "3px", background: i < step ? "#059669" : i === step ? "#34d399" : "#d1fae5", transition: "all 0.3s" }} />
              ))}
            </div>

            {/* Step card */}
            <div style={{ background: "#fff", borderRadius: "14px", padding: "20px", border: "1px solid #a7f3d0", marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                <div style={{ width: "30px", height: "30px", background: "linear-gradient(135deg, #059669, #34d399)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{step + 1}</div>
                <div style={{ fontWeight: 700, fontSize: "16px", color: "#065f46" }}>{current?.title}</div>
              </div>

              <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#374151", lineHeight: 1.8, background: "#f0fdf4", borderRadius: "10px", padding: "12px" }}>{current?.description}</p>

              <div style={{ fontWeight: 600, fontSize: "15px", color: "#065f46", marginBottom: "14px" }}>❓ {current?.question}</div>

              {/* CHOICE type */}
              {current?.type === "choice" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {current.choices?.map((choice) => {
                    let bg = "#f9fafb", border = "2px solid #e5e7eb", color = "#374151";
                    if (feedback && selected === choice.id) {
                      bg = choice.correct ? "#d1fae5" : "#fee2e2";
                      border = `2px solid ${choice.correct ? "#6ee7b7" : "#fca5a5"}`;
                      color = choice.correct ? "#065f46" : "#991b1b";
                    } else if (feedback && choice.correct) {
                      bg = "#d1fae5"; border = "2px solid #6ee7b7"; color = "#065f46";
                    }
                    return (
                      <button key={choice.id} onClick={() => handleChoice(choice)} disabled={!!feedback}
                        style={{ display: "flex", alignItems: "center", gap: "12px", padding: "13px 16px", background: bg, border, borderRadius: "12px", cursor: feedback ? "default" : "pointer", textAlign: "right", transition: "all 0.2s", width: "100%" }}>
                        <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: feedback && choice.correct ? "#059669" : feedback && selected === choice.id ? "#dc2626" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, color: feedback ? "#fff" : "#6b7280", flexShrink: 0 }}>
                          {feedback && choice.correct ? "✓" : feedback && selected === choice.id ? "✗" : choice.id.toUpperCase()}
                        </div>
                        <span style={{ fontSize: "14px", fontWeight: 500, color, flex: 1 }}>{choice.text}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* INPUT type */}
              {current?.type === "input" && (
                <div style={{ position: "relative", zIndex: 1 }}>
                  <textarea
                    value={inputVal}
                    onChange={(e) => { if (!feedback) setInputVal(e.target.value); }}
                    placeholder="اكتب إجابتك هنا..."
                    rows={4}
                    style={{ width: "100%", padding: "12px 14px", border: `2px solid ${feedback ? "#d1fae5" : "#a7f3d0"}`, borderRadius: "12px", fontSize: "14px", lineHeight: 1.7, resize: "none", fontFamily: "inherit", direction: "rtl", outline: "none", background: feedback ? "#f9fafb" : "#fff", color: "#1f2937", boxSizing: "border-box", display: "block" }}
                  />
                  {!feedback && (
                    <button onClick={handleInput} disabled={!inputVal.trim()}
                      style={{ marginTop: "10px", background: inputVal.trim() ? "linear-gradient(135deg, #059669, #34d399)" : "#e5e7eb", color: inputVal.trim() ? "#fff" : "#9ca3af", border: "none", borderRadius: "10px", padding: "10px 24px", fontWeight: 700, cursor: inputVal.trim() ? "pointer" : "default", fontSize: "14px" }}>
                      تحقق من الإجابة ✓
                    </button>
                  )}
                </div>
              )}

              {/* Feedback */}
              {feedback && (
                <div style={{ marginTop: "14px", background: feedback.correct ? "#d1fae5" : "#fee2e2", border: `1px solid ${feedback.correct ? "#6ee7b7" : "#fca5a5"}`, borderRadius: "12px", padding: "14px 16px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "20px", flexShrink: 0 }}>{feedback.correct ? "🎉" : "💡"}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: feedback.correct ? "#065f46" : "#991b1b", marginBottom: "4px" }}>{feedback.correct ? "إجابة صحيحة!" : "ليست الإجابة المثلى"}</div>
                    <div style={{ fontSize: "13px", color: feedback.correct ? "#047857" : "#b91c1c", lineHeight: 1.6 }}>{feedback.text}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Hint */}
            {current?.hint && (
              <div style={{ marginBottom: "14px" }}>
                <button onClick={() => setShowHint(!showHint)}
                  style={{ background: "none", border: "1px dashed #6ee7b7", borderRadius: "8px", padding: "6px 14px", fontSize: "12px", color: "#059669", cursor: "pointer", fontWeight: 600 }}>
                  {showHint ? "🙈 إخفاء التلميح" : "💡 أحتاج تلميحاً"}
                </button>
                {showHint && (
                  <div style={{ marginTop: "8px", background: "#fef3c7", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", color: "#92400e", border: "1px solid #fde68a" }}>
                    {current.hint}
                  </div>
                )}
              </div>
            )}

            {/* Next button - only shows after answering */}
            {feedback && (
              <button onClick={nextStep}
                style={{ width: "100%", background: "linear-gradient(135deg, #059669, #34d399)", color: "#fff", border: "none", borderRadius: "12px", padding: "13px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}>
                {step < steps.length - 1 ? `الخطوة التالية ← (${step + 2}/${steps.length})` : "عرض النتيجة النهائية 🏆"}
              </button>
            )}
          </>
        ) : (
          /* Results screen */
          <div style={{ background: "#fff", borderRadius: "16px", padding: "28px", textAlign: "center", border: "1px solid #6ee7b7" }}>
            <div style={{ fontSize: "56px", marginBottom: "12px" }}>{pct === 100 ? "🏆" : pct >= 75 ? "🌟" : pct >= 50 ? "👍" : "📚"}</div>
            <div style={{ fontWeight: 800, fontSize: "28px", color: "#059669", marginBottom: "4px" }}>{pct}%</div>
            <div style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>{score} من {steps.length} خطوات صحيحة</div>
            {simulation.outcome && (
              <div style={{ background: "#f0fdf4", borderRadius: "12px", padding: "14px", marginBottom: "20px", fontSize: "14px", color: "#065f46", lineHeight: 1.7, border: "1px solid #a7f3d0" }}>
                <strong>ما تعلمته:</strong> {simulation.outcome}
              </div>
            )}
            <button onClick={reset}
              style={{ background: "linear-gradient(135deg, #059669, #34d399)", color: "#fff", border: "none", borderRadius: "12px", padding: "12px 28px", fontWeight: 700, cursor: "pointer", fontSize: "15px" }}>
              🔄 إعادة المحاكاة
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Visual Card Component ──────────────────────────────────────────────────
function VisualCard({ card }) {
  const c = card.color || "#7c3aed";
  const light = c + "18";

  if (card.type === "comparison") {
    return (
      <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${c}33`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)`, padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>⚖️</span>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>{card.title}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0" }}>
          <div style={{ padding: "16px 20px", borderLeft: `2px solid ${c}33` }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: c, marginBottom: "10px", textAlign: "center", background: light, borderRadius: "8px", padding: "6px" }}>{card.left?.label}</div>
            {card.left?.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px", fontSize: "13px", color: "#374151" }}>
                <span style={{ color: c, fontWeight: 700, flexShrink: 0 }}>•</span>{item}
              </div>
            ))}
          </div>
          <div style={{ padding: "16px 20px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", color: c, marginBottom: "10px", textAlign: "center", background: light, borderRadius: "8px", padding: "6px" }}>{card.right?.label}</div>
            {card.right?.items?.map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "8px", fontSize: "13px", color: "#374151" }}>
                <span style={{ color: c, fontWeight: 700, flexShrink: 0 }}>•</span>{item}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (card.type === "steps") {
    return (
      <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${c}33`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
        <div style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)`, padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "18px" }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>{card.title}</span>
        </div>
        <div style={{ padding: "16px 20px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
          {card.steps?.map((step, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "12px", background: light, borderRadius: "10px", padding: "12px" }}>
              <div style={{ width: "28px", height: "28px", background: c, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 800, color: "#fff", flexShrink: 0 }}>{step.num}</div>
              <span style={{ fontSize: "13px", color: "#374151", lineHeight: 1.6, flex: 1 }}>{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default: diagram (list)
  return (
    <div style={{ background: "#fff", borderRadius: "14px", border: `1px solid ${c}33`, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
      <div style={{ background: `linear-gradient(135deg, ${c}, ${c}cc)`, padding: "14px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
        <span style={{ fontSize: "18px" }}>🔷</span>
        <span style={{ fontWeight: 700, fontSize: "16px", color: "#fff" }}>{card.title}</span>
      </div>
      <div style={{ padding: "16px 20px" }}>
        {card.description && <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#555", lineHeight: 1.7, background: light, borderRadius: "8px", padding: "10px 14px" }}>{card.description}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px" }}>
          {card.items?.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", background: light, borderRadius: "10px", padding: "10px 14px" }}>
              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: c, flexShrink: 0 }} />
              <span style={{ fontSize: "13px", color: "#374151", fontWeight: 500 }}>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Inline Quiz Runner ─────────────────────────────────────────────────────
function InlineQuizRunner({ block }) {
  const questions = block.questions || [];
  const [phase, setPhase] = useState("start"); // start | running | results
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [streak, setStreak] = useState(0);

  const handleAnswer = (correct) => {
    const nextAnswers = [...answers, correct];
    setAnswers(nextAnswers);
    setStreak(correct ? streak + 1 : 0);
    if (current + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrent(current + 1);
    }
  };

  const handleRetry = () => {
    setCurrent(0);
    setAnswers([]);
    setStreak(0);
    setPhase("running");
  };

  if (!questions.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "4px 0" }}>
        <div style={{ width: "40px", height: "40px", background: C.purpleLight, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>❔</div>
        <div style={{ fontWeight: 700, fontSize: "14px", color: C.navy }}>اختبار (لا توجد أسئلة)</div>
      </div>
    );
  }

  if (phase === "start") {
    return (
      <div style={{ textAlign: "center", padding: "24px 16px" }}>
        <div style={{ fontSize: "40px", marginBottom: "12px" }}>🎓</div>
        <div style={{ fontWeight: 800, fontSize: "18px", color: C.navy, marginBottom: "6px" }}>
          {block.title || "اختبار تفاعلي"}
        </div>
        <div style={{ fontSize: "13px", color: C.gray, marginBottom: "20px" }}>
          {questions.length} سؤال اختيار من متعدد — هل أنت مستعد؟
        </div>
        <button
          onClick={() => setPhase("running")}
          style={{ background: `linear-gradient(135deg, ${C.purple}, #5b21b6)`, color: "#fff", border: "none", borderRadius: "14px", padding: "13px 32px", fontWeight: 800, cursor: "pointer", fontSize: "15px", fontFamily: "inherit" }}
        >
          ابدأ الاختبار ←
        </button>
      </div>
    );
  }

  if (phase === "results") {
    return <Results questions={questions} answers={answers} onRetry={handleRetry} />;
  }

  return (
    <QuestionCard
      question={questions[current]}
      index={current}
      total={questions.length}
      onAnswer={handleAnswer}
      streak={streak}
    />
  );
}

// ── Lesson Intro ───────────────────────────────────────────────────────────
function ContentBlock({ block, onEdit, onDelete, isDragging, dragHandlers }) {
  const typeLabels = { text: "نص", heading: "عنوان", image: "صورة", video: "فيديو", chart: "مخطط", quiz: "اختبار", divider: "فاصل" };
  
  if (!block) {
    console.warn("[ContentBlock] Block is null or undefined");
    return null;
  }

  const embedUrl = (url) => {
    if (!url) return url;
    if (url.includes("youtube.com/watch")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "youtube.com/embed/");
    if (url.includes("youtube.com/embed")) return url;
    return url;
  };
  const isDirectVideo = (url) => /\.(mp4|webm|ogg)(\?|$)/i.test(url || "") || String(url || "").startsWith("blob:") || String(url || "").startsWith("data:video");
  if (block.type === "divider") return <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, #c4b5fd, transparent)", margin: "4px 0" }} />;
  
  const blockStyle = block.style || {};
  
  return (
    <div draggable {...dragHandlers} style={{ borderRadius: "14px", border: `1px solid ${blockStyle.borderColor || "#e8eaf6"}`, background: blockStyle.backgroundColor || "#fff", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", cursor: dragHandlers ? "grab" : "default", opacity: isDragging ? 0.5 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderBottom: "1px solid #f3f4f6", background: blockStyle.headerBg || "#fafafa", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {dragHandlers && <span style={{ cursor: "grab", fontSize: "16px" }}>⋮⋮</span>}
          <span style={{ fontSize: "11px", fontWeight: 700, color: "#7c3aed", background: "#ede9fe", padding: "2px 10px", borderRadius: "20px" }}>{typeLabels[block.type] || block.type}</span>
          {block.type === "image" && <span style={{ fontSize: "11px", color: "#9ca3af" }}>صورة مخصصة</span>}
          {block.type === "video" && <span style={{ fontSize: "11px", color: "#9ca3af" }}>فيديو مدرج</span>}
          {block.type === "chart" && <span style={{ fontSize: "11px", color: "#9ca3af" }}>رسم تعليمي</span>}
        </div>
        {(onEdit || onDelete) && (
          <div style={{ display: "flex", gap: "6px" }}>
            {onEdit && <button onClick={() => onEdit(block)} style={{ padding: "4px 8px", fontSize: "12px", border: "none", borderRadius: "6px", background: "#e8eaf6", color: "#7c3aed", cursor: "pointer", fontWeight: 600 }}>✏️ تحرير</button>}
            {onDelete && <button onClick={() => onDelete(block.id)} style={{ padding: "4px 8px", fontSize: "12px", border: "none", borderRadius: "6px", background: "#fee2e2", color: "#dc2626", cursor: "pointer", fontWeight: 600 }}>🗑️ حذف</button>}
          </div>
        )}
      </div>
      <div style={{ padding: block.type === "video" ? "0" : "16px" }}>
        {block.type === "text" && (
          <p style={{ margin: "0", fontSize: blockStyle.fontSize || "15px", lineHeight: blockStyle.lineHeight || 1.8, color: blockStyle.textColor || "#374151",
            fontWeight: block.format?.bold ? 700 : 400,
            fontStyle: block.format?.italic ? "italic" : "normal",
            textDecoration: block.format?.underline ? "underline" : "none",
            textAlign: block.format?.align || "right",
            backgroundColor: blockStyle.contentBg || "transparent",
            padding: blockStyle.contentBg ? "12px" : "0",
            borderRadius: blockStyle.contentBg ? "8px" : "0" }}>{block.content}</p>
        )}
        {block.type === "heading" && (
          <h3 style={{ margin: "0", fontSize: blockStyle.fontSize || (block.level === "h1" ? "22px" : block.level === "h2" ? "18px" : "15px"), fontWeight: 700, color: blockStyle.textColor || "#1a237e", backgroundColor: blockStyle.contentBg || "transparent", padding: blockStyle.contentBg ? "12px" : "0", borderRadius: blockStyle.contentBg ? "8px" : "0" }}>{block.content}</h3>
        )}
        {block.type === "image" && (
          <div>
            {block.svg ? (
              <div dangerouslySetInnerHTML={{ __html: block.svg }} />
            ) : (
              <img src={block.url} alt={block.caption || "صورة"} style={{ width: "100%", maxHeight: "360px", objectFit: "cover", display: "block" }}
                onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=350&fit=crop"; }} />
            )}
            {block.caption && (
              <div style={{ padding: "10px 16px", fontSize: "13px", color: "#6b7280", fontStyle: "italic", borderTop: "1px solid #f3f4f6" }}>📷 {block.caption}</div>
            )}
          </div>
        )}
        {block.type === "video" && (
          isDirectVideo(block.url) || block.videoType === "file" ? (
            <video src={block.url} controls style={{ display: "block", width: "100%", maxHeight: "420px", background: "#000" }} />
          ) : (
            <div style={{ position: "relative", width: "100%", paddingBottom: "56.25%", height: "0", overflow: "hidden", background: "#000" }}>
              <iframe src={block.embedUrl || embedUrl(block.url)} style={{ position: "absolute", top: "0", left: "0", width: "100%", height: "100%", border: "none" }}
                allowFullScreen title={block.caption || "فيديو"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
            </div>
          )
        )}
        {block.type === "chart" && block.svg && (
          <div>
            <div dangerouslySetInnerHTML={{ __html: block.svg }} />
            {block.caption && <div style={{ paddingTop: "10px", fontSize: "13px", color: "#6b7280" }}>{block.caption}</div>}
          </div>
        )}
        {block.type === "quiz" && (
          <InlineQuizRunner block={block} />
        )}
      </div>
    </div>
  );
}

function LessonIntro({
  structuredLesson,
  questionsCount,
  onStart,
  contentBlocks,
  onContentAdd,
  onContentReorder,
  onEditBlock,
  onDeleteBlock,
  onDragStart,
  onDragOver,
  onDrop,
  draggedBlock,
  onEditTitle,
  onEditObjectives,
  onEditSection,
  onDeleteSection,
  onAddSection,
  onEditCard,
  onDeleteCard,
  onEditSummary,
  onEditGlossary,
}) {
  const { main, sidebar } = structuredLesson;
  if (main.simulation) console.log("✅ Simulation received:", main.simulation.steps?.length, "steps");

  const actionBtn = {
    padding: "4px 8px",
    borderRadius: "6px",
    border: "none",
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
  };

  return (
    <div style={s.introWrap}>
      {/* ── العمود الرئيسي ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        <div style={s.heroStrip}>
          <div style={s.heroStat}>
            <span style={s.heroLabel}>الأقسام</span>
            <span style={s.heroValue}>{main.content_sections?.length || 0}</span>
          </div>
          <div style={s.heroStat}>
            <span style={s.heroLabel}>المصطلحات</span>
            <span style={s.heroValue}>{sidebar.glossary?.items?.length || 0}</span>
          </div>
          <div style={s.heroStat}>
            <span style={s.heroLabel}>أسئلة التقييم</span>
            <span style={s.heroValue}>{questionsCount}</span>
          </div>
        </div>

        <div style={s.sectionBlock}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", marginBottom: "12px" }}>
            <div style={s.sectionHeadingWrap}>
              <div style={s.sectionLine} />
              <h2 style={{ ...s.sectionHeading, fontSize: main.title?.style?.fontSize || "24px", color: main.title?.style?.textColor || C.navy }}>{main.title?.content}</h2>
            </div>
            <button style={{ ...actionBtn, background: "#e8eaf6", color: "#7c3aed" }} onClick={onEditTitle}>✏️ تحرير</button>
          </div>
        </div>

        {main.objectives?.content?.length > 0 && (
          <div style={{ ...s.block, background: main.objectives?.style?.backgroundColor || s.block.background }}>
            <div style={{ ...s.blockHeader, justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={s.blockHeaderIcon}>🎯</span>
                <span style={s.blockHeaderTitle}>أهداف الدرس</span>
              </div>
              <button style={{ ...actionBtn, background: "#e8eaf6", color: "#7c3aed" }} onClick={onEditObjectives}>✏️ تعديل جماعي</button>
            </div>
            <ul style={s.objList}>
              {main.objectives.content.map((objective, index) => (
                <li key={index} style={{ ...s.objItem, color: main.objectives?.style?.textColor || "#444", fontSize: main.objectives?.style?.fontSize || "15px" }}>
                  <span style={s.objDot} />
                  {objective}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ fontWeight: 700, color: C.navy, fontSize: "14px" }}>شرح الدرس</span>
          <button style={{ ...actionBtn, background: "#dcfce7", color: "#166534" }} onClick={onAddSection}>+ إضافة فقرة</button>
        </div>

        {main.content_sections?.map((section) => (
          <div key={section.id} style={s.sectionBlock}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              {section.type === "heading" ? (
                <div style={s.sectionHeadingWrap}>
                  <div style={s.sectionLine} />
                  <h3 style={{ ...s.sectionHeading, fontSize: section.style?.fontSize || "16px", color: section.style?.textColor || C.navy }}>{section.content}</h3>
                </div>
              ) : (
                <span style={{ fontSize: "12px", fontWeight: 700, color: "#64748b", background: "#f1f5f9", borderRadius: "8px", padding: "4px 8px" }}>{section.type}</span>
              )}
              <div style={{ display: "flex", gap: "6px" }}>
                <button style={{ ...actionBtn, background: "#e8eaf6", color: "#7c3aed" }} onClick={() => onEditSection(section)}>✏️ تحرير</button>
                <button style={{ ...actionBtn, background: "#fee2e2", color: "#dc2626" }} onClick={() => onDeleteSection(section.id)}>🗑️ حذف</button>
              </div>
            </div>
            {section.type !== "heading" && (
              <p style={{ ...s.sectionContent, color: section.style?.textColor || "#334155", fontSize: section.style?.fontSize || "15px", background: section.style?.backgroundColor || "#f8fafc" }}>
                {section.content}
              </p>
            )}
          </div>
        ))}

        {/* ── بطاقات توضيحية ── */}
        {main.interactive_cards?.length > 0 && (
          <div style={s.block}>
            <div style={s.blockHeader}>
              <span style={s.blockHeaderIcon}>🖼️</span>
              <span style={s.blockHeaderTitle}>بطاقات توضيحية تفاعلية</span>
              <span style={{ marginRight: "auto", fontSize: "11px", color: "#9ca3af", background: "#f3f4f6", borderRadius: "6px", padding: "2px 8px" }}>Claude AI</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {main.interactive_cards.map((card) => (
                <div key={card.id}>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "6px", marginBottom: "8px" }}>
                    <button style={{ ...actionBtn, background: "#e8eaf6", color: "#7c3aed" }} onClick={() => onEditCard(card)}>✏️ تحرير</button>
                    <button style={{ ...actionBtn, background: "#fee2e2", color: "#dc2626" }} onClick={() => onDeleteCard(card.id)}>🗑️ حذف</button>
                  </div>
                  <VisualCard card={card} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── فيديو تعليمي ── */}
        {main.video && (
          <div style={s.block}>
            <div style={s.blockHeader}>
              <span style={s.blockHeaderIcon}>🎬</span>
              <span style={s.blockHeaderTitle}>فيديو تعليمي مقترح</span>
            </div>
            <a href={main.video.url} target="_blank" rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "14px", padding: "16px", background: "#fee2e2", borderRadius: "12px", textDecoration: "none", border: "1px solid #fca5a5" }}>
              <div style={{ width: "52px", height: "52px", background: "#dc2626", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "24px", flexShrink: 0 }}>▶️</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "14px", color: "#dc2626", marginBottom: "4px" }}>ابحث على YouTube</div>
                <div style={{ fontSize: "13px", color: "#555" }}>{main.video.searchQuery}</div>
              </div>
              <div style={{ marginRight: "auto", fontSize: "20px", color: "#dc2626" }}>←</div>
            </a>
          </div>
        )}

        {/* ── محاكاة تفاعلية ── */}
        {main.simulation && <SimulationBlock simulation={main.simulation} />}

        {/* ── المحتوى المضاف من الشريط ── يُدرج مباشرة داخل الدرس */}
        {contentBlocks?.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, #c4b5fd, transparent)" }} />
              <span style={{ fontSize: "12px", fontWeight: 700, color: "#7c3aed", whiteSpace: "nowrap" }}>✨ محتوى الدرس القابل للتعديل</span>
              <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, #c4b5fd)" }} />
            </div>
            {contentBlocks.map((block) => {
              try {
                return (
                  <ContentBlock
                    key={block?.id || Date.now()}
                    block={block}
                    onEdit={onEditBlock}
                    onDelete={onDeleteBlock}
                    isDragging={draggedBlock?.id === block?.id}
                    dragHandlers={{
                      onDragStart: () => onDragStart(block),
                      onDragOver: onDragOver,
                      onDrop: () => onDrop(block)
                    }}
                  />
                );
              } catch (error) {
                console.error("[LessonPage] ContentBlock render error:", { block, error: error.message });
                return <div style={{ padding: "16px", background: "#fff5f5", borderRadius: "8px", color: "#b91c1c", fontSize: "12px" }}>خطأ في عرض كتلة المحتوى: {error.message}</div>;
              }
            })}
          </div>
        )}
      </div>

      {/* ── الـ Sidebar ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
        {/* CTA */}
        <div style={s.ctaBlock}>
          <p style={s.ctaTitle}>هل أنت مستعد؟</p>
          <p style={s.ctaSub}>{questionsCount} أسئلة · تغذية راجعة فورية</p>
          <button style={{ ...s.startBtn, width: "100%", marginTop: "16px" }} onClick={onStart}>ابدأ الاختبار 🚀</button>
        </div>

        <div style={s.summaryBlock}>
          <div style={{ ...s.blockHeader, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={s.blockHeaderIcon}>📋</span>
              <span style={s.blockHeaderTitle}>الملخص</span>
            </div>
            <button style={{ ...actionBtn, background: "#e8eaf6", color: "#7c3aed" }} onClick={onEditSummary}>✏️ تحرير</button>
          </div>
          <p style={{ ...s.summaryText, color: sidebar.summary?.style?.textColor || "#333", fontSize: sidebar.summary?.style?.fontSize || "14px", background: sidebar.summary?.style?.backgroundColor || "transparent", borderRadius: "10px", padding: "10px 12px" }}>
            {sidebar.summary?.content}
          </p>
        </div>

        <div style={s.block}>
          <div style={{ ...s.blockHeader, justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={s.blockHeaderIcon}>📚</span>
              <span style={s.blockHeaderTitle}>المصطلحات</span>
            </div>
            <button style={{ ...actionBtn, background: "#e8eaf6", color: "#7c3aed" }} onClick={onEditGlossary}>✏️ تحرير</button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {sidebar.glossary?.items?.map((item) => (
              <div key={item.id} style={{ ...s.termCard, background: sidebar.glossary?.style?.backgroundColor && sidebar.glossary.style.backgroundColor !== "transparent" ? sidebar.glossary.style.backgroundColor : s.termCard.background }}>
                <span style={{ ...s.termWord, color: sidebar.glossary?.style?.textColor || C.purple, fontSize: sidebar.glossary?.style?.fontSize || "14px" }}>{item.term}</span>
                <span style={{ ...s.termDef, color: sidebar.glossary?.style?.textColor ? sidebar.glossary.style.textColor + "cc" : "#555", fontSize: sidebar.glossary?.style?.fontSize ? `calc(${sidebar.glossary.style.fontSize} - 1px)` : "13px" }}>{item.definition}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Export ────────────────────────────────────────────────────────────
// ── Audio Reader Hook (AWS Polly) ──────────────────────────────────────────
const POLLY_VOICES = [
  { id: "Hala",  label: "🙎‍♀️ هالة (أنثى - عصبي)" },
  { id: "Zayd",  label: "🙎‍♂️ زيد (ذكر - عصبي)" },
  { id: "Zeina", label: "🙎‍♀️ زينة (أنثى - قياسي)" },
];

function useAudioReader(lesson, summary) {
  const [speaking, setSpeaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [audioError, setAudioError] = useState("");
  const [selectedVoice, setSelectedVoice] = useState("Hala");
  const audioRef = useRef(null);
  const abortRef = useRef(null);

  const buildText = () => {
    const parts = [];
    parts.push(`درس: ${lesson.title}.`);
    if (lesson.objectives?.length) {
      parts.push("أهداف الدرس:");
      lesson.objectives.forEach((o, i) => parts.push(`${i + 1}. ${o}.`));
    }
    lesson.sections?.forEach(sec => {
      parts.push(`${sec.heading}.`);
      parts.push(sec.content);
    });
    if (summary) parts.push(`الملخص: ${summary}.`);
    return parts.join(" ");
  };

  const stop = () => {
    abortRef.current?.abort();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setSpeaking(false);
    setLoading(false);
  };

  const toggle = async () => {
    if (speaking || loading) { stop(); return; }
    setAudioError("");
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const text = buildText().slice(0, 2900);
      const res = await fetch(`/api/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoice }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "فشل تحميل الصوت");
      }
      const blob = await res.blob();
      if (!blob || blob.size === 0 || !String(blob.type || "").startsWith("audio/")) {
        throw new Error("تم استلام استجابة غير صوتية من الخادم");
      }
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setSpeaking(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setSpeaking(false); setLoading(false); URL.revokeObjectURL(url); };
      setLoading(false);
      setSpeaking(true);
      await audio.play();
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("TTS error:", err);
        setSpeaking(false);
        setAudioError(err.message || "تعذر تشغيل الصوت");
      }
      setLoading(false);
    }
  };

  // Stop on unmount
  useEffect(() => () => stop(), []);

  return { speaking, loading, toggle, selectedVoice, setSelectedVoice, audioError };
}

export default function LessonPage({ lessonData, onClose, onContentBlocksChange, contentBlocks: externalContentBlocks, setContentBlocks: setExternalContentBlocks }) {
  const { lesson, summary, quiz: questions, images, imageCards, video, simulation, conceptMap } = lessonData;
  
  console.log("LessonPage:", { hasSimulation: !!simulation, simSteps: simulation?.steps?.length, hasImageCards: !!imageCards });
  const [phase, setPhase] = useState("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [streak, setStreak] = useState(0);
  const [structuredLesson, setStructuredLesson] = useState(() => buildStructuredLessonData(lesson, summary, imageCards, video, simulation));
  const [internalContentBlocks, setInternalContentBlocks] = useState([]);
  const [showToolbar, setShowToolbar] = useState(true);
  const [editingBlock, setEditingBlock] = useState(null);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const { speaking, loading, toggle, selectedVoice, setSelectedVoice, audioError } = useAudioReader(lesson, summary);

  const contentBlocks = Array.isArray(externalContentBlocks) ? externalContentBlocks : internalContentBlocks;
  const setContentBlocks = (nextValue) => {
    if (setExternalContentBlocks) {
      if (typeof nextValue === "function") {
        setExternalContentBlocks((prev) => {
          const safePrev = Array.isArray(prev) ? prev : [];
          return nextValue(safePrev);
        });
      } else {
        setExternalContentBlocks(nextValue);
      }
      return;
    }
    setInternalContentBlocks(nextValue);
  };

  // تحديث الخارج بـ contentBlocks الجديدة
  useEffect(() => {
    if (onContentBlocksChange) {
      onContentBlocksChange(contentBlocks);
    }
  }, [contentBlocks, onContentBlocksChange]);

  useEffect(() => {
    setStructuredLesson(buildStructuredLessonData(lesson, summary, imageCards, video, simulation));
    setContentBlocks([]);
  }, [lesson, summary, imageCards, video, simulation]);

  const handleAnswer = (correct) => {
    const next = [...answers, correct];
    setAnswers(next);
    setStreak(correct ? streak + 1 : 0);
    if (current + 1 < questions.length) setCurrent(current + 1);
    else setPhase("results");
  };

  const handleRetry = () => {
    setCurrent(0); setAnswers([]); setStreak(0); setPhase("intro");
  };

  const handleContentAdd = (block) => {
    try {
      if (!block) {
        console.warn("[LessonPage] Attempted to add null block");
        return;
      }
      const newBlock = { ...block, id: block.id || Date.now() };
      setContentBlocks((prev) => [...prev, newBlock]);
      console.log("[LessonPage] Block added successfully:", newBlock.type);
    } catch (error) {
      console.error("[LessonPage] Error adding content block:", error.message);
    }
  };

  const handleContentReorder = (reorderedBlocks) => {
    setContentBlocks(reorderedBlocks);
  };

  const handleEditBlock = (block) => {
    setEditingBlock(block);
  };

  const handleEditTitle = () => {
    setEditingBlock({ ...structuredLesson.main.title, type: "heading", editTarget: "main.title" });
  };

  const handleEditObjectives = () => {
    setEditingBlock({
      ...structuredLesson.main.objectives,
      type: "objectives_group",
      editTarget: "main.objectives",
      contentText: structuredLesson.main.objectives.content.join("\n"),
    });
  };

  const handleEditSummary = () => {
    setEditingBlock({ ...structuredLesson.sidebar.summary, type: "text", editTarget: "sidebar.summary" });
  };

  const handleEditGlossary = () => {
    const glossary = structuredLesson?.sidebar?.glossary;
    const items = Array.isArray(glossary?.items) ? glossary.items : [];
    const lines = items.map((item) => `${item.term || ""}: ${item.definition || ""}`).join("\n");
    setEditingBlock({ ...glossary, type: "glossary_group", editTarget: "sidebar.glossary", contentText: lines });
  };

  const handleAddSection = () => {
    setStructuredLesson((prev) => {
      const next = [...prev.main.content_sections, {
        id: Date.now(),
        type: "paragraph",
        content: "فقرة جديدة قابلة للتعديل...",
        editable: true,
        order: prev.main.content_sections.length + 1,
        style: { textColor: "#334155", backgroundColor: "#f8fafc", fontSize: "15px" },
      }];
      return { ...prev, main: { ...prev.main, content_sections: next } };
    });
  };

  const handleEditSection = (section) => {
    setEditingBlock({ ...section, type: section.type === "heading" ? "heading" : "text", editTarget: "main.content_sections", originalType: section.type });
  };

  const handleDeleteSection = (sectionId) => {
    setStructuredLesson((prev) => {
      const next = prev.main.content_sections
        .filter((item) => item.id !== sectionId)
        .map((item, index) => ({ ...item, order: index + 1 }));
      return { ...prev, main: { ...prev.main, content_sections: next } };
    });
  };

  const handleEditCard = (card) => {
    setEditingBlock({ ...card, type: "interactive_card", editTarget: "main.interactive_cards" });
  };

  const handleDeleteCard = (cardId) => {
    setStructuredLesson((prev) => ({
      ...prev,
      main: {
        ...prev.main,
        interactive_cards: prev.main.interactive_cards.filter((card) => card.id !== cardId),
      },
    }));
  };

  const handleSaveBlock = (updatedBlock) => {
    const normalizedStyle = {
      ...(updatedBlock.style || {}),
      ...(updatedBlock.style?.contentBg ? { backgroundColor: updatedBlock.style.contentBg } : {}),
    };

    if (updatedBlock.editTarget === "main.title") {
      setStructuredLesson((prev) => ({
        ...prev,
        main: {
          ...prev.main,
          title: {
            ...prev.main.title,
            content: updatedBlock.content,
            style: { ...prev.main.title.style, ...normalizedStyle },
          },
        },
      }));
    } else if (updatedBlock.editTarget === "main.objectives") {
      const nextObjectives = String(updatedBlock.contentText || "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      setStructuredLesson((prev) => ({
        ...prev,
        main: {
          ...prev.main,
          objectives: {
            ...prev.main.objectives,
            content: nextObjectives,
            style: { ...prev.main.objectives.style, ...normalizedStyle },
          },
        },
      }));
    } else if (updatedBlock.editTarget === "main.content_sections") {
      setStructuredLesson((prev) => ({
        ...prev,
        main: {
          ...prev.main,
          content_sections: prev.main.content_sections.map((item) => (
            item.id === updatedBlock.id
              ? {
                  ...item,
                  content: updatedBlock.content,
                  type: updatedBlock.originalType || item.type,
                  style: { ...item.style, ...normalizedStyle },
                }
              : item
          )),
        },
      }));
    } else if (updatedBlock.editTarget === "sidebar.summary") {
      setStructuredLesson((prev) => ({
        ...prev,
        sidebar: {
          ...prev.sidebar,
          summary: {
            ...prev.sidebar.summary,
            content: updatedBlock.content,
            style: { ...prev.sidebar.summary.style, ...normalizedStyle },
          },
        },
      }));
    } else if (updatedBlock.editTarget === "sidebar.glossary") {
      const items = String(updatedBlock.contentText || "")
        .split("\n")
        .map((line, idx) => {
          const raw = line.trim();
          if (!raw) return null;
          const splitByColon = raw.includes(":") ? raw.split(":") : raw.split("-");
          const term = (splitByColon[0] || "").trim();
          const definition = splitByColon.slice(1).join(":").trim();
          if (!term && !definition) return null;
          return { id: Date.now() + idx, term, definition };
        })
        .filter(Boolean);
      setStructuredLesson((prev) => ({
        ...prev,
        sidebar: {
          ...prev.sidebar,
          glossary: {
            ...prev.sidebar.glossary,
            items,
            style: { ...prev.sidebar.glossary.style, ...normalizedStyle },
          },
        },
      }));
    } else if (updatedBlock.editTarget === "main.interactive_cards") {
      setStructuredLesson((prev) => ({
        ...prev,
        main: {
          ...prev.main,
          interactive_cards: prev.main.interactive_cards.map((card) => (
            card.id === updatedBlock.id
              ? { ...card, title: updatedBlock.title, description: updatedBlock.description }
              : card
          )),
        },
      }));
    } else {
      setContentBlocks((prev) => prev.map(b => b.id === updatedBlock.id ? updatedBlock : b));
    }
    setEditingBlock(null);
  };

  const handleDeleteBlock = (blockId) => {
    setContentBlocks((prev) => prev.filter(b => b.id !== blockId));
  };

  const handleDragStart = (block) => {
    setDraggedBlock(block);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (targetBlock) => {
    if (!draggedBlock || draggedBlock.id === targetBlock.id) {
      setDraggedBlock(null);
      return;
    }
    const draggedIdx = contentBlocks.findIndex(b => b.id === draggedBlock.id);
    const targetIdx = contentBlocks.findIndex(b => b.id === targetBlock.id);
    if (draggedIdx < 0 || targetIdx < 0) {
      setDraggedBlock(null);
      return;
    }
    const newBlocks = [...contentBlocks];
    [newBlocks[draggedIdx], newBlocks[targetIdx]] = [newBlocks[targetIdx], newBlocks[draggedIdx]];
    setContentBlocks(newBlocks);
    setDraggedBlock(null);
  };

  return (
    <div style={s.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        @keyframes soundWave { 0%,100%{transform:scaleY(1)} 50%{transform:scaleY(1.6)} }
        @media (max-width: 768px) { .lesson-intro-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.headerInner}>
          <div style={s.headerIconWrap}>🎓</div>
          <div style={{ minWidth: 0 }}>
            <h1 style={s.headerTitle}>{lesson.title}</h1>
            <p style={s.headerSub}>
              {phase === "intro" && `درس تفاعلي · ${questions.length} أسئلة`}
              {phase === "quiz" && `السؤال ${current + 1} من ${questions.length}`}
              {phase === "results" && `النتائج النهائية`}
            </p>
          </div>
        </div>
        <div style={s.headerRight}>
          {phase === "intro" && (
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                color: "#fff",
                borderRadius: "10px",
                padding: "7px 10px",
                fontSize: "12px",
                minWidth: "180px",
              }}
              title="اختر الصوت"
            >
              {POLLY_VOICES.map((v) => (
                <option key={v.id} value={v.id} style={{ color: "#111" }}>
                  {v.label}
                </option>
              ))}
            </select>
          )}
          {/* Audio button - only on intro phase */}
          {phase === "intro" && (
            <button
              onClick={toggle}
              disabled={loading}
              title={speaking ? "إيقاف القراءة" : loading ? "جاري التحميل..." : "قراءة الدرس صوتياً"}
              style={{
                display: "flex", alignItems: "center", gap: "7px",
                background: speaking ? "rgba(239,68,68,0.25)" : "rgba(255,255,255,0.15)",
                border: `1px solid ${speaking ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.3)"}`,
                color: "#fff", borderRadius: "10px", padding: "7px 14px",
                fontSize: "13px", fontWeight: 700, cursor: loading ? "wait" : "pointer", transition: "all 0.2s",
                opacity: loading ? 0.7 : 1,
              }}>
              {loading ? (
                <> ⏳ جاري التحميل... </>
              ) : speaking ? (
                <>
                  <span style={{ display: "flex", gap: "2px", alignItems: "center" }}>
                    {[1,1.6,1,1.8,1].map((h, i) => (
                      <span key={i} style={{ display: "inline-block", width: "3px", height: "14px", background: "#fff", borderRadius: "2px", animation: `soundWave 0.8s ease-in-out ${i * 0.1}s infinite`, transformOrigin: "center" }} />
                    ))}
                  </span>
                  إيقاف
                </>
              ) : (
                <> 🔊 استمع للدرس </>
              )}
            </button>
          )}
          {phase === "intro" && audioError && (
            <div style={{ color: "#ffd1d1", background: "rgba(127,29,29,0.35)", border: "1px solid rgba(248,113,113,0.6)", borderRadius: "10px", padding: "6px 10px", fontSize: "12px", fontWeight: 600 }}>
              تعذر تشغيل الصوت: {audioError}
            </div>
          )}
          {phase !== "intro" && (
            <button style={s.headerPhaseBtn} onClick={handleRetry}>↩ البداية</button>
          )}
          {onClose && <button style={s.headerClose} onClick={onClose} aria-label="إغلاق">✕</button>}
        </div>
      </div>

      {/* Phase tabs */}
      <div style={s.phaseTabs}>
        {[
          { key: "intro", label: "📖 الدرس" },
          { key: "map", label: "🗺️ خريطة المفاهيم" },
          { key: "quiz", label: "✏️ الاختبار" },
          { key: "results", label: "🏆 النتائج" },
        ].map(({ key, label }) => (
          <div key={key} onClick={() => { if (key !== "results" || phase === "results") setPhase(key); }}
            style={{ ...s.phaseTab, ...(phase === key ? s.phaseTabActive : {}), cursor: key === "results" && phase !== "results" ? "default" : "pointer", opacity: key === "results" && phase !== "results" ? 0.4 : 1 }}>
            {label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div style={s.content}>
        {phase === "intro" && (
          <LessonIntro
            key={JSON.stringify({ hasCards: !!structuredLesson.main.interactive_cards?.length, hasSim: !!structuredLesson.main.simulation })}
            structuredLesson={structuredLesson}
            questionsCount={questions.length}
            onStart={() => { setPhase("quiz"); }}
            contentBlocks={contentBlocks}
            onContentAdd={handleContentAdd}
            onContentReorder={handleContentReorder}
            onEditBlock={handleEditBlock}
            onDeleteBlock={handleDeleteBlock}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            draggedBlock={draggedBlock}
            onEditTitle={handleEditTitle}
            onEditObjectives={handleEditObjectives}
            onEditSection={handleEditSection}
            onDeleteSection={handleDeleteSection}
            onAddSection={handleAddSection}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            onEditSummary={handleEditSummary}
            onEditGlossary={handleEditGlossary}
          />
        )}
        {phase === "map" && (
          <div style={{ maxWidth: "900px", margin: "0 auto", animation: "fadeSlide 0.4s ease" }}>
            <div style={{ background: "#fff", borderRadius: "16px", padding: "24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e8eaf6" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                <div style={{ width: "40px", height: "40px", background: "linear-gradient(135deg, #1a237e, #7c3aed)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>🗺️</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "17px", color: "#1a237e" }}>خريطة المفاهيم</div>
                  <div style={{ fontSize: "12px", color: "#9ca3af" }}>العلاقات بين مفاهيم الدرس</div>
                </div>
              </div>
              {conceptMap ? (
                <div style={{ width: "100%", borderRadius: "12px", overflow: "hidden", border: "1px solid #e8eaf6", background: "#f8f9ff" }}
                  dangerouslySetInnerHTML={{
                    __html: conceptMap.replace(/<svg([^>]*)>/, (m, attrs) => {
                      const cleaned = attrs
                        .replace(/\s*width=["'][^"']*["']/g, "")
                        .replace(/\s*height=["'][^"']*["']/g, "");
                      return `<svg${cleaned} width="100%" style="display:block;max-width:100%">`;
                    })
                  }} />
              ) : (
                <div style={{ textAlign: "center", padding: "48px", color: "#9ca3af" }}>
                  <div style={{ fontSize: "48px", marginBottom: "12px" }}>🗺️</div>
                  <p>لم يتم توليد خريطة المفاهيم</p>
                </div>
              )}
            </div>
          </div>
        )}
        {phase === "quiz" && (
          <div style={s.quizWrap}>
            <QuestionCard key={current} question={questions[current]} index={current} total={questions.length} onAnswer={handleAnswer} streak={streak} />
          </div>
        )}
        {phase === "results" && (
          <Results questions={questions} answers={answers} onRetry={handleRetry} onClose={onClose} />
        )}
      </div>

      {phase === "intro" && (
        <button
          onClick={() => setShowToolbar((prev) => !prev)}
          style={showToolbar ? s.fabOpen : s.fab}
          title={showToolbar ? "إخفاء أدوات النص" : "إظهار أدوات النص"}
          aria-label={showToolbar ? "إخفاء أدوات النص" : "إظهار أدوات النص"}
        >
          {showToolbar ? "✕" : "+"}
        </button>
      )}

      {/* Editor Toolbar - Show only in lesson phase */}
      {showToolbar && phase === "intro" && (
        <ContextualEditorToolbar
          lessonContext={{
            title: lesson.title,
            summary,
            sections: lesson.sections,
            objectives: lesson.objectives,
            keyTerms: lesson.keyTerms,
          }}
          onContentAdd={handleContentAdd}
          onContentReorder={handleContentReorder}
          blocks={contentBlocks}
        />
      )}

      {/* Edit Block Modal */}
      {editingBlock && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.48)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, direction: "rtl", padding: "20px" }}>
          <div style={{ background: "#fff", borderRadius: "16px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflow: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <EditBlockModal block={editingBlock} onSave={handleSaveBlock} onClose={() => setEditingBlock(null)} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Edit Block Modal ────────────────────────────────────────────────────────
function EditBlockModal({ block, onSave, onClose }) {
  const [localBlock, setLocalBlock] = useState(block);

  const updateStyle = (key, value) => {
    setLocalBlock({ ...localBlock, style: { ...localBlock.style, [key]: value } });
  };

  const updateContent = (value) => {
    setLocalBlock({ ...localBlock, content: value });
  };

  const updateContentText = (value) => {
    setLocalBlock({ ...localBlock, contentText: value });
  };

  const updateField = (key, value) => {
    setLocalBlock({ ...localBlock, [key]: value });
  };

  const isTextLike = localBlock.type === "text" || localBlock.type === "heading";
  const isObjectivesGroup = localBlock.type === "objectives_group";
  const isGlossaryGroup = localBlock.type === "glossary_group";
  const isInteractiveCard = localBlock.type === "interactive_card";

  return (
    <div style={{ padding: "24px" }}>
      <h2 style={{ margin: "0 0 20px", fontSize: "18px", fontWeight: 700, color: "#1a237e" }}>
        تحرير {isObjectivesGroup ? "أهداف الدرس" : isGlossaryGroup ? "المصطلحات" : isInteractiveCard ? "البطاقة" : localBlock.type === "heading" ? "العنوان" : "النص"}
      </h2>

      {/* Content */}
      {isTextLike && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>المحتوى</label>
          <textarea
            value={localBlock.content}
            onChange={(e) => updateContent(e.target.value)}
            style={{ width: "100%", minHeight: "80px", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "inherit", fontSize: "14px", resize: "vertical" }}
          />
        </div>
      )}

      {isObjectivesGroup && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>الأهداف (كل هدف في سطر)</label>
          <textarea
            value={localBlock.contentText || ""}
            onChange={(e) => updateContentText(e.target.value)}
            style={{ width: "100%", minHeight: "140px", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "inherit", fontSize: "14px", resize: "vertical" }}
          />
        </div>
      )}

      {isGlossaryGroup && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>المصطلحات — كل سطر بصيغة: <span style={{ color: "#7c3aed", fontFamily: "monospace" }}>المصطلح: التعريف</span></label>
          <textarea
            value={localBlock.contentText || ""}
            onChange={(e) => updateContentText(e.target.value)}
            placeholder="مثال:\nالخوارزمية: مجموعة من الخطوات المنظمة لحل مشكلة\nالبرمجة: فن كتابة التعليمات للحاسوب"
            style={{ width: "100%", minHeight: "180px", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "inherit", fontSize: "14px", resize: "vertical", lineHeight: "1.8", direction: "rtl" }}
          />
          <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>أضف كل مصطلح وتعريفه في سطر منفصل — استخدم النقطتان (:) للفصل</p>
        </div>
      )}

      {isInteractiveCard && (
        <>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>عنوان البطاقة</label>
            <input
              value={localBlock.title || ""}
              onChange={(e) => updateField("title", e.target.value)}
              style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "inherit", fontSize: "14px" }}
            />
          </div>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>وصف البطاقة</label>
            <textarea
              value={localBlock.description || ""}
              onChange={(e) => updateField("description", e.target.value)}
              style={{ width: "100%", minHeight: "110px", padding: "10px", borderRadius: "8px", border: "1px solid #e2e8f0", fontFamily: "inherit", fontSize: "14px", resize: "vertical" }}
            />
          </div>
        </>
      )}

      {/* Text Color */}
      {(isTextLike || isObjectivesGroup || isGlossaryGroup) && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>لون النص</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["#374151", "#1a237e", "#7c3aed", "#059669", "#dc2626", "#d97706"].map(color => (
              <button
                key={color}
                onClick={() => updateStyle("textColor", color)}
                style={{ width: "40px", height: "40px", borderRadius: "8px", border: localBlock.style?.textColor === color ? "3px solid #7c3aed" : "1px solid #e2e8f0", background: color, cursor: "pointer", transition: "all 0.2s" }}
                title={color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Background Color */}
      {(isTextLike || isObjectivesGroup || isGlossaryGroup) && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>لون الخلفية</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["transparent", "#ede9fe", "#f3f4f6", "#dbeafe", "#dcfce7", "#fef3c7"].map(color => (
              <button
                key={color}
                onClick={() => updateStyle("contentBg", color)}
                style={{ width: "40px", height: "40px", borderRadius: "8px", border: localBlock.style?.contentBg === color ? "3px solid #7c3aed" : "1px solid #e2e8f0", background: color, cursor: "pointer", transition: "all 0.2s" }}
                title={color || "شفاف"}
              />
            ))}
          </div>
        </div>
      )}

      {/* Font Size */}
      {(isTextLike || isObjectivesGroup || isGlossaryGroup) && (
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>حجم الخط</label>
          <div style={{ display: "flex", gap: "8px" }}>
            {["12px", "14px", "16px", "18px", "20px", "24px"].map(size => (
              <button
                key={size}
                onClick={() => updateStyle("fontSize", size)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: localBlock.style?.fontSize === size ? "2px solid #7c3aed" : "1px solid #e2e8f0", background: "#fff", cursor: "pointer", fontSize: size, fontWeight: 600, color: "#1a237e", transition: "all 0.2s" }}
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Block Background */}
      {!isInteractiveCard && <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "6px" }}>خلفية العنصر</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {["#fff", "#ede9fe", "#f3f4f6", "#dbeafe", "#dcfce7", "#fef3c7"].map(color => (
            <button
              key={color}
              onClick={() => updateStyle("backgroundColor", color)}
              style={{ width: "40px", height: "40px", borderRadius: "8px", border: localBlock.style?.backgroundColor === color ? "3px solid #7c3aed" : "1px solid #e2e8f0", background: color, cursor: "pointer", transition: "all 0.2s" }}
            />
          ))}
        </div>
      </div>}

      {/* Actions */}
      <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{ padding: "10px 16px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "#fff", color: "#475569", cursor: "pointer", fontSize: "14px", fontWeight: 600, transition: "all 0.2s" }}
        >
          إلغاء
        </button>
        <button
          onClick={() => onSave(localBlock)}
          style={{ padding: "10px 16px", borderRadius: "8px", border: "none", background: "#7c3aed", color: "#fff", cursor: "pointer", fontSize: "14px", fontWeight: 600, transition: "all 0.2s" }}
        >
          حفظ التغييرات
        </button>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = {
  page: { display: "flex", flexDirection: "column", height: "100%", fontFamily: "'Tajawal', 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif", direction: "rtl", background: "linear-gradient(180deg,#eef2ff 0%,#f8fafc 48%,#eef2ff 100%)", overflow: "hidden" },

  // Header
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 32px", background: "linear-gradient(135deg, #0d1b6e, #1a237e, #7c3aed)", color: "#fff", flexShrink: 0 },
  headerInner: { display: "flex", alignItems: "center", gap: "16px", minWidth: 0, flex: 1 },
  headerIconWrap: { fontSize: "28px", flexShrink: 0, background: "rgba(255,255,255,0.15)", borderRadius: "12px", width: "52px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center" },
  headerTitle: { margin: 0, fontSize: "18px", fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  headerSub: { margin: "3px 0 0", fontSize: "13px", color: "rgba(255,255,255,0.7)" },
  headerRight: { display: "flex", gap: "8px", alignItems: "center", flexShrink: 0 },
  headerPhaseBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: "8px", padding: "7px 14px", fontSize: "13px", cursor: "pointer", fontWeight: 600 },
  headerClose: { background: "rgba(255,255,255,0.15)", border: "none", color: "#fff", borderRadius: "8px", padding: "7px 12px", cursor: "pointer", fontSize: "14px" },

  // Phase tabs
  phaseTabs: { display: "flex", background: "#fff", borderBottom: "2px solid #e8eaf6", flexShrink: 0, padding: "0 32px" },
  phaseTab: { flex: "0 0 auto", textAlign: "center", padding: "14px 28px", fontSize: "14px", fontWeight: 500, color: C.gray, borderBottom: "3px solid transparent", marginBottom: "-2px", transition: "all 0.2s" },
  phaseTabActive: { color: C.purple, borderBottom: `3px solid ${C.purple}`, fontWeight: 700 },

  content: { flex: 1, overflowY: "auto", padding: "28px 32px" },
  fab: {
    position: "fixed",
    bottom: "22px",
    left: "22px",
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg,#1a237e,#7c3aed)",
    color: "#fff",
    fontSize: "32px",
    lineHeight: 1,
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(124,58,237,0.32)",
    zIndex: 10002,
  },
  fabOpen: {
    position: "fixed",
    bottom: "22px",
    left: "22px",
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg,#dc2626,#ef4444)",
    color: "#fff",
    fontSize: "24px",
    cursor: "pointer",
    boxShadow: "0 14px 26px rgba(220,38,38,0.32)",
    zIndex: 10002,
  },

  heroStrip: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: "10px", background: "linear-gradient(135deg,#1e1b4b,#4338ca)", borderRadius: "14px", padding: "14px", boxShadow: "0 8px 20px rgba(30,27,75,0.22)" },
  heroStat: { background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.18)", borderRadius: "12px", padding: "10px", textAlign: "center", display: "flex", flexDirection: "column", gap: "4px" },
  heroLabel: { fontSize: "12px", color: "rgba(255,255,255,0.8)", fontWeight: 600 },
  heroValue: { fontSize: "24px", color: "#fff", fontWeight: 800, lineHeight: 1 },

  // Intro - two column layout
  introWrap: { display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: "24px", maxWidth: "1300px", margin: "0 auto", animation: "fadeSlide 0.4s ease", alignItems: "start" },

  block: { background: "#fff", border: "1px solid #dbe3ff", borderRadius: "16px", padding: "22px", boxShadow: "0 8px 20px rgba(26,35,126,0.08)" },
  blockHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" },
  blockHeaderIcon: { fontSize: "20px" },
  blockHeaderTitle: { fontWeight: 700, fontSize: "16px", color: C.navy },

  objList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" },
  objItem: { display: "flex", alignItems: "flex-start", gap: "12px", fontSize: "15px", lineHeight: 1.7, color: "#444" },
  objDot: { width: "9px", height: "9px", borderRadius: "50%", background: C.purple, flexShrink: 0, marginTop: "8px" },

  sectionBlock: { background: "linear-gradient(180deg,#ffffff,#f8faff)", border: "1px solid #dbe3ff", borderRadius: "16px", padding: "22px", boxShadow: "0 8px 20px rgba(26,35,126,0.08)" },
  sectionHeadingWrap: { display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" },
  sectionLine: { width: "5px", height: "24px", background: `linear-gradient(180deg, ${C.navy}, ${C.purple})`, borderRadius: "4px", flexShrink: 0 },
  sectionHeading: { margin: 0, fontSize: "16px", fontWeight: 700, color: C.navy },
  sectionContent: { margin: 0, fontSize: "15px", lineHeight: 2.05, color: "#334155", background: "#f8fafc", borderRadius: "10px", padding: "12px 14px", border: "1px solid #e2e8f0" },

  termsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "10px" },
  termCard: { background: "linear-gradient(135deg,#f5f3ff,#ede9fe)", border: `1px solid ${C.purpleBorder}`, borderRadius: "12px", padding: "14px 16px", display: "flex", flexDirection: "column", gap: "6px" },
  termWord: { fontWeight: 700, fontSize: "14px", color: C.purple },
  termDef: { fontSize: "13px", color: "#555", lineHeight: 1.6 },

  summaryBlock: { background: "linear-gradient(135deg,#eef2ff,#e0e7ff)", border: "1px solid #c7d2fe", borderRadius: "14px", padding: "22px", boxShadow: "0 6px 16px rgba(79,70,229,0.12)" },
  summaryText: { margin: "8px 0 0", fontSize: "14px", lineHeight: 2, color: "#333" },

  ctaBlock: { background: "linear-gradient(135deg,#0f172a,#1d4ed8,#7c3aed)", borderRadius: "14px", padding: "28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "20px", flexWrap: "wrap", boxShadow: "0 12px 24px rgba(15,23,42,0.24)" },
  ctaLeft: {},
  ctaTitle: { margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "#fff" },
  ctaSub: { margin: 0, fontSize: "14px", color: "rgba(255,255,255,0.75)" },
  startBtn: { background: "#fff", color: C.purple, border: "none", borderRadius: "12px", padding: "14px 32px", fontSize: "16px", fontWeight: 700, cursor: "pointer", flexShrink: 0, boxShadow: "0 4px 14px rgba(0,0,0,0.15)" },

  // Quiz
  quizWrap: { maxWidth: "720px", margin: "0 auto", animation: "fadeSlide 0.4s ease" },
  progressWrap: { marginBottom: "24px" },
  progressMeta: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" },
  progressLabel: { fontSize: "14px", color: C.gray, fontWeight: 500 },
  progressPct: { fontSize: "14px", color: C.purple, fontWeight: 700 },
  streakBadge: { background: C.goldLight, color: "#92400e", borderRadius: "20px", padding: "3px 12px", fontSize: "13px", fontWeight: 700 },
  progressTrack: { height: "10px", background: C.grayBorder, borderRadius: "99px", overflow: "hidden" },
  progressFill: { height: "100%", background: `linear-gradient(90deg, ${C.navy}, ${C.purple})`, borderRadius: "99px", transition: "width 0.5s ease" },

  qCard: { background: "#fff", border: "1px solid #e8eaf6", borderRadius: "18px", padding: "28px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)" },
  qBubble: { background: C.navyLight, borderRadius: "14px", padding: "18px 22px", marginBottom: "22px", display: "flex", gap: "14px", alignItems: "flex-start" },
  qNumBadge: { background: C.navy, color: "#fff", borderRadius: "8px", padding: "4px 12px", fontSize: "13px", fontWeight: 700, flexShrink: 0, marginTop: "2px" },
  qText: { margin: 0, fontSize: "17px", fontWeight: 600, color: C.navy, lineHeight: 1.7, flex: 1 },

  optionsGrid: { display: "flex", flexDirection: "column", gap: "12px", marginBottom: "18px" },
  optBtn: { display: "flex", alignItems: "center", gap: "14px", width: "100%", textAlign: "right", padding: "15px 18px", borderRadius: "12px", fontSize: "15px", fontWeight: 500, background: "#f8f9ff", border: `2px solid ${C.grayBorder}`, color: "#1f2937", transition: "all 0.2s" },
  optLetter: { fontSize: "18px", fontWeight: 700, flexShrink: 0, width: "22px", textAlign: "center" },

  feedback: { display: "flex", gap: "14px", alignItems: "flex-start", borderRadius: "14px", padding: "16px 18px", marginBottom: "16px" },
  nextBtn: { display: "block", width: "100%", padding: "15px", background: `linear-gradient(135deg, ${C.navy}, ${C.purple})`, color: "#fff", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: 700, cursor: "pointer" },

  // Results
  resultsWrap: { maxWidth: "700px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", alignItems: "center", animation: "fadeSlide 0.4s ease" },
  scoreCircleWrap: { position: "relative", width: "180px", height: "180px" },
  scoreCircleInner: { position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px" },
  gradeBadge: { borderRadius: "24px", padding: "10px 28px", fontSize: "18px", fontWeight: 700 },
  reviewWrap: { width: "100%", display: "flex", flexDirection: "column", gap: "12px" },
  reviewTitle: { margin: "0 0 8px", fontWeight: 700, fontSize: "16px", color: C.navy, width: "100%" },
  reviewItem: { background: "#fff", border: "1px solid #e8eaf6", borderRadius: "12px", padding: "16px 18px", paddingRight: "20px" },
  reviewBadge: { borderRadius: "6px", padding: "3px 10px", fontSize: "12px", fontWeight: 700, flexShrink: 0, marginTop: "2px" },
  reviewQ: { margin: 0, fontSize: "14px", color: "#333", flex: 1, lineHeight: 1.6 },
  reviewAnswer: { margin: "10px 0 0", fontSize: "13px", color: C.gray },
  resultActions: { display: "flex", gap: "12px", width: "100%" },
  retryBtn: { flex: 1, padding: "15px", background: `linear-gradient(135deg, ${C.navy}, ${C.purple})`, color: "#fff", border: "none", borderRadius: "14px", fontSize: "16px", fontWeight: 700, cursor: "pointer" },
  closeResultBtn: { padding: "15px 24px", background: C.grayLight, color: C.gray, border: "none", borderRadius: "14px", fontSize: "15px", fontWeight: 600, cursor: "pointer" },
};
