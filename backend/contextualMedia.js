const ARABIC_STOP_WORDS = new Set([
  "من", "في", "على", "إلى", "عن", "هذا", "هذه", "ذلك", "التي", "الذي", "مع", "ثم", "أو", "و", "ما", "هو", "هي", "تم", "بعد", "قبل", "حول", "ضمن", "عند", "كل", "كما", "أن", "إن", "كان", "كانت", "يكون", "يمكن", "بشكل", "جدا", "جداً", "درس", "الدرس", "موضوع", "الموضوع"
]);

const ENGLISH_HINTS = [
  // ─── Technology: AR / VR / AI ────────────────────────────────────────────────
  { match: ["واقع معزز", "واقع مختلط", "ar glasses", "هولولنز", "نظارات ذكية", "mixed reality"], tags: ["augmented reality", "AR technology", "mixed reality", "wearable device"] },
  { match: ["واقع افتراضي", "واقع غامر", "vr headset", "نظارات افتراضية", "محاكاة افتراضية"], tags: ["virtual reality", "VR headset", "immersive technology", "3D simulation"] },
  { match: ["ذكاء اصطناعي", "تعلم آلي", "تعلم عميق", "شبكة عصبية", "نموذج لغوي", "chatgpt", "llm", "machine learning"], tags: ["artificial intelligence", "machine learning", "neural network", "AI diagram"] },
  { match: ["روبوت", "روبوتات", "أتمتة", "ذراع آلية", "ذراع روبوتية", "robotics"], tags: ["robotics", "robot arm", "automation", "mechanical robot"] },
  { match: ["أمن سيبراني", "تشفير", "اختراق", "حماية بيانات", "جدار ناري", "malware", "cybersecurity"], tags: ["cybersecurity", "encryption", "data protection", "network security"] },
  { match: ["سحابة", "حوسبة سحابية", "خادم سحابي", "aws", "azure", "google cloud"], tags: ["cloud computing", "server infrastructure", "cloud storage", "data center"] },
  { match: ["هاتف ذكي", "جوال", "تطبيق موبايل", "ios", "android", "smartphone"], tags: ["smartphone", "mobile phone", "mobile app", "touchscreen device"] },
  { match: ["إنترنت الأشياء", "iot", "أجهزة ذكية", "حساسات", "smart home"], tags: ["internet of things", "IoT devices", "smart sensor", "connected devices"] },
  { match: ["بلوكتشين", "عملة رقمية", "تشفير رقمي", "blockchain", "bitcoin", "كريبتو"], tags: ["blockchain", "cryptocurrency", "digital ledger", "bitcoin"] },
  { match: ["طباعة ثلاثية", "3d printing", "نماذج ثلاثية", "ثلاثي الأبعاد"], tags: ["3D printing", "additive manufacturing", "3D model", "prototype"] },
  // ─── Computers & Networks ────────────────────────────────────────────────────
  { match: ["حاسب", "كمبيوتر", "حاسوب", "معالج", "ذاكرة", "لوحة المفاتيح", "شاشة", "cpu", "ram"], tags: ["computer hardware", "CPU motherboard", "desktop computer", "electronics"] },
  { match: ["شبكة", "انترنت", "إنترنت", "wifi", "راوتر", "بروتوكول", "اتصال"], tags: ["computer network", "internet router", "WiFi connectivity", "network topology"] },
  { match: ["برمجة", "خوارزمية", "كود", "تطبيق", "موقع", "قاعدة بيانات", "software"], tags: ["programming code", "software development", "algorithm flowchart", "database"] },
  // ─── Biology & Medicine ──────────────────────────────────────────────────────
  { match: ["قلب", "دم", "دورة دموية", "شريان", "وريد", "نبض"], tags: ["heart anatomy", "blood circulation", "cardiovascular system", "medical diagram"] },
  { match: ["تشريح", "عضلات", "عظام", "هيكل عظمي", "أعضاء", "جسم الإنسان"], tags: ["human anatomy", "skeleton muscles", "body organs", "medical illustration"] },
  { match: ["دماغ", "أعصاب", "جهاز عصبي", "خلية عصبية", "مخ"], tags: ["brain neuroscience", "nervous system", "neuron diagram", "brain anatomy"] },
  { match: ["خلية", "dna", "جين", "كروموسوم", "بكتيريا", "فيروس", "ميكروسكوب"], tags: ["cell biology", "DNA genetics", "microscope biology", "microorganism"] },
  { match: ["بناء ضوئي", "فوتوسنتيز", "كلوروفيل", "photosynthesis"], tags: ["photosynthesis diagram", "chlorophyll plant", "light energy biology"] },
  { match: ["نبات", "جذر", "ورقة", "ساق", "ثمرة", "تلقيح", "نبات"], tags: ["plant botany", "leaf root stem", "flower pollination", "plant anatomy"] },
  { match: ["حيوان", "ثديي", "طائر", "سمك", "حشرة", "زاحف"], tags: ["animal kingdom", "wildlife nature", "zoology diagram", "ecosystem"] },
  { match: ["صحة", "طب", "مستشفى", "دواء", "علاج", "جراحة"], tags: ["medicine healthcare", "hospital medical", "treatment therapy", "pharmaceutical"] },
  { match: ["تغذية", "غذاء", "بروتين", "فيتامين", "سعرات", "هرم غذائي"], tags: ["nutrition food pyramid", "vitamins protein", "dietary chart", "healthy diet"] },
  // ─── Chemistry & Physics ─────────────────────────────────────────────────────
  { match: ["كيمياء", "تفاعل كيميائي", "عنصر", "مركب", "مختبر", "جزيء", "ذرة"], tags: ["chemistry molecule", "laboratory experiment", "periodic table", "chemical reaction"] },
  { match: ["فيزياء", "قوة", "طاقة", "كهرباء", "مغناطيس", "موجة", "ضوء", "حرارة"], tags: ["physics energy", "electricity magnetism", "wave optics", "force diagram"] },
  { match: ["ضوء", "بصريات", "عدسة", "انعكاس", "انكسار", "prism"], tags: ["optics light", "lens reflection", "refraction prism", "light spectrum"] },
  { match: ["صوت", "موجة صوتية", "تردد", "ميكروفون", "ذبذبة"], tags: ["sound wave", "audio frequency", "vibration acoustics", "sound diagram"] },
  { match: ["نووي", "ذرة", "إشعاع", "بروتون", "نيوترون", "nuclear"], tags: ["nuclear atom", "radiation physics", "atomic structure", "proton neutron"] },
  // ─── Mathematics ─────────────────────────────────────────────────────────────
  { match: ["رياضيات", "معادلة", "جبر", "إحصاء", "احتمالات", "مصفوفة"], tags: ["mathematics equation", "algebra statistics", "probability chart", "matrix"] },
  { match: ["هندسة", "مثلث", "دائرة", "زاوية", "مضلع", "قطر"], tags: ["geometry shapes", "triangle circle", "angle polygon", "geometric diagram"] },
  { match: ["حساب", "تفاضل", "تكامل", "دالة", "رسم بياني", "calculus"], tags: ["calculus function", "graph plot", "differential integral", "mathematical curve"] },
  // ─── Earth & Space Science ───────────────────────────────────────────────────
  { match: ["فضاء", "فلك", "كوكب", "مجرة", "قمر", "شمس", "نجم", "مدار"], tags: ["space astronomy", "planet galaxy", "solar system", "orbit star"] },
  { match: ["جغرافيا", "خريطة", "جبل", "نهر", "قارة", "بحر"], tags: ["geography map", "mountain river", "continent ocean", "topographic"] },
  { match: ["مناخ", "طقس", "أمطار", "درجة حرارة", "ضغط جوي", "رياح"], tags: ["climate weather", "rain temperature", "atmospheric pressure", "meteorology"] },
  { match: ["بيئة", "تلوث", "احترار", "غازات دفيئة", "غابة", "نظام بيئي"], tags: ["environment ecology", "climate change pollution", "greenhouse gas", "ecosystem"] },
  { match: ["طاقة شمسية", "طاقة متجددة", "ألواح شمسية", "طاقة رياح", "solar"], tags: ["solar energy panel", "renewable energy", "wind turbine", "green energy"] },
  { match: ["زلزال", "بركان", "صفائح تكتونية", "geology", "طبقات الأرض"], tags: ["earthquake geology", "volcano tectonic", "earth layers", "seismic"] },
  // ─── History & Social Sciences ───────────────────────────────────────────────
  { match: ["تاريخ", "حضارة", "أثري", "تاريخي", "عصور", "حرب"], tags: ["history civilization", "ancient heritage", "historical timeline", "archaeology"] },
  { match: ["إسلامية", "إسلام", "مسجد", "خلافة", "فقه"], tags: ["Islamic civilization", "mosque architecture", "Islamic history", "caliphate"] },
  { match: ["اقتصاد", "تجارة", "سوق", "استثمار", "بنك", "مال"], tags: ["economy finance", "stock market", "business investment", "economic chart"] },
  { match: ["سياسة", "حكومة", "ديمقراطية", "قانون", "برلمان"], tags: ["politics government", "democracy law", "parliament", "political system"] },
  { match: ["لغة", "أدب", "نص", "بلاغة", "نحو", "قراءة"], tags: ["language literature", "book reading", "writing grammar", "text linguistics"] },
  // ─── Engineering & Design ────────────────────────────────────────────────────
  { match: ["هندسة مدنية", "بناء", "إنشاءات", "جسر", "خرسانة"], tags: ["civil engineering", "bridge construction", "building structure", "architectural"] },
  { match: ["هندسة كهربائية", "دائرة كهربائية", "مقاومة", "محول", "circuit"], tags: ["electrical engineering", "circuit diagram", "resistor capacitor", "electrical schematic"] },
  { match: ["هندسة ميكانيكية", "محرك", "تروس", "ضغط", "حرارة", "مكبس"], tags: ["mechanical engineering", "engine gears", "thermodynamics", "piston diagram"] },
  { match: ["تصميم", "جرافيك", "واجهة مستخدم", "ux", "ui", "فن"], tags: ["graphic design", "user interface UI", "UX design", "visual art"] },
];

