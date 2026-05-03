require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");
const Anthropic = require("@anthropic-ai/sdk");
const {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { TranslateClient, TranslateTextCommand } = require("@aws-sdk/client-translate");
const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const { PollyClient, SynthesizeSpeechCommand } = require("@aws-sdk/client-polly");
const { initDb, insertFile, deleteFile, listFiles } = require("./db");
const {
  buildLessonContextDocument,
  createContextualChartPreview,
  createContextualImageCandidates,
  getContextualImageCandidates,
  createContextualVideoCandidates,
  getContextualVideoCandidates,
  createFallbackTextResult,
} = require("./contextualMedia");

const app = express();
const PORT = process.env.PORT || 4000;
const LOCAL_UPLOADS_DIR = path.join(__dirname, "local-uploads");
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
const DEFAULT_ANTHROPIC_MODEL_FALLBACKS = [
  "claude-opus-4-7",
  "claude-opus-4-6",
  "claude-opus-4-5-20251101",
];

// --- Anthropic client (direct API) ---
// Default is false so beginner setup works smoothly with Bedrock-only credentials.
const useAnthropicDirect = String(process.env.USE_ANTHROPIC_DIRECT || "false").toLowerCase() === "true";
const anthropic = useAnthropicDirect && process.env.ANTHROPIC_API_KEY 
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

if (useAnthropicDirect && !anthropic) {
  console.warn("Warning: USE_ANTHROPIC_DIRECT is true but ANTHROPIC_API_KEY is not set. Will fall back to Bedrock.");
}

const DEFAULT_BEDROCK_MODEL_ID = "amazon.nova-lite-v1:0";
const DEFAULT_BEDROCK_MODEL_FALLBACKS = [
  "us.amazon.nova-lite-v1:0",
  "amazon.nova-pro-v1:0",
  "us.amazon.nova-pro-v1:0",
  "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  "anthropic.claude-3-5-sonnet-20241022-v2:0",
  "us.anthropic.claude-3-haiku-20240307-v1:0",
  "anthropic.claude-3-haiku-20240307-v1:0",
];

const hasStaticAwsKeys = Boolean(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
const awsClientConfig = {
  region: process.env.AWS_REGION || "us-east-1",
  ...(hasStaticAwsKeys
    ? {
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
        },
      }
    : {}),
};

// --- S3 client ---
const s3 = new S3Client(awsClientConfig);

const BUCKET = process.env.S3_BUCKET_NAME;

if (!BUCKET) {
  console.warn("Warning: S3_BUCKET_NAME is not set. Generated images/files will use local storage fallback.");
}

// --- AWS Translate client ---
const translator = new TranslateClient(awsClientConfig);

// --- AWS Bedrock client ---
const bedrock = new BedrockRuntimeClient(awsClientConfig);

// --- AWS Polly client ---
const polly = new PollyClient(awsClientConfig);

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
fs.mkdirSync(LOCAL_UPLOADS_DIR, { recursive: true });
app.use("/local-uploads", express.static(LOCAL_UPLOADS_DIR));

function isAwsAuthOrConfigError(err) {
  const msg = String(err?.message || "").toLowerCase();
  return (
    msg.includes("access key") ||
    msg.includes("credentials") ||
    msg.includes("security token") ||
    msg.includes("s3 bucket") ||
    msg.includes("not configured")
  );
}

function makeLocalFileName(originalname) {
  const safeBase = path.basename(String(originalname || "file")).replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeBase}`;
}

function makeLocalFileKey(localName) {
  return `local-uploads/${localName}`;
}

function makeLocalFileUrl(localName) {
  return `http://localhost:${PORT}/local-uploads/${encodeURIComponent(localName)}`;
}

function parseLocalFileNameFromKey(key) {
  const value = String(key || "");
  if (!value.startsWith("local-uploads/")) return null;
  const localName = value.slice("local-uploads/".length);
  return localName ? path.basename(localName) : null;
}

async function listLocalFiles() {
  const names = await fs.promises.readdir(LOCAL_UPLOADS_DIR);
  const out = [];
  for (const localName of names) {
    const fullPath = path.join(LOCAL_UPLOADS_DIR, localName);
    const stat = await fs.promises.stat(fullPath);
    if (!stat.isFile()) continue;
    out.push({
      key: makeLocalFileKey(localName),
      name: localName.replace(/^\d+-\d+-/, ""),
      size: stat.size,
      uploadedAt: stat.mtime,
      mimeType: null,
      url: makeLocalFileUrl(localName),
      storage: "local",
    });
  }
  out.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  return out;
}

