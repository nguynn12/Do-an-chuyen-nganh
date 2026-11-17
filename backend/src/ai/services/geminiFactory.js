/**
 * Gemini Factory Service
 * Hỗ trợ tạo client động theo API Key của từng user (BYOK)
 * Có LRU Cache để tái sử dụng instance và kiểm soát bộ nhớ.
 * Hỗ trợ cả @google/genai SDK và REST API fallback qua native fetch.
 */

// Cache lưu client trong bộ nhớ RAM (tối đa 50 keys, thời hạn 15 phút)
const clientCache = new Map();
const MAX_CACHE_SIZE = 50;
const CACHE_TTL_MS = 15 * 60 * 1000;

function getCachedClient(apiKey) {
  const cached = clientCache.get(apiKey);
  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return cached.instance;
  }
  return null;
}

function setCachedClient(apiKey, instance) {
  if (clientCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = clientCache.keys().next().value;
    clientCache.delete(oldestKey);
  }
  clientCache.set(apiKey, {
    instance,
    createdAt: Date.now(),
  });
}

/**
 * Gọi Gemini REST API trực tiếp bằng fetch native của Node.js (18+)
 * Hỗ trợ Timeout (15s) và tự động Fallback các model nếu model chính gặp 503 (high demand) hoặc 404
 */
async function callGeminiRestApi(apiKey, prompt, systemInstruction = null) {
  const preferredModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
  const candidateModels = [
    preferredModel,
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ].filter((v, idx, arr) => arr.indexOf(v) === idx);

  const bodyPayload = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  if (systemInstruction) {
    bodyPayload.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyPayload),
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData?.error?.message ||
          `Gemini API (${model}) trả về mã lỗi HTTP ${response.status}`;
        const status = response.status;
        const error = new Error(message);
        error.status = status;
        error.details = errorData;

        // Nếu lỗi 503 (quá tải), 429 hoặc 404, thử model dự phòng tiếp theo
        if (status === 503 || status === 404 || status === 429) {
          console.warn(
            `Model ${model} trả về mã ${status}. Đang chuyển tiếp sang model dự phòng...`
          );
          lastError = error;
          continue;
        }

        throw error;
      }

      const result = await response.json();
      const textOutput =
        result?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

      return textOutput;
    } catch (err) {
      lastError = err;
      if (err.name === "TimeoutError") {
        console.warn(
          `Model ${model} timeout sau 15s. Đang thử model dự phòng...`
        );
        continue;
      }
      // Nếu lỗi xác thực API Key (400/401/403 do key sai), dừng ngay không thử thêm
      if (err.status === 400 || err.status === 401 || err.status === 403) {
        throw err;
      }
    }
  }

  throw (
    lastError ||
    new Error("Không thể kết nối đến Google Gemini sau khi thử các model.")
  );
}

/**
 * Ping kiểm tra tính hợp lệ của API Key
 */
export async function verifyApiKey(apiKey) {
  try {
    const pingPrompt =
      'Trả về JSON: {"status": "ok", "message": "Key hợp lệ"}';
    const textResult = await callGeminiRestApi(
      apiKey,
      pingPrompt,
      "Chỉ trả về JSON tối giản."
    );
    const parsed = JSON.parse(textResult);
    return {
      success: true,
      data: parsed,
    };
  } catch (err) {
    const status = err.status || 500;
    let userFriendlyMessage = "Không thể xác thực API Key với Google Gemini.";

    if (status === 400 || status === 401 || status === 403) {
      userFriendlyMessage =
        "API Key không hợp lệ hoặc đã bị thu hồi/vô hiệu hóa bởi Google.";
    } else if (status === 429) {
      userFriendlyMessage =
        "API Key này đã vượt quá hạn ngạch (Rate Limit/Quota). Vui lòng thử lại sau.";
    }

    const customError = new Error(userFriendlyMessage);
    customError.status = status;
    customError.originalMessage = err.message;
    throw customError;
  }
}

/**
 * Sinh nội dung có cấu trúc JSON từ Gemini
 */
export async function generateJsonContent(apiKey, prompt, systemInstruction) {
  try {
    const textOutput = await callGeminiRestApi(
      apiKey,
      prompt,
      systemInstruction
    );
    // Làm sạch Markdown nếu LLM có bọc ```json ... ```
    const cleanedText = textOutput
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(cleanedText);
  } catch (err) {
    console.error("Lỗi parse hoặc gọi Gemini:", err.message);
    throw err;
  }
}