const IMAGE_CATEGORY_PROFILES = {
  photo: {
    arabicLabel: "صورة واقعية",
    englishHints: ["photo", "realistic", "high detail"],
  },
  diagram: {
    arabicLabel: "مخطط توضيحي",
    englishHints: ["diagram", "schema", "concept map"],
  },
  illustration: {
    arabicLabel: "رسم توضيحي",
    englishHints: ["illustration", "digital art", "vector"],
  },
  infographic: {
    arabicLabel: "انفوجرافيك",
    englishHints: ["infographic", "data visualization", "educational poster"],
  },
};

// Per-category search strategy: controls English query modifiers, AI prompt styles, and Commons mime preference
const CATEGORY_SEARCH_STRATEGY = {
  photo: {
    englishModifiers: ["educational photo", "real world photograph", "close up photo"],
    aiPromptStyle: "realistic educational photograph, high quality, clear background, professional",
    unsplashSuffix: "education,real,photograph",
    commonsPreferMime: "image/jpeg",
  },
  diagram: {
    englishModifiers: ["labeled diagram", "educational diagram", "schematic diagram"],
    aiPromptStyle: "educational labeled diagram, white background, clear labels, clean vector art, academic",
    unsplashSuffix: "diagram,chart,schematic,labeled",
    commonsPreferMime: "image/svg+xml",
  },
  illustration: {
    englishModifiers: ["vector illustration", "educational illustration", "flat design illustration"],
    aiPromptStyle: "educational vector illustration, flat design, colorful, clean, professional academic art",
    unsplashSuffix: "illustration,drawing,vector,art",
    commonsPreferMime: "image/png",
  },
  infographic: {
    englishModifiers: ["educational infographic", "information poster", "data visualization poster"],
    aiPromptStyle: "educational infographic, organized data visualization, colorful, professional layout, clean",
    unsplashSuffix: "infographic,poster,data,visual",
    commonsPreferMime: "image/png",
  },
};

function resolveImageCategory(category = "diagram") {
  return IMAGE_CATEGORY_PROFILES[category] ? category : "diagram";
}

function shuffleArray(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function cleanText(value, max = 260) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function tokenizeArabicEnglish(text) {
  return cleanText(text, 2000)
    .split(/[^\p{L}\p{N}]+/u)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 2 && !ARABIC_STOP_WORDS.has(token));
}

function extractContextKeywords(lessonContext = {}) {
  const corpus = [
    lessonContext.title,
    lessonContext.summary,
    lessonContext.selectedText,
    lessonContext.instruction,
    ...(lessonContext.sections || []).map((section) => `${section.heading || ""} ${section.content || ""}`),
    ...(lessonContext.keyTerms || []).map((term) => `${term.term || ""} ${term.definition || ""}`),
    ...(lessonContext.blocks || []).map((block) => block.caption || block.content || block.title || ""),
  ].join(" ");

  const score = new Map();
  for (const token of tokenizeArabicEnglish(corpus)) {
    score.set(token, (score.get(token) || 0) + 1);
  }

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([token]) => token);
}