async function persistGeneratedPng(base64Png, nameHint = "generated-image") {
  const safeHint = path.basename(String(nameHint || "generated-image")).replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeHint}.png`;
  const imageBuffer = Buffer.from(String(base64Png || ""), "base64");

  if (!imageBuffer.length) {
    throw new Error("Generated image is empty");
  }

  if (BUCKET) {
    const key = `generated-images/${fileName}`;
    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: imageBuffer,
        ContentType: "image/png",
      }));

      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: BUCKET, Key: key }),
        { expiresIn: 86400 }
      );

      return { url: signedUrl, key, storage: "s3" };
    } catch (s3Err) {
      if (!isAwsAuthOrConfigError(s3Err)) throw s3Err;
      console.warn("[persistGeneratedPng] s3 unavailable, fallback to local:", s3Err.message);
    }
  }

  const localName = fileName;
  const localPath = path.join(LOCAL_UPLOADS_DIR, localName);
  await fs.promises.writeFile(localPath, imageBuffer);
  return {
    url: makeLocalFileUrl(localName),
    key: makeLocalFileKey(localName),
    storage: "local",
  };
}

function validateGeneratedSvg(svg) {
  const text = String(svg || "");
  if (!text.includes("<svg")) return false;
  if (!/viewBox="0 0 \d+ \d+"/i.test(text)) return false;
  const rectCount = (text.match(/<rect\b/gi) || []).length;
  const foreignObjectCount = (text.match(/<foreignObject\b/gi) || []).length;
  // Accept either: old-style (many rects + text elements) or new foreignObject style
  if (foreignObjectCount >= 4) return true; // new foreignObject infographic
  return rectCount >= 5; // old-style fallback
}

app.get("/", (req, res) => {
  res.json({
    message: "Backend is running",
    endpoints: ["/files", "/upload", "/extract", "/translate", "/generate-lesson", "/generate-contextual-content", "/media-provider-status", "/health"],
  });
});

app.get("/media-provider-status", (req, res) => {
  const youtubeLive = Boolean(String(process.env.YOUTUBE_API_KEY || "").trim());
  const vimeoLive = Boolean(String(process.env.VIMEO_ACCESS_TOKEN || "").trim());
  const stockLive = Boolean(String(process.env.STOCK_IMAGE_API_KEY || "").trim());
  const aiLive = Boolean(String(process.env.AI_IMAGE_API_URL || "").trim());

  res.json({
    youtube: {
      mode: youtubeLive ? "live" : "fallback",
      configured: youtubeLive,
      label: youtubeLive ? "YouTube API Live" : "YouTube Fallback Contextual",
    },
    vimeo: {
      mode: vimeoLive ? "live" : "fallback",
      configured: vimeoLive,
      label: vimeoLive ? "Vimeo API Live" : "Vimeo Fallback Contextual",
    },
    stockImage: {
      mode: stockLive ? "live" : "fallback",
      configured: stockLive,
      label: stockLive ? "Pexels API Live" : "Stock Fallback Contextual",
    },
    aiImage: {
      mode: aiLive ? "live" : "fallback",
      configured: aiLive,
      label: aiLive ? "AI Image API Live" : "AI Fallback Generator",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (req, res) => {
  try {
    // Test AWS Bedrock connection
    const testPrompt = "Hello";
    const bedrockResult = await invokeClaudeWithFallback(testPrompt, 10, "Health check");

    // Test S3 connection
    if (BUCKET) {
      await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, MaxKeys: 1 }));
    }

    res.json({
      status: "healthy",
      bedrock: "connected",
      s3: BUCKET ? "connected" : "not-configured",
      region: process.env.AWS_REGION,
      model: bedrockResult.modelId,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const normalized = normalizeBedrockError(err, "Health check");
    console.error("[Health Check] Error:", err.message);
    if (normalized.code === "DAILY_TOKEN_LIMIT") {
      return res.status(200).json({
        status: "degraded",
        bedrock: "quota-exceeded",
        localFallback: true,
        s3: BUCKET ? "connected" : "not-configured",
        region: process.env.AWS_REGION,
        error: normalized.message,
        code: normalized.code,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(500).json({
      status: "unhealthy",
      error: normalized.message,
      code: normalized.code,
      errorName: err.name,
      timestamp: new Date().toISOString(),
    });
  }
});

app.post("/debug/force-test", async (req, res) => {
  try {
    const testText = "هذا اختبار لتوليد درس بسيط جداً";
    const testPrompt = `Create a simple Arabic lesson structure from: "${testText}"\n\nReturn valid JSON only.`;
    
    console.log("[Debug] Testing Bedrock connection...");
    const invokeResult = await invokeClaudeWithFallback(testPrompt, 200, "Debug test");
    const result = invokeResult.text;

    res.json({
      success: true,
      message: "Bedrock connection is working correctly",
      model: invokeResult.modelId,
      response: result.slice(0, 200),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Debug] Bedrock test failed:", err);
    const normalized = normalizeBedrockError(err, "Debug test");
    if (normalized.code === "DAILY_TOKEN_LIMIT") {
      return res.status(200).json({
        success: true,
        degraded: true,
        message: "Bedrock quota reached; local lesson fallback remains available.",
        normalizedCode: normalized.code,
        timestamp: new Date().toISOString(),
      });
    }
    res.status(500).json({
      success: false,
      error: err.message,
      normalizedCode: normalized.code,
      errorName: err.name,
      errorStack: err.stack?.split("\n").slice(0, 3).join("\n"),
      timestamp: new Date().toISOString(),
    });
  }
});

function getRetryAfterSeconds(err) {
  const candidates = [
    err?.$response?.headers?.["retry-after"],
    err?.$metadata?.retryAfterSeconds,
    err?.retryAfterSeconds,
  ];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return Math.ceil(parsed);
  }
  return null;
}

function normalizeBedrockError(err, prefix) {
  const name = String(err?.name || "").toLowerCase();
  const message = String(err?.message || "Unknown error");
  const messageLower = message.toLowerCase();
  const retryAfterSeconds = getRetryAfterSeconds(err);

  // Check for authentication/permission errors
  const isAuthError = 
    name.includes("accessdenied") || 
    name.includes("unauthorized") ||
    name.includes("invaliduseridexception") ||
    name.includes("invalidclienttokenid") ||
    name.includes("invalidsignatureexception") ||
    name.includes("tokenrefresherror") ||
    messageLower.includes("not authorized") ||
    messageLower.includes("access denied") ||
    messageLower.includes("security token") ||
    messageLower.includes("invalid token") ||
    messageLower.includes("token is invalid") ||
    messageLower.includes("token has expired");

  if (isAuthError) {
    return {
      status: 401,
      code: "AUTH_ERROR",
      retryAfterSeconds: null,
      message: `${prefix} failed: AWS authentication failed. Check your credentials.`,
    };
  }

  // Only treat as REAL quota if explicitly mentioned in the message
  const isRealQuotaExceeded =
    messageLower.includes("too many tokens per day") ||
    (messageLower.includes("daily") && messageLower.includes("token") && messageLower.includes("limit"));

  if (isRealQuotaExceeded) {
    return {
      status: 429,
      code: "DAILY_TOKEN_LIMIT",
      retryAfterSeconds,
      message: retryAfterSeconds
        ? `${prefix} failed: Daily token limit reached. Please wait ${retryAfterSeconds} seconds and try again.`
        : `${prefix} failed: Daily token limit reached. Please wait before trying again.`,
    };
  }

  // Check for throttling - this is temporary and should retry
  const isThrottled = 
    name.includes("throttl") || 
    name.includes("toomanyrequests") ||
    name.includes("requestlimitexceeded") ||
    messageLower.includes("too many") ||
    messageLower.includes("rate exceeded");

  if (isThrottled) {
    const wait = retryAfterSeconds || 30; // Default 30 seconds for throttling
    return {
      status: 429,
      code: "THROTTLED",
      retryAfterSeconds: wait,
      message: `${prefix} failed: Service is temporarily busy. Please wait ${wait} seconds and try again.`,
    };
  }
  const requiresInferenceProfile =
    name.includes("validationexception") &&
    messageLower.includes("inference profile") &&
    (messageLower.includes("on-demand throughput") || messageLower.includes("isn't supported") || messageLower.includes("is not supported"));

  if (requiresInferenceProfile) {
    return {
      status: 400,
      code: "INFERENCE_PROFILE_REQUIRED",
      retryAfterSeconds: null,
      message: `${prefix} failed: This model requires an inference profile ID (for example us.anthropic...).`,
    };
  }

  return {
    status: 500,
    code: "GENERATION_FAILED",
    retryAfterSeconds,
    message: `${prefix} failed: ${message}`,
  };
}

function toModelVariants(modelId) {
  const id = String(modelId || "").trim();
  if (!id) return [];
  if (id.startsWith("us.anthropic.")) {
    return [id, id.replace(/^us\./, "")];
  }
  if (id.startsWith("anthropic.")) {
    return [id, `us.${id}`];
  }
  return [id];
}

function isBlockedLegacyModel(modelId) {
  const id = String(modelId || "").toLowerCase();
  return (
    id.includes("claude-3-5-haiku-20241022") ||
    id.includes("claude-3-haiku-20240307")
  );
}

function buildModelCandidates(primary, fallbackCsv) {
  const fromEnv = String(fallbackCsv || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const rawCandidates = [primary, ...fromEnv, ...DEFAULT_BEDROCK_MODEL_FALLBACKS];
  const deduped = [];
  const seen = new Set();

  for (const rawId of rawCandidates) {
    if (isBlockedLegacyModel(rawId)) continue;
    for (const variant of toModelVariants(rawId)) {
      if (isBlockedLegacyModel(variant)) continue;
      if (seen.has(variant)) continue;
      seen.add(variant);
      deduped.push(variant);
    }
  }

  return deduped;
}

function getConfiguredModelCandidates() {
  const configured = String(process.env.BEDROCK_MODEL_ID || "").trim();
  const primary = configured && !isBlockedLegacyModel(configured)
    ? configured
    : DEFAULT_BEDROCK_MODEL_ID;
  return buildModelCandidates(primary, process.env.BEDROCK_FALLBACK_MODEL_IDS);
}

function getConfiguredImageModelCandidates() {
  const fromEnv = String(process.env.BEDROCK_IMAGE_MODEL_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  // Defaults can be overridden from .env to match account-approved models.
  const defaults = [
    "amazon.titan-image-generator-v2:0",
    "amazon.nova-canvas-v1:0",
    "amazon.titan-image-generator-v1",
  ];

  const candidates = fromEnv.length ? fromEnv : defaults;
  const deduped = [];
  const seen = new Set();
  for (const id of candidates) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  return deduped;
}

function getConfiguredAnthropicModelCandidates() {
  const primary = String(process.env.ANTHROPIC_MODEL || ANTHROPIC_MODEL).trim();
  const fromEnv = String(process.env.ANTHROPIC_FALLBACK_MODELS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  const deduped = [];
  const seen = new Set();
  for (const id of [primary, ...fromEnv, ...DEFAULT_ANTHROPIC_MODEL_FALLBACKS]) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    deduped.push(id);
  }
  return deduped;
}

function isNovaModel(modelId) {
  return String(modelId || "").startsWith("amazon.nova");
}

function buildBedrockRequestBody(modelId, prompt, maxTokens) {
  if (isNovaModel(modelId)) {
    return {
      messages: [{ role: "user", content: [{ text: prompt }] }],
      inferenceConfig: {
        maxTokens,
        temperature: 0.3,
      },
    };
  }

  return {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
}

function extractBedrockText(modelId, rawBody) {
  if (isNovaModel(modelId)) {
    return rawBody?.output?.message?.content?.[0]?.text || "";
  }
  return rawBody?.content?.[0]?.text || "";
}

async function invokeClaudeDirectly(prompt, maxTokens, prefix, modelId = ANTHROPIC_MODEL) {
  if (!anthropic) {
    throw new Error("Anthropic client not initialized. Set ANTHROPIC_API_KEY.");
  }

  try {
    console.log(`[Anthropic] Calling ${modelId} directly via API...`);
    const message = await anthropic.messages.create({
      model: modelId,
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    const text = message.content?.[0]?.type === "text" ? message.content[0].text : "";
    console.log(`[Anthropic] Success with ${modelId}`);

    return {
      modelId,
      text,
      source: "anthropic-direct",
    };
  } catch (err) {
    console.error(`[Anthropic] Error:`, err.message);
    throw err;
  }
}

// ── Amazon Titan Image Generator / Nova Canvas ────────────────────────────────
async function generateImageWithBedrock(prompt, negativeText = "blurry, bad quality, text overlay, watermark, distorted, ugly") {
  const IMAGE_MODELS = getConfiguredImageModelCandidates();
  for (const modelId of IMAGE_MODELS) {
    try {
      console.log(`[BedrockImage] Trying ${modelId}...`);
      const body = {
        taskType: "TEXT_IMAGE",
        textToImageParams: { text: prompt.slice(0, 512), negativeText },
        imageGenerationConfig: {
          numberOfImages: 1,
          quality: "standard",
          width: 1024,
          height: 1024,
          cfgScale: 7.5,
          seed: Math.floor(Math.random() * 2147483646),
        },
      };
      const response = await bedrock.send(new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(body),
      }));
      const result = JSON.parse(Buffer.from(response.body).toString("utf-8"));
      const base64 = result.images?.[0];
      if (!base64) throw new Error("No image data in response");
      console.log(`[BedrockImage] Success with ${modelId}`);
      return { dataUrl: `data:image/png;base64,${base64}`, modelId };
    } catch (err) {
      console.warn(`[BedrockImage] ${modelId} failed:`, err.message);
    }
  }
  throw new Error("All Bedrock image generation models failed");
}

async function invokeClaudeWithFallback(prompt, maxTokens, prefix) {
  // Try Anthropic Direct API first if configured
  if (anthropic && useAnthropicDirect) {
    const anthropicModelIds = getConfiguredAnthropicModelCandidates();
    let anthropicLastError = null;

    for (const modelId of anthropicModelIds) {
      try {
        return await invokeClaudeDirectly(prompt, maxTokens, prefix, modelId);
      } catch (err) {
        anthropicLastError = err;
        const messageLower = String(err?.message || "").toLowerCase();
        const canTryAnotherAnthropicModel =
          messageLower.includes("not_found_error") ||
          messageLower.includes("model:") ||
          messageLower.includes("rate limit") ||
          messageLower.includes("overloaded");

        console.warn(`[Anthropic] ${prefix} failed on ${modelId}:`, err.message);
        if (canTryAnotherAnthropicModel) {
          continue;
        }
        break;
      }
    }

    if (anthropicLastError) {
      console.warn(`[Anthropic] All configured models failed, falling back to Bedrock:`, anthropicLastError.message);
    }
  }

  // Fall back to Bedrock
  const modelIds = getConfiguredModelCandidates();
  let lastError = null;

  for (const modelId of modelIds) {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        console.log(`[Bedrock] Attempting ${modelId} (try ${attempt}/2) for ${prefix}...`);
        const response = await bedrock.send(new InvokeModelCommand({
          modelId,
          contentType: "application/json",
          accept: "application/json",
          body: JSON.stringify(buildBedrockRequestBody(modelId, prompt, maxTokens)),
        }));
        const raw = JSON.parse(Buffer.from(response.body).toString("utf-8"));
        return {
          modelId,
          text: extractBedrockText(modelId, raw),
        };
      } catch (err) {
        lastError = err;
        const normalized = normalizeBedrockError(err, prefix);
        console.error(`[Bedrock] ${prefix} failed on ${modelId}:`, normalized.code, err.message);

        if (normalized.code === "THROTTLED" && attempt < 2) {
          const waitMs = Math.max(1000, Math.min((normalized.retryAfterSeconds || 2) * 1000, 6000));
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        const canTryAnotherModel =
          normalized.code === "DAILY_TOKEN_LIMIT" ||
          normalized.code === "THROTTLED" ||
          normalized.code === "INFERENCE_PROFILE_REQUIRED" ||
          normalized.code === "AUTH_ERROR";

        if (canTryAnotherModel) break;
        throw err;
      }
    }
  }

  throw lastError || new Error("Model invocation failed");
}

function cleanSentence(s) {
  return String(s || "")
    .replace(/\s+/g, " ")
    .replace(/^[\-•\d\.)\s]+/, "")
    .trim();
}

function splitSentences(text) {
  return String(text || "")
    .split(/(?<=[.!?؟\n])\s+/)
    .map(cleanSentence)
    .filter((s) => s && s.length > 8);
}

function chunkArray(items, chunkCount) {
  const arr = Array.isArray(items) ? items : [];
  const count = Math.max(1, Math.min(chunkCount || 1, arr.length || 1));
  const out = [];
  const size = Math.ceil(arr.length / count);
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

function normalizeArabic(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, "")
    .replace(/ـ/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, " ")
    .trim();
}

function termKey(term) {
  return normalizeArabic(term)
    .replace(/^ال/, "")
    .replace(/(ات|ان|ون|ين|يه|ه)$/g, "")
    .trim();
}

function uniqueByTermKey(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = termKey(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function tokenizeArabic(text) {
  const stop = new Set([
    "في", "من", "على", "الى", "إلى", "الي", "عن", "هذا", "هذه", "ذلك", "تلك", "هو", "هي", "هم", "هن",
    "كان", "كانت", "يكون", "تكون", "تم", "قد", "مع", "ثم", "أو", "و", "كما", "أي", "ان", "أن",
    "إن", "لا", "ما", "لم", "لن", "كل", "بعض", "ايضا", "أيضا", "هناك", "هنا", "عند", "بعد", "قبل",
    "حتى", "خلال", "حول", "ضمن", "بين", "التي", "الذي", "الذين", "حيث", "لكن", "بل", "لان", "لأن",
    "يمكن", "استخدام", "باستخدام", "محور", "المحور", "النقطه", "النقطة", "الرئيسيه", "الرئيسية", "مقابل",
  ]);

  return String(text || "")
    .replace(/[^\u0600-\u06FF\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stop.has(normalizeArabic(w)));
}

function isLowQualityConceptTerm(term) {
  const cleaned = cleanSentence(term).replace(/[،,:;.!?؟]/g, " ").trim();
  const tokens = cleaned
    .split(/\s+/)
    .map((t) => normalizeArabic(t))
    .filter(Boolean);

  const badEdgeTokens = new Set([
    "مقابل", "ضد", "بين", "الي", "الى", "او", "ثم", "مثل", "ضمن", "حول", "عبر",
    "هو", "هي", "كان", "كانت", "يكون", "يمكن", "حيث",
  ]);

  if (!tokens.length || tokens.length > 4) return true;
  if (tokens.some((t) => t.length < 3)) return true;
  if (badEdgeTokens.has(tokens[0]) || badEdgeTokens.has(tokens[tokens.length - 1])) return true;

  const unique = new Set(tokens);
  if (unique.size === 1 && tokens.length > 1) return true;

  const norm = normalizeArabic(cleaned);
  if (norm.includes("مقابل الواقع")) return true;
  return false;
}

function buildHeadingFromChunk(chunk, fallbackTerm, index) {
  const first = cleanSentence((chunk && chunk[0]) || "");
  const colonSplit = first.split(/[:：]/).map((s) => cleanSentence(s));
  if (colonSplit[0] && colonSplit[0].length >= 8 && colonSplit[0].length <= 50) {
    return colonSplit[0];
  }

  const tokens = tokenizeArabic(first).slice(0, 5);
  if (tokens.length >= 2) return tokens.join(" ");
  if (fallbackTerm) return fallbackTerm;
  return `النقطة الرئيسة ${index + 1}`;
}

function splitParagraphs(text) {
  return String(text || "")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function escapeXml(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function extractTopArabicTerms(text, max = 6) {
  const tokens = tokenizeArabic(text);
  const uni = new Map();
  const bi = new Map();
  const generic = new Set([
    "الدرس", "موضوع", "الموضوع", "المحتوي", "المحتوى", "فكره", "فكرة", "نقطه", "نقطة",
    "اساسي", "اساسية", "رئيسي", "رئيسية", "تطبيق", "تطبيقات", "شرح", "تعلم", "تعليم",
  ]);

  for (let i = 0; i < tokens.length; i++) {
    const one = tokens[i];
    uni.set(one, (uni.get(one) || 0) + 1);
    if (i < tokens.length - 1) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      bi.set(phrase, (bi.get(phrase) || 0) + 1);
    }
  }

  const phraseCandidates = [...bi.entries()]
    .map(([phrase, count]) => {
      const parts = phrase.split(" ").map((p) => normalizeArabic(p));
      const hasArticle = parts.some((p) => p.startsWith("ال"));
      const genericHit = parts.some((p) => generic.has(p));
      const score = count * 3 + (hasArticle ? 2 : 0) - (genericHit ? 2 : 0);
      return { phrase, score, count };
    })
    .filter((item) => item.score >= 3 && item.count >= 1)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.phrase)
    .filter((term) => !isLowQualityConceptTerm(term));

  const wordCandidates = [...uni.entries()]
    .filter(([word]) => !generic.has(normalizeArabic(word)))
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter((term) => !isLowQualityConceptTerm(term));

  const merged = uniqueByTermKey([...phraseCandidates, ...wordCandidates]);
  return merged.slice(0, max);
}

function buildTermDefinition(term, sentences) {
  const glossary = {
    "الواقع المعزز": "تقنية تدمج عناصر رقمية مثل النصوص أو النماذج ثلاثية الأبعاد مع المشهد الحقيقي في الوقت الفعلي عبر الهاتف أو النظارات الذكية.",
    "العالم الحقيقي": "البيئة المادية التي يعيش فيها الإنسان ويتفاعل معها مباشرة، وتُستخدم كمرجع عند مقارنة الأنظمة الرقمية أو الافتراضية بها.",
    "الذكاء الاصطناعي": "مجال في علوم الحاسب يهدف إلى بناء أنظمة قادرة على التعلم والاستدلال واتخاذ قرارات تحاكي بعض قدرات التفكير البشري.",
    "التعلم الآلي": "فرع من الذكاء الاصطناعي يعتمد على تدريب النماذج على البيانات لاكتشاف الأنماط والتنبؤ أو التصنيف دون برمجة قواعد ثابتة لكل حالة.",
    "الواقع الافتراضي": "بيئة رقمية غامرة بالكامل تحاكي الواقع أو تنشئ عالماً جديداً يتفاعل معه المستخدم عبر أجهزة خاصة.",
    "الواقع المختلط": "تقنية تجمع بين الواقع المعزز والواقع الافتراضي بحيث تتفاعل العناصر الرقمية مع البيئة الحقيقية بشكل متزامن وواقعي.",
    "الواقع الموسع": "مصطلح شامل يضم تقنيات الواقع المعزز والواقع الافتراضي والواقع المختلط ضمن منظومة واحدة تسمى XR.",
    "القائم على العلامات": "نمط من الواقع المعزز يعتمد على علامة مرئية محددة (Marker) لبدء عرض العنصر الرقمي وتتبع موقعه.",
    "بدون علامة": "نمط من الواقع المعزز لا يحتاج إلى Marker ويعتمد على الكاميرا والمستشعرات لفهم المكان وتثبيت العناصر الرقمية.",
  };

  const k = termKey(term);
  const normalizedTerm = normalizeArabic(term);
  const glossaryKey = Object.keys(glossary).find((entry) => termKey(entry) === k || normalizeArabic(entry) === normalizedTerm);
  if (glossaryKey) {
    return glossary[glossaryKey];
  }

  const found = (sentences || []).find((s) => normalizeArabic(s).includes(normalizedTerm) || termKey(s).includes(k));
  if (found) {
    const cleaned = cleanSentence(found);
    const compact = cleaned
      .replace(/^(يعني|يقصد ب|يشير إلى|هو|هي)\s*/i, "")
      .replace(/^.{0,20}[:،]\s*/, "")
      .slice(0, 180);
    const normalizedCompact = normalizeArabic(compact);
    const repeatedComparison = (normalizedCompact.match(/مقابل/g) || []).length >= 2;
    if (compact.length >= 30 && !repeatedComparison && !isLowQualityConceptTerm(compact)) {
      return `${term} هو ${compact}`;
    }
  }
  return `${term} هو مفهوم أساسي في هذا الدرس، ويُستخدم لفهم العلاقة بين الفكرة النظرية والتطبيق العملي.`;
}

function ensureUniqueHeadings(sections) {
  const seen = new Map();
  return (sections || []).map((s, i) => {
    const base = cleanSentence(s.heading || `النقطة الرئيسة ${i + 1}`);
    const key = normalizeArabic(base);
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    return {
      ...s,
      heading: count > 1 ? `${base} (${count})` : base,
    };
  });
}

function termRelatedToAny(term, refs) {
  const candidateNorm = normalizeArabic(term);
  const candidateKey = termKey(term);
  const candidateTokens = tokenizeArabic(term).map((t) => termKey(t)).filter(Boolean);

  return (refs || []).some((ref) => {
    const refNorm = normalizeArabic(ref);
    const refKey = termKey(ref);
    const refTokens = tokenizeArabic(ref).map((t) => termKey(t)).filter(Boolean);
    if (!refNorm) return false;

    if (candidateKey && refKey && candidateKey === refKey) return true;
    if (candidateNorm.includes(refNorm) || refNorm.includes(candidateNorm)) return true;

    return candidateTokens.some((tk) => refTokens.includes(tk));
  });
}

function extractAugmentedRealityTypes(section) {
  const headingNorm = normalizeArabic(section?.heading || "");
  const isArTypesSection =
    headingNorm.includes("انواع") &&
    headingNorm.includes("واقع") &&
    headingNorm.includes("معزز");

  if (!isArTypesSection) return [];

  const contentNorm = normalizeArabic(section?.content || "");
  const out = [];

  if (/(علامات|العلامات|marker)/i.test(contentNorm)) {
    out.push("القائم على العلامات");
  }
  if (/(بدون علام|دون علام|بلا علام|markerless|ماركرلس)/i.test(contentNorm)) {
    out.push("بدون علامة");
  }

  const unique = uniqueByTermKey(out).slice(0, 2);
  if (unique.length) return unique;

  return ["القائم على العلامات", "بدون علامة"];
}

function selectSectionConcepts(section, fallbackTerms, blockedRefs, usedKeys, limit = 3) {
  const strictArTypes = extractAugmentedRealityTypes(section);
  if (strictArTypes.length) {
    const accepted = [];
    for (const term of strictArTypes) {
      const key = termKey(term);
      if (!key || usedKeys.has(key)) continue;
      usedKeys.add(key);
      accepted.push(term);
    }
    if (accepted.length) return accepted;
  }

  const sectionText = `${section?.heading || ""} ${section?.content || ""}`;
  const localCandidates = extractTopArabicTerms(sectionText, 12);
  const pool = uniqueByTermKey([
    ...localCandidates,
    ...(fallbackTerms || []),
  ]);

  const picked = [];
  for (const candidate of pool) {
    const key = termKey(candidate);
    if (!key || usedKeys.has(key)) continue;
    if (candidate.length < 4 || candidate.length > 34) continue;
    if (isLowQualityConceptTerm(candidate)) continue;
    if (termRelatedToAny(candidate, blockedRefs)) continue;

    usedKeys.add(key);
    picked.push(candidate);
    if (picked.length >= limit) break;
  }

  if (!picked.length) {
    picked.push("مفهوم فرعي", "مبدأ تطبيقي");
  }

  return picked.slice(0, limit);
}

function createLocalImageCards(lesson) {
  const terms = lesson?.keyTerms?.slice(0, 4).map((t) => t.term) || [];
  const sections = lesson?.sections?.slice(0, 4) || [];
  const sectionTitles = sections.map((s) => s.heading);

  const comparisonLeft = sections.slice(0, 2).map((s) => cleanSentence(s.content).slice(0, 50));
  const comparisonRight = sections.slice(2, 4).map((s) => cleanSentence(s.content).slice(0, 50));

  return [
    {
      title: "خريطة عناصر الدرس",
      type: "diagram",
      color: "#7c3aed",
      items: sectionTitles.length ? sectionTitles : ["مدخل", "فكرة رئيسة", "تفصيل", "تطبيق"],
      description: "عرض سريع للمحاور الأساسية في الدرس.",
    },
    {
      title: "مقارنة بين المفاهيم",
      type: "comparison",
      color: "#059669",
      left: {
        label: "المحور الأول",
        items: comparisonLeft.length ? comparisonLeft : ["تعريف المفهوم", "أهمية المفهوم"],
      },
      right: {
        label: "المحور الثاني",
        items: comparisonRight.length ? comparisonRight : ["آلية التطبيق", "النتائج المتوقعة"],
      },
    },
    {
      title: "خطوات التطبيق",
      type: "steps",
      color: "#0ea5e9",
      steps: [
        { num: "1", text: `فهم عنوان الدرس: ${lesson?.title || "الموضوع"}` },
        { num: "2", text: `تحليل أهم المفاهيم: ${(terms[0] || "المفهوم الأول")} و ${(terms[1] || "المفهوم الثاني")}` },
        { num: "3", text: "ربط المفاهيم بمثال واقعي من البيئة التعليمية." },
        { num: "4", text: "تقييم الفهم عبر أسئلة قصيرة وتغذية راجعة." },
      ],
    },
  ];
}

function createLocalSimulation(lesson, summary) {
  const keyTerms = lesson?.keyTerms?.slice(0, 3).map((k) => k.term) || ["المفهوم", "التطبيق", "التحليل"];
  const firstSection = lesson?.sections?.[0]?.heading || "المحور الأول";
  const secondSection = lesson?.sections?.[1]?.heading || "المحور الثاني";

  return {
    scenario: `أنت في موقف تعليمي يتطلب شرح موضوع "${lesson?.title || "الدرس"}" لزملائك بطريقة واضحة وعملية. المطلوب اختيار قرارات صحيحة للوصول إلى فهم أعمق.`,
    role: "متعلم محلل",
    steps: [
      {
        step: 1,
        title: "تحديد نقطة البداية",
        description: `أمامك ثلاثة مداخل لفهم ${firstSection}. ما الاختيار الأفضل للبدء؟`,
        type: "choice",
        question: "ما الخطوة الأولى الأنسب؟",
        choices: [
          { id: "a", text: "قراءة الفكرة الرئيسة ثم مراجعة المثال", correct: true, feedback: "اختيار ممتاز لأنه يبني فهماً تدريجياً." },
          { id: "b", text: "الانتقال مباشرة للأسئلة دون قراءة", correct: false, feedback: "هذا يضعف الاستيعاب لأن الأساس لم يُبنَ بعد." },
          { id: "c", text: "تجاهل المحتوى والتركيز على الحفظ فقط", correct: false, feedback: "الحفظ دون فهم لا يحقق الهدف التعليمي." },
        ],
        hint: "ابدأ بما يمنحك صورة شاملة قبل التفاصيل.",
      },
      {
        step: 2,
        title: "تحليل المفاهيم",
        description: `طُلب منك ربط ${secondSection} بالمفاهيم الأساسية الواردة في الدرس.`,
        type: "input",
        question: "اكتب جملة قصيرة تشرح العلاقة بين المفاهيم الرئيسية.",
        expectedKeywords: keyTerms,
        hint: `حاول تضمين الكلمات: ${keyTerms.join("، ")}`,
      },
      {
        step: 3,
        title: "قرار تطبيقي",
        description: "الآن عليك اختيار أفضل إجراء لتثبيت التعلم في موقف عملي.",
        type: "choice",
        question: "ما الخيار الأكثر فاعلية للتطبيق؟",
        choices: [
          { id: "a", text: "تدوين مصطلحات فقط دون تطبيق", correct: false, feedback: "الحفظ فقط لا يكفي دون ممارسة." },
          { id: "b", text: "تنفيذ نشاط تطبيقي ثم مراجعة النتيجة", correct: true, feedback: "هذا الخيار يعزز الفهم العميق عبر التطبيق العملي." },
          { id: "c", text: "تجاوز التطبيق والانتقال مباشرة للملخص", correct: false, feedback: "الملخص مهم لكنه لا يغني عن التطبيق." },
        ],
        hint: "اختر ما يجمع بين التعلم العملي والتغذية الراجعة.",
      },
    ],
    outcome: `بنهاية المحاكاة أصبحت قادرًا على توظيف مفاهيم الدرس في مواقف واقعية مع فهم أوضح للعلاقات بين الأفكار. ${summary ? `ملخص داعم: ${cleanSentence(summary).slice(0, 140)}` : ""}`,
  };
}

function createLocalConceptMap(lesson) {
  const title = escapeXml(lesson?.title || "خريطة مفاهيم الدرس");
  const sections = (lesson?.sections || []).slice(0, 4);
  const terms = (lesson?.keyTerms || []).slice(0, 12).map((t) => t.term).filter(Boolean);

  const effectiveSections = sections.length
    ? sections
    : [{ heading: "الفكرة الرئيسة" }, { heading: "النقاط الأساسية" }, { heading: "التطبيق" }];

  const sectionCount = Math.min(4, effectiveSections.length);
  const width = 980;
  const height = 560;
  const centerX = Math.round(width / 2);
  const stepX = width / (sectionCount + 1);
  const sectionPositions = Array.from({ length: sectionCount }).map((_, i) => ({
    x: Math.round(stepX * (i + 1)),
    y: 220,
  }));

  const sectionNodes = sectionPositions.map((p, i) => {
    const heading = escapeXml((effectiveSections[i]?.heading || `محور ${i + 1}`).slice(0, 32));
    return `
      <path d="M ${centerX} 118 Q ${(centerX + p.x) / 2} 162 ${p.x} ${p.y - 34}" fill="none" stroke="#7c3aed" stroke-width="2.4" />
      <rect x="${p.x - 90}" y="${p.y - 34}" width="180" height="52" rx="12" fill="#f5f3ff" stroke="#7c3aed" stroke-width="1.8" />
      <text x="${p.x}" y="${p.y - 4}" text-anchor="middle" font-size="13" fill="#312e81" font-weight="700" font-family="Tahoma, Arial">${heading}</text>
    `;
  }).join("\n");

  const rootRefs = [lesson?.title || ""];
  const usedTermKeys = new Set();

  const groupedTerms = sectionPositions.map((_, sectionIndex) => {
    const section = effectiveSections[sectionIndex] || {};
    const blockedRefs = [
      ...rootRefs,
      section.heading || "",
      ...(tokenizeArabic(section.heading || "") || []),
    ];
    return selectSectionConcepts(section, terms, blockedRefs, usedTermKeys, 3);
  });

  const termNodes = groupedTerms.map((group, sectionIndex) => {
    const base = sectionPositions[sectionIndex];
    return group.slice(0, 3).map((t, idx) => {
      const x = base.x;
      const y = 336 + idx * 74;
      const term = escapeXml((t || `مفهوم ${sectionIndex + idx + 1}`).slice(0, 22));
      return `
        <path d="M ${base.x} ${base.y + 18} Q ${base.x} ${(base.y + y) / 2} ${x} ${y - 22}" fill="none" stroke="#059669" stroke-width="1.8" />
        <rect x="${x - 70}" y="${y - 22}" width="140" height="38" rx="10" fill="#ecfdf5" stroke="#059669" stroke-width="1.4" />
        <text x="${x}" y="${y + 2}" text-anchor="middle" font-size="12" fill="#065f46" font-family="Tahoma, Arial">${term}</text>
      `;
    }).join("\n");
  }).join("\n");

  return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Concept Map" direction="rtl">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    <rect x="${centerX - 230}" y="56" width="460" height="62" rx="14" fill="#e8eaf6" stroke="#1a237e" stroke-width="2" />
    <text x="${centerX}" y="95" text-anchor="middle" font-size="18" font-weight="700" fill="#1a237e" font-family="Tahoma, Arial">${title}</text>
    ${sectionNodes}
    ${termNodes}
  </svg>`;
}

