export function buildLessonContextPayload(lessonContext = {}, blocks = []) {
  return {
    title: lessonContext.title || "",
    summary: lessonContext.summary || "",
    sections: (lessonContext.sections || []).slice(0, 6).map((section) => ({
      heading: section.heading || "",
      content: section.content || "",
    })),
    keyTerms: (lessonContext.keyTerms || []).slice(0, 8),
    objectives: (lessonContext.objectives || []).slice(0, 6),
    selectedText: lessonContext.selectedText || "",
    blocks: (blocks || []).slice(-6).map((block) => ({
      type: block.type,
      title: block.title || block.caption || "",
      content: block.content || block.caption || "",
    })),
  };
}

async function requestJsonWithFallback({ path, method = "GET", body }) {
  const localBase = (import.meta.env.VITE_CONTEXT_API_FALLBACK || "http://localhost:4000").replace(/\/$/, "");
  const targets = [path, `${localBase}${path}`];
  let lastError = null;

  for (const target of targets) {
    try {
      console.log("[contextualGeneration] Request", { target, method, path, body });
      const response = await fetch(target, {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {}),
      });

      const data = await response.json().catch(() => ({}));
      console.log("[contextualGeneration] Response", { target, status: response.status, ok: response.ok, data });

      // If endpoint is missing on proxied server, try local fallback.
      if (!response.ok && response.status === 404) {
        lastError = new Error("endpoint_not_found");
        continue;
      }

      if (!response.ok) {
        throw new Error(data.error || `فشل الطلب (${response.status})`);
      }

      return data;
    } catch (error) {
      console.error("[contextualGeneration] Request failed", { target, error: error.message });
      lastError = error;
      // Try next target.
    }
  }

  throw lastError || new Error("تعذر الاتصال بخدمة التوليد السياقي");
}

export async function requestContextualGeneration(payload) {
  return requestJsonWithFallback({
    path: "/generate-contextual-content",
    method: "POST",
    body: payload,
  });
}

export async function requestMediaProviderStatus() {
  return requestJsonWithFallback({ path: "/media-provider-status" });
}

export function toEmbedUrl(url) {
  if (!url) return "";
  if (url.includes("youtube.com/watch")) return url.replace("watch?v=", "embed/");
  if (url.includes("youtu.be/")) return url.replace("youtu.be/", "youtube.com/embed/");
  return url;
}

export function blockTitle(block) {
  if (block.type === "text") return "نص مضاف";
  if (block.type === "image") return block.caption || "صورة مضافة";
  if (block.type === "video") return block.caption || "فيديو مضاف";
  if (block.type === "chart") return block.title || "مخطط مضاف";
  if (block.type === "quiz") return "اختبار مضاف";
  return block.title || block.content || block.type;
}