function getEnglishTags(lessonContext = {}, instruction = "") {
  // Use ONLY instruction for search - ignore lesson context entirely
  // This ensures user search is precise and not polluted by lesson metadata
  console.log(`[getEnglishTags] Input: instruction="${instruction.slice(0, 40)}" (${instruction.length} chars)`);
  
  if (instruction.trim()) {
    const instrLower = instruction.toLowerCase();
    const instrNorm = instrLower.replace(/^ال/u, "").replace(/ ال/gu, " ").replace(/\s+/g, " ").trim();
    console.log(`[getEnglishTags] Checking ${ENGLISH_HINTS.length} hints against: "${instrLower.slice(0, 40)}"`);
    
    for (let i = 0; i < ENGLISH_HINTS.length; i++) {
      const hint = ENGLISH_HINTS[i];
      const matches = hint.match.filter(term => instrLower.includes(term) || instrNorm.includes(term));
      if (matches.length > 0) {
        console.log(`[getEnglishTags] ✓ Hit at index ${i}: matched "${matches[0]}" → tags: "${hint.tags.slice(0, 2).join(", ")}"`);
        return hint.tags;
      }
    }
    console.log(`[getEnglishTags] ✗ No hint matched, returning generic`);
    return ["education", "study", "learning"];
  }
  // If instruction empty, don't search at all
  console.log(`[getEnglishTags] Empty instruction`);
  return [];
}

function buildLessonContextDocument(lessonContext = {}) {
  const sectionLines = (lessonContext.sections || [])
    .slice(0, 5)
    .map((section) => `- ${cleanText(section.heading, 60)}: ${cleanText(section.content, 180)}`)
    .join("\n");
  const termLines = (lessonContext.keyTerms || [])
    .slice(0, 8)
    .map((term) => `- ${cleanText(term.term, 40)}: ${cleanText(term.definition, 80)}`)
    .join("\n");
  const selected = cleanText(lessonContext.selectedText, 320);

  return [
    `عنوان الدرس: ${cleanText(lessonContext.title, 120) || "غير متوفر"}`,
    `ملخص الدرس: ${cleanText(lessonContext.summary, 260) || "غير متوفر"}`,
    selected ? `المقطع المحدد: ${selected}` : "",
    sectionLines ? `أقسام الدرس:\n${sectionLines}` : "",
    termLines ? `المصطلحات:\n${termLines}` : "",
  ].filter(Boolean).join("\n\n");
}

function buildSearchPhrases(lessonContext = {}, instruction = "", limit = 6) {
  const arabicTerms = extractContextKeywords({ ...lessonContext, instruction });
  const englishTags = getEnglishTags(lessonContext, instruction);
  // Instruction is the primary query — use it directly as the first item
  const userQuery = cleanText(instruction || lessonContext.title || "تعلم", 120);
  const title = cleanText(lessonContext.title || instruction || "تعلم", 80);
  const hasSpecificTopic = !(englishTags[0] === "education" && englishTags[1] === "study");

  const arabicQueries = unique([
    userQuery.trim(),                                                             // #1: user’s exact text
    `${title} شرح تعليمي`.trim(),
    `${title} شرح مبسط`.trim(),
    `${title} رسم توضيحي`.trim(),
    `${title} تطبيق عملي`.trim(),
    ...arabicTerms.slice(0, 3).map((term) => `${title} ${term}`.trim()),
  ]).slice(0, limit);

  const englishQueries = unique(
    hasSpecificTopic
      ? [
          englishTags.join(","),
          `${englishTags[0]},education,diagram`,
          `${englishTags[0]},study,students`,
          `${englishTags[0]},infographic`,
          `${englishTags[0]},explained`,
          `${englishTags[0]},lesson`,
        ]
      : ["educational,lesson", "educational,explained", "study,concept", "learning,visual", "academic,illustration", "education"]
  ).slice(0, limit);

  return { arabicQueries, englishQueries, englishTags, userQuery, hasSpecificTopic };
}

function buildMediaSearchPhrases({ lessonContext = {}, instruction = "", category = "diagram", limit = 6 }) {
  const resolvedCategory = resolveImageCategory(category);
  const profile = IMAGE_CATEGORY_PROFILES[resolvedCategory];
  const strategy = CATEGORY_SEARCH_STRATEGY[resolvedCategory];

  // The user's typed instruction is the PRIMARY query — use it directly, not just as a lookup key.
  const userQuery = cleanText(instruction || lessonContext.title || "", 120);
  const titleText = cleanText(lessonContext.title || instruction || "تعليم", 80);

  // Try domain-specific English tags from ENGLISH_HINTS
  const englishTags = getEnglishTags(lessonContext, instruction);
  console.log(`[buildMediaSearchPhrases] englishTags from instruction="${instruction.slice(0, 30)}"`, englishTags);
  
  const hasSpecificTopic = !(englishTags[0] === "education" && englishTags[1] === "study");
  const topicTag = hasSpecificTopic ? englishTags[0] : null;
  
  console.log(`[buildMediaSearchPhrases] hasSpecificTopic=${hasSpecificTopic} topicTag="${topicTag}"`);

  // Arabic queries: instruction is the FIRST and most important query
  const arabicTerms = extractContextKeywords({ ...lessonContext, instruction });
  const arabicQueries = unique([
    userQuery.trim(),
    `${titleText} ${profile.arabicLabel}`.trim(),
    titleText.trim(),
    ...arabicTerms.slice(0, 2).map((term) => `${titleText} ${term}`.trim()),
    `${userQuery} ${profile.arabicLabel}`.trim(),
  ]).filter(Boolean).slice(0, limit);

  // English queries: topic tag + category modifiers when matched, else category modifiers alone
  const englishQueries = unique(
    topicTag
      ? [
          `${topicTag} ${strategy.englishModifiers[0]}`,
          `${englishTags.slice(0, 2).join(" ")} ${strategy.englishModifiers[0]}`,
          ...strategy.englishModifiers.map((mod) => `${topicTag} ${mod}`),
          ...englishTags.slice(0, 2).map((tag) => `${tag} ${strategy.englishModifiers[0]}`),
        ]
      : strategy.englishModifiers // no hints match — use category modifiers as-is (broad but typed)
  ).slice(0, limit);

  // Wikimedia Commons query:
  // Priority 1: If topic matched from hints, use topic + category modifier
  // Priority 2: If no topic match but user gave instruction, use instruction directly as search
  // Priority 3: Last resort fallback to category-based search only
  const commonsQuery = topicTag
    ? `${englishTags.slice(0, 2).join(" ")} ${strategy.englishModifiers[0]}`
    : userQuery.trim() // Use user's instruction directly when no topic match
      ? userQuery.slice(0, 80)
      : {
          photo: "educational photograph",
          diagram: "educational diagram infographic",
          illustration: "educational illustration art drawing",
          infographic: "data visualization poster infographic",
        }[resolvedCategory];

  console.log(`[buildMediaSearchPhrases] Final→ category=${resolvedCategory} userQuery="${userQuery.slice(0, 50)}" commonsQuery="${commonsQuery}"`);

  return { arabicQueries, englishQueries, commonsQuery, resolvedCategory, profile, strategy, topicTag, englishTags, userQuery, hasSpecificTopic };
}