function buildLocalLesson(text, enrich = {}) {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  const sentences = splitSentences(normalized);
  const paragraphs = String(text || "")
    .split(/\n{2,}/)
    .map((p) => cleanSentence(p))
    .filter((p) => p.length > 30);

  const firstSentence = sentences[0] || normalized || "موضوع تعليمي";
  const title = cleanSentence(firstSentence).slice(0, 90) || "درس مولد محليًا";
  const terms = extractTopArabicTerms(normalized, 8)
    .filter((term) => !isLowQualityConceptTerm(term))
    .slice(0, 6);
  const effectiveTerms = terms.length ? terms : ["الفكرة الرئيسة", "التطبيق", "التحليل"];

  const objectives = [
    `فهم المفاهيم الأساسية في موضوع: ${title.slice(0, 36)}`,
    `القدرة على شرح المصطلحات الرئيسة مثل: ${effectiveTerms[0]}`,
    "تطبيق المعرفة في مواقف تعليمية عملية",
  ];

  let sections = [];
  if (paragraphs.length >= 2) {
    sections = paragraphs.slice(0, 4).map((p, i) => ({
      heading: buildHeadingFromChunk(splitSentences(p), effectiveTerms[i], i),
      content: p,
    }));
  } else {
    const sentencePool = sentences.length ? sentences : [normalized || "محتوى الدرس غير متوفر."];
    const desiredSections = sentencePool.length >= 16 ? 4 : sentencePool.length >= 9 ? 3 : 2;
    const chunks = chunkArray(sentencePool, desiredSections);
    sections = chunks.map((chunk, i) => ({
      heading: buildHeadingFromChunk(chunk, effectiveTerms[i], i),
      content: cleanSentence(chunk.join(" ")),
    }));
  }

  if (!sections.length) {
    sections = [{ heading: "النقطة الرئيسة 1", content: normalized || "محتوى الدرس غير متوفر." }];
  }

  sections = ensureUniqueHeadings(sections);

  const keyTerms = terms.map((term) => ({
    term,
    definition: buildTermDefinition(term, sentences),
  }));

  const summary = cleanSentence(sentences.slice(0, 4).join(" ")).slice(0, 900) || "ملخص غير متوفر.";

  const quizSeed = terms.length ? terms : ["الفكرة الرئيسة", "التطبيق العملي", "المفهوم", "التحليل", "الاستنتاج"];
  const quiz = Array.from({ length: 5 }).map((_, i) => {
    const t = quizSeed[i % quizSeed.length];
    const correct = `أ) ${t}`;
    return {
      question: `ما الخيار الأكثر ارتباطًا بموضوع الدرس في السؤال ${i + 1}؟`,
      options: [
        correct,
        `ب) معلومة غير مرتبطة مباشرة`,
        `ج) مثال جانبي`,
        `د) إجابة عامة جدًا`,
      ],
      answer: correct,
      explanation: `تم اختيار "${t}" لأنه يرتبط مباشرة بمحتوى الدرس والمفاهيم الواردة فيه.`,
    };
  });

  const result = {
    lesson: {
      title,
      objectives,
      sections,
      keyTerms,
    },
    summary,
    quiz,
    fallback: true,
    fallbackReason: "DAILY_TOKEN_LIMIT",
    fallbackMessage: "تم التوليد المحلي بسبب استهلاك الحد اليومي للتوكنات.",
  };

  if (enrich.images) {
    result.imageCards = createLocalImageCards(result.lesson);
  }

  if (enrich.simulation) {
    result.simulation = createLocalSimulation(result.lesson, result.summary);
  }

  if (enrich.conceptMap) {
    result.conceptMap = createLocalConceptMap(result.lesson);
  }

  if (enrich.video) {
    const q = encodeURIComponent(result.lesson?.title || "education");
    result.video = {
      url: `https://www.youtube.com/results?search_query=${q}`,
      searchQuery: result.lesson?.title,
    };
  }

  return result;
}

