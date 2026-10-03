interface ApiEnvelope<T> {
  data: T;
  success: boolean;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

/** Read existing validation details without changing the API contract. */
export function validationFields(error: unknown): Record<string, string> {
  if (!(error instanceof ApiRequestError) || error.code !== "VALIDATION_ERROR")
    return {};
  const fields: Record<string, string> = {};
  const labels: Record<string, string> = {
    title: "ชื่อโจทย์",
    description: "รายละเอียดโจทย์",
    timeLimitMs: "เวลาประมวลผลสูงสุด",
    expectedOutput: "ผลลัพธ์ที่ถูกต้อง",
    inputData: "ข้อมูลนำเข้า",
    isActive: "สถานะการใช้งาน",
    isHidden: "สถานะการซ่อนชุดทดสอบ",
  };
  for (const detail of Array.isArray(error.details)
    ? error.details
    : error.details
      ? [error.details]
      : []) {
    const field =
      typeof detail === "string"
        ? Object.keys(labels).find((key) => detail.startsWith(`${key} `))
        : detail &&
            typeof detail === "object" &&
            "field" in detail &&
            typeof detail.field === "string"
          ? detail.field
          : undefined;
    if (!field || !labels[field]) continue;
    const message =
      detail &&
      typeof detail === "object" &&
      "message" in detail &&
      typeof detail.message === "string" &&
      /[\u0E00-\u0E7F]/.test(detail.message)
        ? detail.message
        : `กรุณาตรวจสอบ${labels[field]}ให้ถูกต้อง`;
    fields[field] = message;
  }
  return fields;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      credentials: "include",
      headers: {
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiRequestError(
      "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง",
      0,
      "NETWORK_ERROR",
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiRequestError(
      `เซิร์ฟเวอร์ตอบกลับไม่ถูกต้อง (HTTP ${response.status})`,
      response.status,
    );
  }

  if (!response.ok) {
    const error =
      payload && typeof payload === "object" && "error" in payload
        ? payload.error
        : payload;
    const message =
      error && typeof error === "object" && "message" in error
        ? typeof error.message === "string"
          ? error.message
          : Array.isArray(error.message)
            ? error.message
                .filter((item) => typeof item === "string")
                .join("; ")
            : ""
        : "";
    const code =
      error &&
      typeof error === "object" &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : undefined;
    const messages: Record<number, string> = {
      400: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง",
      401: "กรุณาเข้าสู่ระบบด้วยบัญชี Core Hub เพื่อใช้งาน",
      403: "คุณไม่มีสิทธิ์เข้าถึงส่วนนี้ หากคิดว่าเป็นข้อผิดพลาด กรุณาติดต่อผู้ดูแลระบบย่อยนี้",
      404: "ไม่พบข้อมูลที่คุณกำลังค้นหา อาจถูกลบไปแล้วหรือลิงก์ไม่ถูกต้อง",
      409: "ข้อมูลหรือสถานะเปลี่ยนแปลงแล้ว กรุณารีเฟรชและลองใหม่",
      422: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบข้อมูลที่กรอกแล้วลองอีกครั้ง",
      429: "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      503: "บริการไม่พร้อมใช้งานชั่วคราว กรุณารอสักครู่แล้วลองอีกครั้ง",
    };
    const requestId =
      payload &&
      typeof payload === "object" &&
      "requestId" in payload &&
      typeof payload.requestId === "string"
        ? payload.requestId
        : undefined;
    const safeMessage = /[\u0E00-\u0E7F]/.test(message)
      ? message
      : (messages[response.status] ??
        "ระบบขัดข้องชั่วคราว กรุณาลองอีกครั้ง หากยังพบปัญหา กรุณาแจ้งผู้ดูแลระบบ");
    throw new ApiRequestError(
      safeMessage + (requestId ? ` · รหัสอ้างอิง: ${requestId}` : ""),
      response.status,
      code,
      error && typeof error === "object" && "details" in error
        ? error.details
        : undefined,
      requestId,
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("success" in payload) ||
    !("data" in payload)
  ) {
    throw new ApiRequestError(
      "รูปแบบข้อมูลตอบกลับจากเซิร์ฟเวอร์ไม่ถูกต้อง",
      response.status,
    );
  }
  return (payload as ApiEnvelope<T>).data;
}