function buildSvgCard({ title, subtitle, points = [], accent = "#7c3aed", tag = "AI" }) {
  const safeTitle = escapeXml(cleanText(title, 48));
  const safeSubtitle = escapeXml(cleanText(subtitle, 88));
  const list = points.slice(0, 4).map((point, index) => {
    const y = 156 + index * 44;
    return `<g><circle cx="54" cy="${y - 8}" r="5" fill="${accent}" /><text x="72" y="${y}" font-size="18" fill="#334155" font-family="Cairo, Arial">${escapeXml(cleanText(point, 38))}</text></g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 560">
    <defs>
      <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffffff" />
        <stop offset="100%" stop-color="#f8f7ff" />
      </linearGradient>
    </defs>
    <rect width="900" height="560" rx="34" fill="url(#grad)" />
    <rect x="32" y="32" width="836" height="496" rx="28" fill="#ffffff" stroke="#e9e4ff" stroke-width="2" />
    <rect x="56" y="56" width="140" height="40" rx="20" fill="${accent}22" />
    <text x="126" y="82" text-anchor="middle" font-size="20" font-weight="700" fill="${accent}" font-family="Cairo, Arial">${escapeXml(tag)}</text>
    <text x="56" y="150" font-size="34" font-weight="700" fill="#1e1b4b" font-family="Cairo, Arial">${safeTitle}</text>
    <text x="56" y="196" font-size="20" fill="#475569" font-family="Cairo, Arial">${safeSubtitle}</text>
    <rect x="520" y="120" width="292" height="292" rx="28" fill="${accent}12" stroke="${accent}33" stroke-width="2" />
    <circle cx="666" cy="218" r="74" fill="${accent}22" />
    <path d="M632 258 L700 178 M610 214 L722 214 M632 170 L700 250" stroke="${accent}" stroke-width="14" stroke-linecap="round" />
    ${list}
  </svg>`;
}

function createContextualImageCandidates({ lessonContext = {}, instruction = "", source = "stock", category = "general" }) {
  const { arabicQueries, englishQueries, resolvedCategory, profile, strategy } = buildMediaSearchPhrases({ lessonContext, instruction, category, limit: 6 });
  const topPoints = (lessonContext.sections || [])
    .slice(0, 4)
    .map((section) => section.heading)
    .filter(Boolean);

  if (source === "ai") {
    // AI SVG fallback should NEVER be used - always return Pollinations URLs from searchAiImageCandidates
    // This function is only called when getContextualImageCandidates AI request completely fails
    // Return empty array so UI knows AI generation failed
    console.log("[createContextualImageCandidates] AI fallback called - this should only happen on complete failure");
    return [];
  }

  // Unsplash final fallback: use category-specific suffix for better type differentiation
  // Include category in search to ensure photo/diagram/illustration/infographic get visibly different results
  return englishQueries.map((query, index) => {
    // Combine query with category-specific suffix to improve differentiation
    const categoryHint = strategy.unsplashSuffix || "education";
    const unsplashQuery = `${query},${categoryHint}`;
    const seed = Math.floor(Math.random() * 9999) + index * 1000;
    return {
      id: `stock-${resolvedCategory}-unsplash-${seed}`,
      title: arabicQueries[index] || lessonContext.title || "صورة تعليمية",
      caption: `${profile.arabicLabel} — ${cleanText(instruction || lessonContext.title, 70)}`,
      query: unsplashQuery,
      source: "stock",
      category: resolvedCategory,
      searchMode: "fallback",
      providerLabel: "Unsplash Fallback",
      previewType: "image",
      url: `https://source.unsplash.com/900x620/?${encodeURIComponent(unsplashQuery)}&sig=${seed}`,
    };
  });
}

async function searchPexelsImages({ lessonContext = {}, instruction = "", category = "diagram", maxResults = 8 }) {
  const apiKey = String(process.env.STOCK_IMAGE_API_KEY || "").trim();
  if (!apiKey) return null;

  const { englishQueries, arabicQueries, resolvedCategory, profile, strategy } = buildMediaSearchPhrases({ lessonContext, instruction, category, limit: 4 });
  // Use more specific query: topic + category modifier (e.g. "computer hardware labeled diagram")
  const query = englishQueries[0] || strategy.englishModifiers[0] || "education";
  console.log("[contextualMedia] Pexels query", { query, category: resolvedCategory });
  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(Math.min(maxResults, 12)));
  // Add orientation hint per category
  if (category === "infographic") url.searchParams.set("orientation", "portrait");
  else url.searchParams.set("orientation", "landscape");

  const response = await fetch(url, {
    headers: {
      Authorization: apiKey,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Pexels API error: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = await response.json();
  return (data.photos || []).map((photo, index) => ({
    id: `pexels-${resolvedCategory}-${photo.id}`,
    title: arabicQueries[index] || cleanText(lessonContext.title || instruction || "صورة تعليمية", 80),
    caption: cleanText(photo.alt || `${profile.arabicLabel} مرتبطة بالسياق`, 120),
    query,
    source: "stock",
    category: resolvedCategory,
    searchMode: "live",
    providerLabel: "Pexels API",
    previewType: "image",
    url: photo.src?.large2x || photo.src?.large || photo.src?.medium || "",
    externalUrl: photo.url,
  })).filter((item) => item.url).slice(0, maxResults);
}

async function searchWikiImages({ lessonContext = {}, instruction = "", category = "diagram", maxResults = 8 }) {
  const { arabicQueries, englishQueries, resolvedCategory, profile, userQuery, hasSpecificTopic } = buildMediaSearchPhrases({ lessonContext, instruction, category, limit: 4 });
  // Decision: use English Wikipedia when we have a specific topic match, Arabic otherwise
  // Arabic Wikipedia is good for Arabic content; English Wikipedia has more images overall
  const useEnglish = hasSpecificTopic;
  // Always prefer the user's actual query as the primary search term
  const query = useEnglish
    ? englishQueries[0]
    : (arabicQueries[0] || userQuery || cleanText(lessonContext.title || instruction || "تعليم", 80));
  const lang = useEnglish ? "en" : "ar";
  console.log("[contextualMedia] Wikipedia query", { query, lang, category: resolvedCategory, userQuery: userQuery.slice(0, 50) });

  const endpoint = new URL(`https://${lang}.wikipedia.org/w/api.php`);
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrlimit", String(Math.min(maxResults * 2, 16)));
  endpoint.searchParams.set("prop", "pageimages|info");
  endpoint.searchParams.set("pithumbsize", "900");
  endpoint.searchParams.set("pilimit", String(Math.min(maxResults, 12)));
  endpoint.searchParams.set("inprop", "url");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");

  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Wikipedia API error: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  return pages.map((page, index) => ({
    id: `wiki-${resolvedCategory}-${page.pageid}`,
    title: cleanText(page.title || query, 80),
    caption: `${profile.arabicLabel} من ويكيبيديا`,
    query,
    source: "stock",
    category: resolvedCategory,
    searchMode: "fallback",
    providerLabel: "Wikipedia Contextual",
    previewType: "image",
    url: page.thumbnail?.source || "",
    externalUrl: page.fullurl || "",
  })).filter((item) => item.url).slice(0, maxResults);
}

async function searchWikimediaCommons({ lessonContext = {}, instruction = "", category = "diagram", maxResults = 8 }) {
  const { commonsQuery, resolvedCategory, profile, strategy } = buildMediaSearchPhrases({ lessonContext, instruction, category, limit: 4 });
  console.log("[contextualMedia] Wikimedia Commons query", { query: commonsQuery, category: resolvedCategory });

  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", commonsQuery);
  endpoint.searchParams.set("gsrnamespace", "6"); // File: namespace = actual image files
  endpoint.searchParams.set("gsrlimit", String(Math.min(maxResults * 3, 30)));
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime|size");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("origin", "*");

  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Wikimedia Commons API error: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = await response.json();
  const pages = Object.values(data.query?.pages || {});
  const preferMime = strategy.commonsPreferMime;

  // Sort: preferred mime type first, then other images
  const sorted = pages.sort((a, b) => {
    const aMatch = (a.imageinfo?.[0]?.mime || "") === preferMime ? 0 : 1;
    const bMatch = (b.imageinfo?.[0]?.mime || "") === preferMime ? 0 : 1;
    return aMatch - bMatch;
  });

  return sorted
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.url) return null;
      const mime = info.mime || "";
      if (!mime.startsWith("image/")) return null;
      // Exclude tiny thumbnails (< 50KB)
      if (info.size && info.size < 50000) return null;
      return {
        id: `commons-${resolvedCategory}-${page.pageid}`,
        title: cleanText((page.title || commonsQuery).replace(/^File:/i, ""), 80),
        caption: `${profile.arabicLabel} من Wikimedia Commons`,
        query: commonsQuery,
        source: "stock",
        category: resolvedCategory,
        searchMode: "fallback",
        providerLabel: "Wikimedia Commons",
        previewType: "image",
        url: info.url,
        externalUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || "")}`,
      };
    })
    .filter(Boolean)
    .slice(0, maxResults);
}

function uniqueByUrl(items) {
  const seen = new Set();
  return (items || []).filter((item) => {
    const key = String(item?.url || item?.embedUrl || item?.externalUrl || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchAiImageCandidates({ lessonContext = {}, instruction = "", category = "diagram", maxResults = 6 }) {
  const { arabicQueries, englishTags, resolvedCategory, profile, strategy, userQuery, hasSpecificTopic } = buildMediaSearchPhrases({ lessonContext, instruction, category, limit: Math.max(4, maxResults) });
  const apiUrl = String(process.env.AI_IMAGE_API_URL || "").trim();
  const apiKey = String(process.env.AI_IMAGE_API_KEY || "").trim();

  // Build topic string for prompts: prefer specific English tags, fallback to the user's text (works with Pollinations even in Arabic)
  const topicFromHints = hasSpecificTopic ? englishTags.slice(0, 3).join(", ") : "";
  const topicFromUser = cleanText(instruction || lessonContext.title || "", 80);
  const topic = topicFromHints || topicFromUser || "educational";

  if (apiUrl) {
    const prompts = unique([
      `${topic}, ${strategy.aiPromptStyle}`,
      ...arabicQueries.slice(0, 3),
    ]).slice(0, Math.max(3, maxResults));

    const endpoint = new URL(apiUrl);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({ prompts, category: resolvedCategory, maxResults }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`AI image API error: ${response.status} ${text.slice(0, 160)}`);
    }

    const data = await response.json();
    const items = (data.items || data.images || []).map((item, index) => ({
      id: item.id || `ai-live-${resolvedCategory}-${index + 1}`,
      title: cleanText(item.title || arabicQueries[index % arabicQueries.length] || "صورة مولدة بالذكاء الاصطناعي", 100),
      caption: cleanText(item.caption || `${profile.arabicLabel} عبر AI API`, 130),
      source: "ai",
      category: resolvedCategory,
      searchMode: "live",
      providerLabel: "AI Image API",
      previewType: "image",
      url: item.url || item.imageUrl || "",
      externalUrl: item.externalUrl || "",
    })).filter((item) => item.url);

    return uniqueByUrl(items).slice(0, maxResults);
  }

  // Fallback: Pollinations.ai — free text-to-image, accepts both Arabic and English prompts.
  // The topic may be Arabic if ENGLISH_HINTS didn't match; Pollinations handles it reasonably.
  // Each result uses a unique random seed to prevent identical images on repeated calls.
  const styleVariants = [
    strategy.aiPromptStyle,
    `${strategy.aiPromptStyle}, high resolution, detailed`,
    `${strategy.aiPromptStyle}, minimal, clean white background`,
    `academic ${resolvedCategory}, professional, labeled, textbook quality`,
    `${strategy.aiPromptStyle}, colorful, modern design`,
    `scientific ${resolvedCategory} of ${topicFromHints || "educational topic"}, educational illustration`,
  ];

  console.log(`[contextualMedia] Pollinations AI fallback topic="${topic.slice(0, 60)}" category=${resolvedCategory} maxResults=${maxResults}`);

  return Array.from({ length: maxResults }, (_, index) => {
    const seed = Math.floor(Math.random() * 999983) + index * 7919;
    const style = styleVariants[index % styleVariants.length];
    // Build prompt: combine user query + style. Use English when available, Arabic as fallback.
    const promptBase = topicFromHints || topicFromUser;
    const prompt = `${promptBase}, ${style}`;
    const encodedPrompt = encodeURIComponent(prompt);
    return {
      id: `ai-pollinations-${resolvedCategory}-${seed}`,
      title: cleanText(topicFromUser || topic, 100),
      caption: `${profile.arabicLabel} مولدة بالذكاء الاصطناعي (Pollinations AI)`,
      source: "ai",
      category: resolvedCategory,
      searchMode: "pollinations",
      providerLabel: "Pollinations AI",
      previewType: "image",
      prompt,
      url: `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=640&seed=${seed}&nologo=true`,
    };
  });
}

async function getContextualImageCandidates({ lessonContext = {}, instruction = "", source = "stock", category = "diagram", maxResults = 8 }) {
  const resolvedCategory = resolveImageCategory(category);
  // Limit AI results to 4 so Pollinations.ai images load in reasonable time (generated on-demand)
  const aiMaxResults = Math.min(maxResults, 4);

  if (source === "ai") {
    console.log("[contextualMedia] AI image request", { category: resolvedCategory, instruction: cleanText(instruction, 120), maxResults: aiMaxResults });
    try {
      const aiItems = await searchAiImageCandidates({ lessonContext, instruction, category: resolvedCategory, maxResults: aiMaxResults });
      if (aiItems?.length) {
        console.log(`[contextualMedia] AI success: returned ${aiItems.length} Pollinations items`);
        return uniqueByUrl(aiItems).slice(0, aiMaxResults);
      }
      console.log("[contextualMedia] AI returned empty array, using SVG fallback");
    } catch (error) {
      console.error("[contextualMedia] AI image generation failed:", error.message);
    }
    const fallback = createContextualImageCandidates({ lessonContext, instruction, source, category: resolvedCategory }).slice(0, maxResults);
    console.log(`[contextualMedia] AI fallback: returning ${fallback.length} SVG placeholders`);
    return fallback;
  }

  console.log("[contextualMedia] Stock image request", { category: resolvedCategory, instruction: cleanText(instruction, 120) });

  // Priority chain: Pexels (paid) → Wikimedia Commons (free, actual image files) → Wikipedia (free, article thumbnails) → Unsplash fallback
  try {
    const pexelsItems = await searchPexelsImages({ lessonContext, instruction, category: resolvedCategory, maxResults });
    if (pexelsItems?.length) {
      console.log(`[contextualMedia] Pexels returned ${pexelsItems.length} results`);
      return uniqueByUrl(pexelsItems).slice(0, maxResults);
    }
  } catch (error) {
    console.error("[contextualMedia] Pexels image search failed:", error.message);
  }

  try {
    const commonsItems = await searchWikimediaCommons({ lessonContext, instruction, category: resolvedCategory, maxResults });
    if (commonsItems?.length) {
      console.log(`[contextualMedia] Wikimedia Commons returned ${commonsItems.length} results (category=${resolvedCategory})`);
      return uniqueByUrl(commonsItems).slice(0, maxResults);
    }
    console.log("[contextualMedia] Wikimedia Commons returned no results, trying Wikipedia");
  } catch (error) {
    console.error("[contextualMedia] Wikimedia Commons search failed:", error.message);
  }

  try {
    const wikiItems = await searchWikiImages({ lessonContext, instruction, category: resolvedCategory, maxResults });
    if (wikiItems?.length) {
      console.log(`[contextualMedia] Wikipedia returned ${wikiItems.length} results`);
      return uniqueByUrl(wikiItems).slice(0, maxResults);
    }
  } catch (error) {
    console.error("[contextualMedia] Wikipedia image search failed:", error.message);
  }

  console.log("[contextualMedia] All providers failed, using Unsplash fallback");
  return uniqueByUrl(createContextualImageCandidates({ lessonContext, instruction, source, category: resolvedCategory })).slice(0, maxResults);
}

const VIMEO_FALLBACK_IDS = [76979871, 22439234, 146022717, 1084537, 395212534, 357274789, 499467950, 536637150, 491584845, 344997895];

function createContextualVideoCandidates({ lessonContext = {}, instruction = "", provider = "youtube" }) {
  const { arabicQueries, englishTags } = buildSearchPhrases(lessonContext, instruction, 6);
  const topicTag = (englishTags || [])[0] || "education";
  // Shuffle Vimeo IDs each call for variety
  const shuffledVimeo = shuffleArray(VIMEO_FALLBACK_IDS);
  return arabicQueries.map((query, index) => {
    const actualQuery = query || lessonContext.title || instruction || "تعلم";
    // Add educational keyword to YouTube query for more relevant results
    const ytQuery = `${actualQuery} شرح تعليمي`;
    const embedQuery = encodeURIComponent(ytQuery);
    const providerLabel = provider === "vimeo" ? "Vimeo" : "YouTube";
    const externalUrl = provider === "vimeo"
      ? `https://vimeo.com/search?q=${encodeURIComponent(actualQuery)}`
      : `https://www.youtube.com/results?search_query=${embedQuery}`;
    const vimeoId = provider === "vimeo" ? shuffledVimeo[index % shuffledVimeo.length] : null;

    return {
      id: `${provider}-video-fallback-${index + 1}`,
      title: `${actualQuery} · ${providerLabel}`,
      caption: `فيديو تعليمي مرتبط بسياق الدرس الحالي`,
      provider,
      query: actualQuery,
      searchMode: "fallback",
      providerLabel: `${providerLabel} Fallback`,
      embedUrl: provider === "youtube"
        ? `https://www.youtube.com/embed?listType=search&list=${embedQuery}`
        : `https://player.vimeo.com/video/${vimeoId}`,
      externalUrl,
      thumbnailUrl: provider === "vimeo"
        ? `https://vumbnail.com/${vimeoId}.jpg`
        : `https://source.unsplash.com/640x360/?${encodeURIComponent(`${topicTag},education,learning,video`)}&sig=${index + Date.now() % 1000}`,
    };
  });
}