// --- Multer: memory storage so we can extract text before uploading ---
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const memUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and DOCX files are allowed"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// --- Text extraction helper ---
async function extractText(buffer, mimetype) {
  if (mimetype === "application/pdf") {
    const data = await pdfParse(buffer);
    return data.text.trim();
  }
  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  return "";
}

// --- Upload: extract text + store in S3 ---
app.post("/upload", memUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  try {
    const { buffer, originalname, mimetype, size } = req.file;
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const key = `uploads/${unique}-${originalname}`;
    let storage = "s3";
    let persistedKey = key;
    let fileUrl = null;

    if (BUCKET) {
      try {
        await s3.send(
          new PutObjectCommand({
            Bucket: BUCKET,
            Key: key,
            Body: buffer,
            ContentType: mimetype,
          })
        );

        fileUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: key }),
          { expiresIn: 3600 }
        );
      } catch (s3Err) {
        if (!isAwsAuthOrConfigError(s3Err)) {
          throw s3Err;
        }
        console.error("/upload s3 fallback to local:", s3Err.message);
        storage = "local";
      }
    } else {
      storage = "local";
    }

    if (storage === "local") {
      const localName = makeLocalFileName(originalname);
      const fullPath = path.join(LOCAL_UPLOADS_DIR, localName);
      await fs.promises.writeFile(fullPath, buffer);
      persistedKey = makeLocalFileKey(localName);
      fileUrl = makeLocalFileUrl(localName);
    }

    // Extract text from buffer
    let extractedText = "";
    let extractError = null;
    try {
      extractedText = await extractText(buffer, mimetype);
    } catch (err) {
      extractError = "Text extraction failed: " + err.message;
    }

    // Persist metadata to RDS (no-op if DB not configured)
    await insertFile({ key: persistedKey, name: originalname, size, mimeType: mimetype });

    return res.json({
      message: "File uploaded successfully",
      file: {
        key: persistedKey,
        name: originalname,
        size,
        url: fileUrl,
        storage,
        extractedText,
        extractError,
      },
    });
  } catch (err) {
    console.error("/upload error:", err);
    return res.status(500).json({ error: "Failed to upload file: " + err.message });
  }
});