async function searchYouTubeVideos({ lessonContext = {}, instruction = "", maxResults = 6 }) {
  const apiKey = String(process.env.YOUTUBE_API_KEY || "").trim();
  if (!apiKey) return null;

  const { arabicQueries } = buildSearchPhrases(lessonContext, instruction, 4);
  const queries = unique(arabicQueries).slice(0, 2);
  const collected = [];

  for (const query of queries) {
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("relevanceLanguage", "ar");
    searchUrl.searchParams.set("safeSearch", "strict");
    searchUrl.searchParams.set("maxResults", String(Math.min(maxResults, 6)));
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("key", apiKey);

    const response = await fetch(searchUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`YouTube API error: ${response.status} ${text.slice(0, 140)}`);
    }

    const data = await response.json();
    for (const item of data.items || []) {
      const videoId = item?.id?.videoId;
      if (!videoId) continue;
      collected.push({
        id: `youtube-${videoId}`,
        title: cleanText(item.snippet?.title || query, 110),
        caption: cleanText(item.snippet?.description || `نتيجة YouTube مرتبطة بسياق: ${query}`, 180),
        provider: "youtube",
        searchMode: "live",
        providerLabel: "YouTube API",
        query,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        externalUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url || "",
      });
    }

    if (collected.length >= maxResults) break;
  }

  return uniqueById(collected).slice(0, maxResults);
}

async function searchVimeoVideos({ lessonContext = {}, instruction = "", maxResults = 6 }) {
  const token = String(process.env.VIMEO_ACCESS_TOKEN || "").trim();
  if (!token) return null;

  const { arabicQueries } = buildSearchPhrases(lessonContext, instruction, 4);
  const query = arabicQueries[0] || cleanText(lessonContext.title || instruction || "education", 80);
  const searchUrl = new URL("https://api.vimeo.com/videos");
  searchUrl.searchParams.set("query", query);
  searchUrl.searchParams.set("per_page", String(Math.min(maxResults, 6)));
  searchUrl.searchParams.set("sort", "relevant");
  searchUrl.searchParams.set("direction", "desc");

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `bearer ${token}`,
      Accept: "application/vnd.vimeo.*+json;version=3.4",
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vimeo API error: ${response.status} ${text.slice(0, 140)}`);
  }

  const data = await response.json();
  return (data.data || []).map((item) => {
    const uri = String(item.uri || "");
    const videoId = uri.split("/").filter(Boolean).pop();
    const pictures = item.pictures?.sizes || [];
    const thumbnail = pictures[pictures.length - 1]?.link || pictures[0]?.link || "";
    return {
      id: `vimeo-${videoId}`,
      title: cleanText(item.name || query, 110),
      caption: cleanText(item.description || `نتيجة Vimeo مرتبطة بسياق: ${query}`, 180),
      provider: "vimeo",
      searchMode: "live",
      providerLabel: "Vimeo API",
      query,
      embedUrl: videoId ? `https://player.vimeo.com/video/${videoId}` : "",
      externalUrl: item.link || (videoId ? `https://vimeo.com/${videoId}` : ""),
      thumbnailUrl: thumbnail,
    };
  }).filter((item) => item.embedUrl).slice(0, maxResults);
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function getContextualVideoCandidates({ lessonContext = {}, instruction = "", provider = "youtube", maxResults = 6 }) {
  const baseQueries = buildSearchPhrases(lessonContext, instruction, 4);
  // Instruction (what the user typed) is the primary search query for videos
  const userText = cleanText(instruction || lessonContext.title || "تعلم", 120);
  const educationalQuery = `${userText} شرح تعليمي`;
  console.log(`[contextualMedia] Video request provider=${provider} userText="${userText.slice(0, 60)}" educationalQuery="${educationalQuery.slice(0, 70)}"`);

  try {
    if (provider === "youtube") {
      const youtubeItems = await searchYouTubeVideos({ lessonContext, instruction, maxResults });
      if (youtubeItems?.length) {
        console.log(`[contextualMedia] YouTube API returned ${youtubeItems.length} results`);
        return youtubeItems;
      }

      // Keyless fallback: scrape YouTube search page for real video IDs.
      const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(educationalQuery)}&hl=ar`;
      const htmlRes = await fetch(youtubeSearchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const regex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
        const allIds = [];
        const seen = new Set();
        let match;
        // Collect more than needed, then shuffle for variety
        while ((match = regex.exec(html)) !== null && allIds.length < maxResults * 3) {
          const id = match[1];
          if (!seen.has(id)) {
            seen.add(id);
            allIds.push(id);
          }
        }
        // Shuffle to prevent same order on repeated calls, then pick maxResults
        const ids = shuffleArray(allIds).slice(0, maxResults);
        if (ids.length) {
          console.log(`[contextualMedia] YouTube web scrape returned ${ids.length} IDs (shuffled from ${allIds.length})`);
          return ids.map((id, index) => ({
            id: `youtube-web-${id}`,
            title: `${educationalQuery} · فيديو ${index + 1}`,
            caption: "نتيجة من YouTube تعليمي",
            provider: "youtube",
            searchMode: "web-scrape",
            providerLabel: "YouTube Web",
            query: educationalQuery,
            embedUrl: `https://www.youtube.com/embed/${id}`,
            externalUrl: `https://www.youtube.com/watch?v=${id}`,
            thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
          }));
        }
      }
    }

    if (provider === "vimeo") {
      const vimeoItems = await searchVimeoVideos({ lessonContext, instruction, maxResults });
      if (vimeoItems?.length) {
        console.log(`[contextualMedia] Vimeo API returned ${vimeoItems.length} results`);
        return vimeoItems;
      }

      // Keyless fallback: scrape Vimeo search page for real video IDs.
      const vimeoSearchUrl = `https://vimeo.com/search?q=${encodeURIComponent(educationalQuery)}`;
      const htmlRes = await fetch(vimeoSearchUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (htmlRes.ok) {
        const html = await htmlRes.text();
        const regex = /vimeo\.com\/(\d{8,12})/g;
        const allIds = [];
        const seen = new Set();
        let match;
        while ((match = regex.exec(html)) !== null && allIds.length < maxResults * 3) {
          const id = match[1];
          if (!seen.has(id)) {
            seen.add(id);
            allIds.push(id);
          }
        }
        const ids = shuffleArray(allIds).slice(0, maxResults);
        if (ids.length) {
          console.log(`[contextualMedia] Vimeo web scrape returned ${ids.length} IDs (shuffled from ${allIds.length})`);
          return ids.map((id, index) => ({
            id: `vimeo-web-${id}`,
            title: `${educationalQuery} · Vimeo ${index + 1}`,
            caption: "نتيجة من Vimeo تعليمي",
            provider: "vimeo",
            searchMode: "web-scrape",
            providerLabel: "Vimeo Web",
            query: educationalQuery,
            embedUrl: `https://player.vimeo.com/video/${id}`,
            externalUrl: `https://vimeo.com/${id}`,
            thumbnailUrl: `https://vumbnail.com/${id}.jpg`,
          }));
        }
      }
    }
  } catch (error) {
    console.error(`[contextualMedia] ${provider} live search failed:`, error.message);
  }

  console.log(`[contextualMedia] ${provider} all sources failed, using curated fallback`);
  return createContextualVideoCandidates({ lessonContext, instruction, provider }).slice(0, maxResults);
}