// --- Extract-only: no S3 storage ---
app.post("/extract", memUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file provided" });

  try {
    const text = await extractText(req.file.buffer, req.file.mimetype);
    res.json({ name: req.file.originalname, text });
  } catch (err) {
    res.status(500).json({ error: "Extraction failed: " + err.message });
  }
});

// --- Extract text from an already-uploaded S3 file by key ---
app.get("/extract/:key(*)", async (req, res) => {
  const key = req.params.key;
  try {
    const localName = parseLocalFileNameFromKey(key);
    if (localName) {
      const fullPath = path.join(LOCAL_UPLOADS_DIR, localName);
      const buffer = await fs.promises.readFile(fullPath);
      const lower = localName.toLowerCase();
      const mimetype = lower.endsWith(".pdf")
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const text = await extractText(buffer, mimetype);
      return res.json({ key, text });
    }

    const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

    // Stream to buffer
    const chunks = [];
    for await (const chunk of obj.Body) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const mimetype = obj.ContentType;
    const text = await extractText(buffer, mimetype);
    res.json({ key, text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Extraction failed: " + err.message });
  }
});

// --- List files (RDS when available, S3 fallback) ---
app.get("/files", async (req, res) => {
  try {
    // Try RDS first
    let dbRows = null;
    try {
      dbRows = await listFiles();
    } catch (dbErr) {
      console.error("/files db list error:", dbErr.message);
      dbRows = null;
    }

    if (!BUCKET) {
      // Do not hard-fail the UI when object storage is not configured.
      if (Array.isArray(dbRows)) {
        const withUrls = dbRows.map((row) => {
          const localName = parseLocalFileNameFromKey(row.key);
          return {
            ...row,
            url: localName ? makeLocalFileUrl(localName) : null,
            storage: localName ? "local" : "unknown",
          };
        });
        if (withUrls.length) return res.json(withUrls);
      }
      return res.json(await listLocalFiles());
    }

    if (dbRows) {
      const files = await Promise.all(
        dbRows.map(async (row) => {
          let signedUrl = null;
          try {
            signedUrl = await getSignedUrl(
              s3,
              new GetObjectCommand({ Bucket: BUCKET, Key: row.key }),
              { expiresIn: 3600 }
            );
          } catch (signErr) {
            console.error("/files sign url error:", row.key, signErr.message);
          }
          return { ...row, url: signedUrl };
        })
      );
      return res.json(files);
    }

    // Fallback: list directly from S3
    const data = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "uploads/" }));
    const objects = data.Contents || [];
    const files = await Promise.all(
      objects.map(async (obj) => {
        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: BUCKET, Key: obj.Key }),
          { expiresIn: 3600 }
        );
        const rawName = obj.Key.replace("uploads/", "");
        const name = rawName.replace(/^\d+-\d+-/, "");
        return { key: obj.Key, name, size: obj.Size, uploadedAt: obj.LastModified, url: signedUrl };
      })
    );
    res.json(files);
  } catch (err) {
    console.error("/files error:", err);
    if (isAwsAuthOrConfigError(err)) {
      // Keep UI functional even when object storage credentials are unavailable.
      return res.json(await listLocalFiles());
    }

    res.status(500).json({ error: "Failed to list files: " + err.message });
  }
});