function createComparisonRows(lessonContext = {}) {
  const sections = (lessonContext.sections || []).slice(0, 4);
  if (sections.length >= 2) {
    return sections.map((section) => ({ label: cleanText(section.heading, 26), value: cleanText(section.content, 60) }));
  }
  return (lessonContext.keyTerms || []).slice(0, 4).map((term) => ({ label: cleanText(term.term, 26), value: cleanText(term.definition, 60) }));
}

function createContextualChartPreview({ lessonContext = {}, instruction = "", chartType = "infographic" }) {
  const title = cleanText(instruction || lessonContext.title || "مخطط تعليمي", 42);
  const sections = (lessonContext.sections || []).slice(0, 4);
  const keyTerms = (lessonContext.keyTerms || []).slice(0, 5);
  const rows = createComparisonRows(lessonContext);
  const accent = chartType === "timeline" ? "#f59e0b" : chartType === "comparison" ? "#059669" : chartType === "concept-map" ? "#0ea5e9" : "#7c3aed";

  const svg = chartType === "comparison"
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620"><rect width="960" height="620" rx="28" fill="#fff"/><text x="56" y="72" font-size="34" font-weight="700" fill="#0f172a" font-family="Cairo, Arial">${escapeXml(title)}</text><text x="56" y="110" font-size="18" fill="#64748b" font-family="Cairo, Arial">مقارنة سياقية مبنية على الدرس الحالي</text>${rows.map((row, i) => `<rect x="56" y="${150 + i * 100}" width="220" height="64" rx="18" fill="${accent}18"/><text x="80" y="${190 + i * 100}" font-size="21" font-weight="700" fill="${accent}" font-family="Cairo, Arial">${escapeXml(row.label)}</text><rect x="308" y="${150 + i * 100}" width="596" height="64" rx="18" fill="#f8fafc" stroke="#e2e8f0"/><text x="336" y="${190 + i * 100}" font-size="18" fill="#334155" font-family="Cairo, Arial">${escapeXml(row.value)}</text>`).join("")}</svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 620"><rect width="960" height="620" rx="28" fill="#ffffff"/><text x="56" y="72" font-size="34" font-weight="700" fill="#0f172a" font-family="Cairo, Arial">${escapeXml(title)}</text><text x="56" y="110" font-size="18" fill="#64748b" font-family="Cairo, Arial">${escapeXml(cleanText(lessonContext.title, 80) || "تنظيم بصري سياقي")}</text>${(sections.length ? sections : keyTerms.map((term) => ({ heading: term.term, content: term.definition }))).slice(0, 4).map((item, i) => { const x = i % 2 === 0 ? 56 : 504; const y = 170 + Math.floor(i / 2) * 180; return `<rect x="${x}" y="${y}" width="400" height="126" rx="24" fill="${accent}14" stroke="${accent}44" stroke-width="2"/><text x="${x + 28}" y="${y + 44}" font-size="24" font-weight="700" fill="${accent}" font-family="Cairo, Arial">${escapeXml(cleanText(item.heading || item.term, 26))}</text><text x="${x + 28}" y="${y + 84}" font-size="18" fill="#334155" font-family="Cairo, Arial">${escapeXml(cleanText(item.content || item.definition, 76))}</text>`; }).join("")}<path d="M480 250 L480 380" stroke="${accent}" stroke-width="8" stroke-linecap="round" /></svg>`;

  return {
    title,
    description: `معاينة ${chartType} مبنية على عنوان الدرس والأقسام والمصطلحات الحالية.`,
    chartType,
    svg,
  };
}

function createFallbackTextResult({ lessonContext = {}, instruction = "", mode = "generate" }) {
  const title = cleanText(lessonContext.title || "الموضوع الحالي", 90);
  const section = (lessonContext.sections || [])[0];
  const keyTerms = (lessonContext.keyTerms || []).slice(0, 3).map((term) => term.term).filter(Boolean);
  const openerMap = {
    generate: `يوضح هذا النص جانبًا أساسيًا من درس ${title}.`,
    rewrite: `في صياغة أكاديمية أوضح، يتناول هذا المحتوى موضوع ${title}.`,
    expand: `لتوسيع شرح ${title}، يجدر إبراز الفكرة الرئيسة ثم ربطها بأمثلة تطبيقية واضحة.`,
    summarize: `خلاصة ${title} تتمثل في فهم المفاهيم الجوهرية وربطها بالتطبيق العملي.`,
    simplify: `بشكل مبسط، يشرح درس ${title} فكرة رئيسة يمكن فهمها من خلال أمثلة مباشرة.`,
    examples: `من الأمثلة التعليمية المناسبة في درس ${title} ما يساعد الطالب على نقل الفكرة من التجريد إلى التطبيق.`,
  };

  const content = [
    openerMap[mode] || openerMap.generate,
    instruction ? `التركيز المطلوب هنا هو: ${cleanText(instruction, 140)}.` : "",
    section?.heading ? `يرتبط ذلك بالقسم: ${cleanText(section.heading, 70)}.` : "",
    section?.content ? cleanText(section.content, 220) : "",
    keyTerms.length ? `تشمل المصطلحات الداعمة: ${keyTerms.join("، ")}.` : "",
  ].filter(Boolean).join(" ");

  return {
    title: `${title} · ${mode}`,
    content,
    rationale: "تم إنشاء نص احتياطي يعتمد على سياق الدرس الحالي عند تعذر استجابة النموذج.",
  };
}

module.exports = {
  buildLessonContextDocument,
  createContextualChartPreview,
  createContextualImageCandidates,
  getContextualImageCandidates,
  createContextualVideoCandidates,
  getContextualVideoCandidates,
  createFallbackTextResult,
};