// --- Delete file ---
app.delete("/files/:key(*)", async (req, res) => {
  const key = req.params.key;
  try {
    const localName = parseLocalFileNameFromKey(key);
    if (localName) {
      const fullPath = path.join(LOCAL_UPLOADS_DIR, localName);
      await fs.promises.unlink(fullPath).catch(() => {});
      await deleteFile(key);
      return res.json({ message: "File deleted" });
    }

    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
    await deleteFile(key);
    res.json({ message: "File deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

async function translateChunkWithPublicApi(chunk) {
  const endpoint = new URL("https://translate.googleapis.com/translate_a/single");
  endpoint.searchParams.set("client", "gtx");
  endpoint.searchParams.set("sl", "auto");
  endpoint.searchParams.set("tl", "ar");
  endpoint.searchParams.set("dt", "t");
  endpoint.searchParams.set("q", chunk);

  const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Public translate API failed: ${response.status} ${text.slice(0, 120)}`);
  }

  const data = await response.json();
  const translated = (data?.[0] || []).map((part) => part?.[0] || "").join("").trim();
  if (!translated) {
    throw new Error("Public translate API returned empty translation");
  }
  return translated;
}

async function translateChunkWithClaude(chunk) {
  const prompt = `Translate the following text to Arabic.
Rules:
- Return ONLY the translated Arabic text.
- Keep meaning accurate.
- Do not add explanations.

Text:
${chunk}`;

  const result = await invokeClaudeWithFallback(prompt, 1600, "Translation fallback");
  const translated = String(result?.text || "").trim();
  if (!translated) {
    throw new Error("Claude translation fallback returned empty text");
  }
  return translated;
}

// --- Translate text to Arabic ---
// POST /translate  { text: "...", sourceLang: "en" (optional) }
app.post("/translate", async (req, res) => {
  const { text, sourceLang = "auto" } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

  // Short-circuit when content already appears Arabic.
  if (sourceLang === "ar" || (sourceLang === "auto" && /[\u0600-\u06FF]/.test(text))) {
    return res.json({
      translatedText: text,
      detectedLanguage: "ar",
      mode: "passthrough",
      providerLabel: "Local Arabic passthrough",
    });
  }

  const MAX_BYTES = 9000;
  const encoder = new TextEncoder();
  const chunks = [];
  let current = "";
  for (const sentence of text.split(/(?<=[.!?؟\n])\s+/)) {
    const candidate = current ? current + " " + sentence : sentence;
    if (encoder.encode(candidate).length > MAX_BYTES) {
      if (current) chunks.push(current);
      current = sentence;
    } else {
      current = candidate;
    }
  }
  if (current) chunks.push(current);

  try {
    const translated = await Promise.all(
      chunks.map((chunk) =>
        translator.send(new TranslateTextCommand({
          Text: chunk,
          SourceLanguageCode: sourceLang === "auto" ? "auto" : sourceLang,
          TargetLanguageCode: "ar",
        })).then((r) => r.TranslatedText)
      )
    );
    res.json({ translatedText: translated.join(" "), detectedLanguage: sourceLang });
  } catch (err) {
    console.error("/translate error:", err);

    if (isAwsAuthOrConfigError(err) || String(err?.message || "").toLowerCase().includes("translate")) {
      try {
        const publicTranslated = await Promise.all(chunks.map((chunk) => translateChunkWithPublicApi(chunk)));
        return res.json({
          translatedText: publicTranslated.join(" "),
          detectedLanguage: sourceLang,
          mode: "fallback-public",
          providerLabel: "Public Translate Fallback",
          warning: "AWS Translate unavailable. Used public translation fallback.",
        });
      } catch (publicErr) {
        console.error("/translate public fallback error:", publicErr.message);
      }

      try {
        const modelTranslated = await Promise.all(chunks.map((chunk) => translateChunkWithClaude(chunk)));
        return res.json({
          translatedText: modelTranslated.join(" "),
          detectedLanguage: sourceLang,
          mode: "fallback-model",
          providerLabel: "Claude Translation Fallback",
          warning: "AWS Translate unavailable. Used model translation fallback.",
        });
      } catch (modelErr) {
        console.error("/translate model fallback error:", modelErr.message);
      }

      return res.json({
        translatedText: text,
        detectedLanguage: sourceLang,
        mode: "fallback-passthrough",
        providerLabel: "Local Translation Passthrough",
        warning: "All translation providers are unavailable. Returned source text.",
      });
    }

    res.status(500).json({ error: "Translation failed: " + err.message });
  }
});

app.post("/generate-contextual-content", async (req, res) => {
  const {
    kind,
    lessonContext = {},
    instruction = "",
    mode = "generate",
    source = "ai",
    provider = "youtube",
    chartType = "infographic",
  } = req.body || {};

  if (!kind) {
    return res.status(400).json({ error: "kind is required" });
  }

  const contextDocument = buildLessonContextDocument({ ...lessonContext, instruction });

  const parseJsonObject = (text) => {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Model did not return valid JSON");
    return JSON.parse(match[0]);
  };

  try {
    if (kind === "text") {
      const prompt = `أنت محرر تعليمي عربي محترف. أنشئ ناتجاً واحداً فقط مرتبطاً مباشرة بسياق الدرس الحالي دون الخروج عنه.

سياق الدرس:
${contextDocument}

تعليمات المستخدم: ${instruction || "أنشئ نصاً تعليمياً جديداً"}
نمط العمل: ${mode}

أعد JSON فقط:
{
  "title": "عنوان قصير",
  "content": "النص النهائي بالعربية",
  "rationale": "سبب مناسبة الناتج للسياق"
}`;

      try {
        const invokeResult = await invokeClaudeWithFallback(prompt, 1800, "Contextual text generation");
        return res.json({ preview: parseJsonObject(invokeResult.text) });
      } catch (err) {
        console.error("[generate-contextual-content:text] Fallback:", err.message);
        return res.json({ preview: createFallbackTextResult({ lessonContext, instruction, mode }) });
      }
    }

    if (kind === "quiz") {
      const questionCount = Math.min(15, Math.max(3, parseInt(req.body.questionCount) || 5));
      const level = req.body.level || "medium";
      const levelLabel = level === "easy" ? "سهلة" : level === "hard" ? "متقدمة ومعمّقة" : "متوسطة الصعوبة";
      const quizPrompt = `أنت مصمم اختبارات تعليمية متخصص. أنشئ ${questionCount} سؤال اختيار من متعدد ${levelLabel} باللغة العربية، مرتبطة مباشرة بالدرس التالي:

${contextDocument.slice(0, 800)}

شروط مهمة:
- كل سؤال يجب أن يكون مرتبطاً ارتباطاً مباشراً بمحتوى الدرس أعلاه
- 4 خيارات لكل سؤال (أ، ب، ج، د)
- تضمين الإجابة الصحيحة وشرح موجز لها
- لا تكرار بين الأسئلة

أعد JSON فقط بهذا الهيكل الدقيق:
{
  "questions": [
    {
      "question": "نص السؤال؟",
      "options": ["أ) الخيار الأول", "ب) الخيار الثاني", "ج) الخيار الثالث", "د) الخيار الرابع"],
      "answer": "أ) الخيار الأول",
      "explanation": "شرح مختصر لسبب صحة هذه الإجابة"
    }
  ]
}`;

      try {
        const invokeResult = await invokeClaudeWithFallback(quizPrompt, 3000, "Quiz generation");
        const jsonMatch = String(invokeResult.text || "").match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Model did not return valid JSON");
        const parsed = JSON.parse(jsonMatch[0]);
        const questions = parsed.questions || [];
        if (!questions.length) throw new Error("No questions generated");
        return res.json({ questions: questions.slice(0, questionCount) });
      } catch (quizErr) {
        console.error("[generate-contextual-content:quiz] Error:", quizErr.message);
        // Fallback: generate basic questions from key terms
        const terms = (lessonContext.keyTerms || []).slice(0, questionCount);
        const fallbackQuestions = terms.map((term, i) => ({
          question: `ما هو تعريف "${term.term || term}"؟`,
          options: [`أ) ${term.definition || "التعريف الصحيح"}`, "ب) وصف غير دقيق", "ج) مفهوم مختلف", "د) لا علاقة له بالدرس"],
          answer: `أ) ${term.definition || "التعريف الصحيح"}`,
          explanation: `${term.term || term} هو من المصطلحات الأساسية في هذا الدرس.`,
        }));
        if (fallbackQuestions.length === 0) {
          return res.status(500).json({ error: "تعذر توليد الاختبار، يرجى المحاولة مرة أخرى" });
        }
        return res.json({ questions: fallbackQuestions });
      }
    }

    if (kind === "image") {
      const imgCategory = req.body.category || "photo";
      // For AI image generation, try Amazon Titan / Nova Canvas first
      if (source === "ai") {
        try {
          // Build English prompt for Titan (it works better with English)
          const topic = String(instruction || lessonContext.title || "educational topic").trim();
          const styleHint = imgCategory === "illustration"
            ? "clean vector illustration, flat design, colorful, educational"
            : imgCategory === "diagram"
            ? "labeled educational diagram, white background, clear labels, academic"
            : "realistic educational photograph, high quality, professional";
          const titanPrompt = `${topic}, ${styleHint}, high quality, no text overlay`;
          const titanResult = await generateImageWithBedrock(titanPrompt);
          const base64Png = String(titanResult.dataUrl || "").replace(/^data:image\/png;base64,/, "");
          const persisted = await persistGeneratedPng(base64Png, topic.slice(0, 32) || "generated");
          return res.json({
            items: [{
              id: `bedrock-img-${Date.now()}`,
              title: String(instruction || lessonContext.title || "صورة مولَّدة").trim(),
              caption: `مولَّد بـ Amazon Bedrock (${titanResult.modelId})`,
              url: persisted.url,
              fileKey: persisted.key,
              storage: persisted.storage,
              source: "ai-bedrock",
              category: imgCategory,
              previewType: "image",
            }],
          });
        } catch (titanErr) {
          console.warn("[BedrockImage] failed, falling back to Pollinations:", titanErr.message);
        }
      }
      return res.json({
        items: await getContextualImageCandidates({ lessonContext, instruction, source, category: imgCategory }),
      });
    }

    if (kind === "video") {
      return res.json({
        items: await getContextualVideoCandidates({ lessonContext, instruction, provider }),
      });
    }

    if (kind === "chart") {
      // The user's typed topic takes priority; lesson context is only background reference
      const chartTopic = String(instruction || lessonContext.title || "موضوع تعليمي").trim().slice(0, 100);
      const effectiveChartType = "infographic";
      const chartLabel = "إنفوجرافيك";

      const makeSvgPrompt = (strict = false) => `أنت خبير تصميم إنفوجرافيك SVG احترافي باللغة العربية.
أنشئ كود SVG كامل لإنفوجرافيك تعليمي عالي الجودة عن الموضوع: "${chartTopic}"

${contextDocument ? `معلومات مفيدة (استخدمها لملء المحتوى):\n${contextDocument.slice(0, 600)}\n` : ""}
متطلبات SVG الإلزامية:
1. يبدأ بـ <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 860 575">
2. خلفية بيضاء: <rect width="860" height="575" rx="24" fill="#ffffff"/>
3. شريط علوي بنفسجي (90px): <rect width="860" height="90" rx="24" fill="#7c3aed"/> ثم <rect y="66" width="860" height="24" fill="#7c3aed"/>
4. عنوان رئيسي داخل foreignObject في الشريط العلوي:
   <foreignObject x="0" y="0" width="860" height="90">
   <div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;justify-content:space-between;height:90px;padding:0 24px;direction:rtl;font-family:Cairo,Arial,sans-serif;box-sizing:border-box">
   <span style="font-size:24px;font-weight:900;color:white">[العنوان هنا]</span>
   <span style="font-size:13px;color:rgba(255,255,255,0.8)">📊 إنفوجرافيك تعليمي</span>
   </div></foreignObject>
5. أربعة بطاقات في شبكة 2×2:
   - البطاقة 1: x=15 y=105 width=400 height=205 fill="#ede9fe" stroke="#c4b5fd"
   - البطاقة 2: x=445 y=105 width=400 height=205 fill="#dbeafe" stroke="#93c5fd"
   - البطاقة 3: x=15 y=325 width=400 height=205 fill="#dcfce7" stroke="#86efac"
   - البطاقة 4: x=445 y=325 width=400 height=205 fill="#fef9c3" stroke="#fde047"
6. محتوى كل بطاقة داخل foreignObject (هذا ضروري للنص العربي):
   <rect x="[x]" y="[y]" width="400" height="205" rx="18" fill="[bg]" stroke="[border]" stroke-width="1.5"/>
   <foreignObject x="[x]" y="[y]" width="400" height="205">
   <div xmlns="http://www.w3.org/1999/xhtml" style="direction:rtl;padding:18px 20px;font-family:Cairo,Arial,sans-serif;box-sizing:border-box;width:100%;height:100%;overflow:hidden">
   <div style="font-size:16px;font-weight:800;color:[headingColor];margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid [border]">[عنوان البطاقة]</div>
   <div style="font-size:13px;color:#334155;line-height:1.65">[محتوى البطاقة - جملتان أو ثلاث جمل]</div>
   </div></foreignObject>
7. ألوان العناوين: بطاقة1=#6d28d9, بطاقة2=#1d4ed8, بطاقة3=#15803d, بطاقة4=#a16207
8. تذييل: <rect x="0" y="545" width="860" height="30" rx="24" fill="#f8f7ff"/>
9. لا تستخدم <text> أو <tspan> لأي محتوى عربي — فقط foreignObject
10. كل foreignObject يجب أن يحتوي على xmlns="http://www.w3.org/1999/xhtml" في div الخارجي
${strict ? "11. إلزامي: يجب أن يحتوي SVG على 4 foreignObject للبطاقات بعناوين ومحتوى مناسب للموضوع." : ""}

أعد كود SVG الكامل فقط. يبدأ بـ <svg ويينتهي بـ </svg>. بدون أي نص أو شرح.`;

      // Ask model to generate SVG with one retry and quality validation
      try {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
          const svgPrompt = makeSvgPrompt(attempt === 2);
          const invokeResult = await invokeClaudeWithFallback(svgPrompt, 3500, `SVG chart generation (try ${attempt})`);
          const rawText = String(invokeResult.text || "");
          const svgMatch = rawText.match(/<svg[\s\S]*?<\/svg>/i);
          if (!svgMatch) continue;
          const generatedSvg = svgMatch[0];
          if (!validateGeneratedSvg(generatedSvg)) continue;

          return res.json({
            preview: {
              title: chartTopic,
              description: `${chartLabel} مولَّد بالذكاء الاصطناعي عن: ${chartTopic}`,
              svg: generatedSvg,
              chartType: effectiveChartType,
              source: "ai-svg",
            },
          });
        }
        throw new Error("Model SVG failed quality validation");
      } catch (chartErr) {
        console.warn("[generate-contextual-content:chart] SVG generation failed, using local fallback:", chartErr.message);
      }

      return res.json({
        preview: createContextualChartPreview({ lessonContext, instruction: chartTopic, chartType: effectiveChartType }),
      });
    }
    // Unified endpoint for the AI generation panel with context-aware prompts
    if (kind === "ai-generate") {
      const genType = req.body.genType || "image"; // image | diagram | infographic
      const topic = String(instruction || lessonContext.title || "").trim().slice(0, 120);

      if (genType === "image") {
        // Build a rich AI image prompt using lesson context
        const contextHint = lessonContext.title
          ? ` in the context of: ${String(lessonContext.title).trim().slice(0, 60)}`
          : "";
        const enrichedInstruction = `${topic}${contextHint}`;
        return res.json({
          items: await getContextualImageCandidates({
            lessonContext,
            instruction: enrichedInstruction,
            source: "ai",
            category: "illustration",
          }),
        });
      }

      if (genType === "diagram" || genType === "infographic") {
        const chartType = genType === "diagram" ? "diagram" : "infographic";
        // Build a context-aware instruction for the chart
        const contextSections = (lessonContext.sections || []).slice(0, 3).map(s => s.heading).filter(Boolean).join("، ");
        const enrichedInstruction = contextSections
          ? `${topic} — يشمل: ${contextSections}`
          : topic;
        return res.json({
          preview: createContextualChartPreview({ lessonContext, instruction: enrichedInstruction, chartType }),
        });
      }

      return res.status(400).json({ error: `Unsupported genType: ${genType}` });
    }

    return res.status(400).json({ error: `Unsupported kind: ${kind}` });
  } catch (err) {
    console.error("[generate-contextual-content] Error:", err.message);
    const normalized = normalizeBedrockError(err, "Contextual generation");
    if (normalized.retryAfterSeconds) {
      res.set("Retry-After", String(normalized.retryAfterSeconds));
    }
    return res.status(normalized.status || 500).json({
      error: normalized.message || err.message,
      code: normalized.code,
      retryAfterSeconds: normalized.retryAfterSeconds,
    });
  }
});

// --- Generate lesson + optional enrichment in one call ---
app.post("/generate-lesson", async (req, res) => {
  const { text, enrich = {} } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: "No text provided" });

  const input = text.slice(0, 6000);

  // Helper to call model with optional fallback model IDs.
  const callClaude = async (prompt, maxTokens = 4096) => {
    const invokeResult = await invokeClaudeWithFallback(prompt, maxTokens, "Lesson generation");
    return invokeResult.text;
  };

  try {
    // 1. Generate lesson
    const lessonPrompt = `أنت مساعد تعليمي متخصص. بناءً على النص العربي التالي، قم بإنشاء مخرجات تعليمية منظمة باللغة العربية.

النص:
"""
${input}
"""

أعد الرد بصيغة JSON فقط بالهيكل التالي:
{
  "lesson": {
    "title": "عنوان الدرس",
    "objectives": ["هدف 1", "هدف 2", "هدف 3"],
    "sections": [
      { "heading": "عنوان القسم", "content": "محتوى القسم..." }
    ],
    "keyTerms": [
      { "term": "المصطلح", "definition": "التعريف" }
    ]
  },
  "summary": "ملخص شامل للنص في فقرة واحدة أو اثنتين",
  "quiz": [
    {
      "question": "نص السؤال؟",
      "options": ["أ) الخيار الأول", "ب) الخيار الثاني", "ج) الخيار الثالث", "د) الخيار الرابع"],
      "answer": "أ) الخيار الأول",
      "explanation": "شرح سبب صحة هذه الإجابة"
    }
  ]
}
تأكد من وجود 5 أسئلة وأن JSON صالح تماماً`;

    const lessonText = await callClaude(lessonPrompt, 6000);
    const lessonMatch = lessonText.match(/\{[\s\S]*\}/);
    if (!lessonMatch) throw new Error("Model did not return valid JSON");

    let result;
    try {
      result = JSON.parse(lessonMatch[0]);
    } catch (parseErr) {
      // JSON truncated - retry with shorter input
      const shortInput = input.slice(0, 3000);
      const retryPrompt = lessonPrompt.replace(input, shortInput);
      const retryText = await callClaude(retryPrompt, 6000);
      const retryMatch = retryText.match(/\{[\s\S]*\}/);
      if (!retryMatch) throw new Error("Model did not return valid JSON");
      result = JSON.parse(retryMatch[0]);
    }

    // 2. Generate visual diagrams if requested - as structured data not SVG
    if (enrich.images) {
      try {
        const title = result.lesson?.title || "";
        const terms = result.lesson?.keyTerms?.slice(0,5).map(t => `${t.term}: ${t.definition}`).join("\n") || "";
        const sections = result.lesson?.sections?.slice(0,4).map(s => `${s.heading}: ${s.content?.slice(0,100)}`).join("\n") || "";

        const diagPrompt = `Based on this Arabic lesson, create 3 educational visual cards as JSON.

Title: ${title}
Key terms: ${terms}
Sections: ${sections}

Return ONLY this JSON array (no markdown):
[
  {
    "title": "عنوان البطاقة الأولى",
    "type": "diagram",
    "color": "#7c3aed",
    "items": ["عنصر 1", "عنصر 2", "عنصر 3", "عنصر 4"],
    "description": "وصف قصير للمفهوم"
  },
  {
    "title": "عنوان البطاقة الثانية", 
    "type": "comparison",
    "color": "#059669",
    "left": {"label": "الجانب الأول", "items": ["نقطة 1", "نقطة 2", "نقطة 3"]},
    "right": {"label": "الجانب الثاني", "items": ["نقطة 1", "نقطة 2", "نقطة 3"]}
  },
  {
    "title": "عنوان البطاقة الثالثة",
    "type": "steps",
    "color": "#0ea5e9",
    "steps": [
      {"num": "1", "text": "الخطوة الأولى"},
      {"num": "2", "text": "الخطوة الثانية"},
      {"num": "3", "text": "الخطوة الثالثة"},
      {"num": "4", "text": "الخطوة الرابعة"}
    ]
  }
]

All content must be in Arabic and directly related to the lesson.`;

        const diagText = await callClaude(diagPrompt, 3000);
        const arrMatch = diagText.match(/\[[\s\S]*\]/);
        if (arrMatch) {
          const cards = JSON.parse(arrMatch[0]);
          if (Array.isArray(cards)) result.imageCards = cards;
        }
      } catch (e) {
        console.error("Diagram generation failed:", e.message);
      }
    }

    // 3. Generate simulation only if requested
    if (enrich.simulation) {
      try {
        const simPrompt = `أنت مصمم تعليمي. أنشئ محاكاة تفاعلية للدرس التالي باللغة العربية.

عنوان الدرس: ${result.lesson?.title}
الملخص: ${result.summary || ""}

أعد JSON فقط بهذا الهيكل:
{
  "scenario": "موقف واقعي يضع الطالب في سياق تطبيقي (جملتان)",
  "role": "دور الطالب",
  "steps": [
    {
      "step": 1, "title": "عنوان", "description": "وصف الموقف",
      "type": "choice", "question": "السؤال",
      "choices": [
        {"id":"a","text":"الخيار أ","correct":true,"feedback":"تغذية راجعة"},
        {"id":"b","text":"الخيار ب","correct":false,"feedback":"تغذية راجعة"},
        {"id":"c","text":"الخيار ج","correct":false,"feedback":"تغذية راجعة"}
      ],
      "hint": "تلميح"
    },
    {
      "step": 2, "title": "عنوان", "description": "وصف",
      "type": "input", "question": "سؤال مفتوح",
      "expectedKeywords": ["كلمة1","كلمة2","كلمة3"],
      "hint": "تلميح"
    },
    {
      "step": 3, "title": "عنوان", "description": "وصف",
      "type": "choice", "question": "السؤال",
      "choices": [
        {"id":"a","text":"الخيار أ","correct":false,"feedback":"تغذية راجعة"},
        {"id":"b","text":"الخيار ب","correct":true,"feedback":"تغذية راجعة"},
        {"id":"c","text":"الخيار ج","correct":false,"feedback":"تغذية راجعة"}
      ],
      "hint": "تلميح"
    }
  ],
  "outcome": "ما تعلمه الطالب"
}`;

        const simText = await callClaude(simPrompt, 3000);
        const simMatch = simText.match(/\{[\s\S]*\}/);
        if (simMatch) {
          let simJson = simMatch[0];
          // Repair truncated JSON by closing any open structures
          try {
            result.simulation = JSON.parse(simJson);
          } catch (_) {
            // Try to close unclosed JSON by truncating at last valid step
            const lastGoodStep = simJson.lastIndexOf('"step"');
            if (lastGoodStep > 0) {
              const truncated = simJson.slice(0, lastGoodStep);
              const trimmed = truncated.replace(/,\s*$/, "");
              try {
                result.simulation = JSON.parse(trimmed + '], "outcome": "راجع الدرس لاستكمال المحاكاة." }');
              } catch (__) {
                console.error("Simulation JSON repair failed, skipping.");
              }
            }
          }
        }
      } catch (e) {
        console.error("Simulation generation failed:", e.message);
      }
    }

    // 4. Add video link if requested
    if (enrich.video) {
      const q = encodeURIComponent(result.lesson?.title || "education");
      result.video = {
        url: `https://www.youtube.com/results?search_query=${q}`,
        searchQuery: result.lesson?.title,
      };
    }

    // 5. Generate concept map only if requested
    if (enrich.conceptMap) {
      try {
      const title = result.lesson?.title || "";
      const keyTerms = result.lesson?.keyTerms?.slice(0, 8) || [];
      const sections = result.lesson?.sections?.slice(0, 4) || [];

      const cmPrompt = `You are an educational SVG concept map creator. Create a concept map SVG for this Arabic lesson.

Title: ${title}
Key concepts: ${keyTerms.map(t => t.term).join(", ")}
Sections: ${sections.map(s => s.heading).join(", ")}

Create ONE SVG concept map with:
- viewBox="0 0 700 420" (no fixed width/height)
- White background
- Central node with lesson title (large, navy #1a237e, rounded rect)
- Branch nodes for each section heading (purple #7c3aed)
- Leaf nodes for key terms (green #059669 or amber #f59e0b)
- Lines/arrows connecting nodes showing relationships
- Arabic text in all nodes
- Clean, readable layout with good spacing

Return ONLY the raw SVG string, no JSON, no markdown:
<svg viewBox="0 0 700 420" ...>...</svg>`;

      const cmText = await callClaude(cmPrompt, 3000);
      // Strip markdown code fences if model wrapped the SVG
      const stripped = cmText.replace(/```[a-z]*\n?/gi, "").trim();
      const svgMatch = stripped.match(/<svg[\s\S]*?<\/svg>/i);
      if (svgMatch) {
        result.conceptMap = svgMatch[0];
      } else {
        // Guarantee concept map availability even when model output is malformed.
        result.conceptMap = createLocalConceptMap(result.lesson);
      }
    } catch (e) {
      console.error("Concept map failed:", e.message);
      // Guaranteed fallback so the frontend never shows an empty map section.
      result.conceptMap = createLocalConceptMap(result.lesson);
    }
    }

    res.json(result);
  } catch (err) {
    const normalized = normalizeBedrockError(err, "Lesson generation");
    if (normalized.code === "DAILY_TOKEN_LIMIT" || normalized.code === "AUTH_ERROR") {
      if (normalized.code === "AUTH_ERROR") {
        console.warn("[generate-lesson] AWS credentials invalid/expired; using local lesson fallback.");
      } else {
        console.warn("Bedrock daily token limit reached; using local lesson fallback.");
      }
      const fallbackResult = buildLocalLesson(input, enrich);
      fallbackResult.fallback = true;
      fallbackResult.fallbackReason = normalized.code === "AUTH_ERROR" ? "credentials" : "quota";
      if (normalized.retryAfterSeconds) {
        fallbackResult.retryAfterSeconds = normalized.retryAfterSeconds;
      }
      return res.status(200).json(fallbackResult);
    }
    // For THROTTLED and other temporary errors, don't use fallback - ask user to retry
    console.error("[generate-lesson] Error:", normalized.code, normalized.message);
    if (normalized.retryAfterSeconds) {
      res.set("Retry-After", String(normalized.retryAfterSeconds));
    }
    res.status(normalized.status).json({
      error: normalized.message,
      code: normalized.code,
      retryAfterSeconds: normalized.retryAfterSeconds,
    });
  }
});

// --- Generate SVG diagrams related to lesson content ---
app.post("/generate-images", async (req, res) => {
  const { title, sections, keyTerms } = req.body;

  const prompt = `You are an educational SVG diagram creator. Based on this Arabic lesson, create 3 simple but informative SVG diagrams that visually explain the lesson content.

Lesson title: ${title}
Key terms: ${keyTerms?.slice(0,5).map(t => t.term).join(", ") || ""}
Sections: ${sections?.slice(0,3).map(s => s.heading).join(", ") || ""}

Create 3 SVG diagrams. Each SVG must:
- Be exactly 500x300 pixels
- Have a white or light background
- Use Arabic text labels where appropriate
- Be visually clear and educational
- Directly illustrate a concept from the lesson
- Use colors: #1a237e (navy), #7c3aed (purple), #059669 (green), #f59e0b (amber)

Return ONLY a JSON array with 3 SVG strings:
["<svg>...</svg>", "<svg>...</svg>", "<svg>...</svg>"]

Make each SVG a complete standalone diagram with shapes, arrows, labels that explain the lesson visually.`;

  try {
    const invokeResult = await invokeClaudeWithFallback(prompt, 8000, "Image generation");
    const content = invokeResult.text;

    // Extract JSON array of SVGs
    const arrMatch = content.match(/\[[\s\S]*\]/);
    if (!arrMatch) throw new Error("No SVG array found");

    const svgs = JSON.parse(arrMatch[0]);
    // Convert SVGs to data URLs
    // Return SVGs as raw strings for direct rendering
    res.json({ images: svgs, type: "svg" });
  } catch (err) {
    console.error("generate-images error:", err.message);
    const normalized = normalizeBedrockError(err, "Image generation");
    if (normalized.retryAfterSeconds) {
      res.set("Retry-After", String(normalized.retryAfterSeconds));
    }
    res.status(normalized.status).json({
      error: normalized.message,
      code: normalized.code,
      retryAfterSeconds: normalized.retryAfterSeconds,
    });
  }
});

// --- Generate rich interactive simulation ---
app.post("/generate-simulation", async (req, res) => {
  const { title, summary, sections } = req.body;
  if (!title) return res.status(400).json({ error: "No title provided" });

  const prompt = `أنت مصمم تعليمي خبير. بناءً على الدرس التالي، أنشئ محاكاة تفاعلية تعليمية غنية باللغة العربية تتطلب من الطالب اتخاذ قرارات حقيقية.

عنوان الدرس: ${title}
الملخص: ${summary || ""}
الأقسام: ${sections?.map(s => s.heading).join("، ") || ""}

أعد الرد بصيغة JSON فقط:
{
  "scenario": "وصف موقف واقعي يضع الطالب في سياق تطبيقي مباشر (2-3 جمل)",
  "role": "دور الطالب في هذه المحاكاة",
  "steps": [
    {
      "step": 1,
      "title": "عنوان الخطوة",
      "description": "شرح الموقف التفاعلي",
      "type": "choice",
      "question": "سؤال يطرحه على الطالب",
      "choices": [
        { "id": "a", "text": "الخيار الأول", "correct": true, "feedback": "تغذية راجعة لهذا الخيار" },
        { "id": "b", "text": "الخيار الثاني", "correct": false, "feedback": "تغذية راجعة لهذا الخيار" },
        { "id": "c", "text": "الخيار الثالث", "correct": false, "feedback": "تغذية راجعة لهذا الخيار" }
      ],
      "hint": "تلميح للطالب"
    },
    {
      "step": 2,
      "title": "عنوان الخطوة",
      "description": "شرح الموقف",
      "type": "input",
      "question": "سؤال يتطلب إجابة مكتوبة من الطالب",
      "expectedKeywords": ["كلمة1", "كلمة2", "كلمة3"],
      "hint": "تلميح"
    },
    {
      "step": 3,
      "title": "عنوان الخطوة",
      "description": "شرح الموقف",
      "type": "choice",
      "question": "سؤال قرار",
      "choices": [
        { "id": "a", "text": "الخيار الأول", "correct": false, "feedback": "تغذية راجعة" },
        { "id": "b", "text": "الخيار الثاني", "correct": true, "feedback": "تغذية راجعة" },
        { "id": "c", "text": "الخيار الثالث", "correct": false, "feedback": "تغذية راجعة" }
      ],
      "hint": "تلميح"
    },
    {
      "step": 4,
      "title": "التطبيق النهائي",
      "description": "الموقف الختامي",
      "type": "choice",
      "question": "السؤال الختامي",
      "choices": [
        { "id": "a", "text": "الخيار الأول", "correct": true, "feedback": "تغذية راجعة" },
        { "id": "b", "text": "الخيار الثاني", "correct": false, "feedback": "تغذية راجعة" },
        { "id": "c", "text": "الخيار الثالث", "correct": false, "feedback": "تغذية راجعة" }
      ],
      "hint": "تلميح"
    }
  ],
  "outcome": "ما تعلمه الطالب من هذه المحاكاة"
}`;

  try {
    const invokeResult = await invokeClaudeWithFallback(prompt, 3000, "Simulation generation");
    const content = invokeResult.text;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Invalid response");
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error(err);
    const normalized = normalizeBedrockError(err, "Simulation generation");
    if (normalized.retryAfterSeconds) {
      res.set("Retry-After", String(normalized.retryAfterSeconds));
    }
    res.status(normalized.status).json({
      error: normalized.message,
      code: normalized.code,
      retryAfterSeconds: normalized.retryAfterSeconds,
    });
  }
});

// ── TTS endpoint using AWS Polly ─────────────────────────────────────────
app.post("/api/tts", async (req, res) => {
  const { text, voice } = req.body;
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return res.status(400).json({ error: "text is required" });
  }
  // Limit text length for safety
  const safeText = text.slice(0, 3000);
  const voiceId = voice || "Hala"; // Hala/Zayd = Neural Arabic, Zeina = Standard Arabic
  try {
    const cmd = new SynthesizeSpeechCommand({
      Text: safeText,
      OutputFormat: "mp3",
      VoiceId: voiceId,
      LanguageCode: "arb",
      Engine: ["Hala", "Zayd"].includes(voiceId) ? "neural" : "standard",
    });
    const data = await polly.send(cmd);
    // data.AudioStream is a readable stream
    res.set("Content-Type", "audio/mpeg");
    // Collect stream into buffer
    const chunks = [];
    for await (const chunk of data.AudioStream) {
      chunks.push(chunk);
    }
    res.send(Buffer.concat(chunks));
  } catch (err) {
    console.error("Polly TTS error:", err);
    res.status(500).json({ error: err.message || "TTS failed" });
  }
});

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found", path: req.path });
});

// --- Global error handler ---
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "An unexpected error occurred";
  res.status(status).json({ 
    error: message,
    code: err.code,
    retryAfterSeconds: err.retryAfterSeconds
  });
});

app.listen(PORT, async () => {
  await initDb();
  console.log(`Backend running on http://localhost:${PORT}`);
});
