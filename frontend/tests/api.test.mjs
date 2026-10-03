import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const compiled = ts.transpileModule(
  fs.readFileSync(path.join(import.meta.dirname, "../src/lib/api.ts"), "utf8"),
  {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText;
function client(fetch) {
  const scope = { exports: {}, fetch };
  vm.runInNewContext(compiled, scope);
  return scope.exports;
}
const reply = (body, status = 200) => ({
  status,
  ok: status < 400,
  json: async () => body,
});

test("preserves endpoint, POST payload, cookies and successful envelope", async () => {
  let request;
  const api = client(async (...args) => {
    request = args;
    return reply({ success: true, data: { id: "existing-id" } });
  });
  const body = JSON.stringify({
    problemId: "existing-id",
    sourceCode: "print(10)",
  });
  assert.deepEqual(
    await api.apiRequest("/api/v1/submissions", { method: "POST", body }),
    { id: "existing-id" },
  );
  assert.equal(request[0], "/api/v1/submissions");
  assert.equal(request[1].body, body);
  assert.equal(request[1].method, "POST");
  assert.equal(request[1].credentials, "include");
  assert.equal(request[1].headers["Content-Type"], "application/json");
});

for (const [status, code] of [
  [401, "UNAUTHORIZED"],
  [403, "FORBIDDEN"],
  [404, "NOT_FOUND"],
  [409, "CONFLICT"],
  [429, "TOO_MANY_REQUESTS"],
  [500, "INTERNAL_ERROR"],
  [503, "SERVICE_UNAVAILABLE"],
]) {
  test(`localizes ${code} while preserving status and error code`, async () => {
    const api = client(async () =>
      reply(
        {
          success: false,
          error: { code, message: "Private implementation exception" },
        },
        status,
      ),
    );
    await assert.rejects(
      api.apiRequest("/api/v1/me"),
      (error) =>
        error instanceof api.ApiRequestError &&
        error.status === status &&
        error.code === code &&
        /[\u0e00-\u0e7f]/.test(error.message) &&
        !error.message.includes("Private implementation"),
    );
  });
}

test("maps actual backend string[] validation details to fields", async () => {
  const api = client(async () =>
    reply(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: [
            "title should not be empty",
            "timeLimitMs must be an integer number",
          ],
        },
      },
      400,
    ),
  );
  try {
    await api.apiRequest("/api/v1/problems");
    assert.fail("expected validation failure");
  } catch (error) {
    const fields = api.validationFields(error);
    assert.match(fields.title, /ชื่อโจทย์/);
    assert.match(fields.timeLimitMs, /เวลาประมวลผล/);
    assert.equal(Object.keys(fields).length, 2);
  }
});

test("uses Thai field messages and only a request id supplied by the server", async () => {
  const api = client(async () =>
    reply(
      {
        success: false,
        requestId: "actual-request-id",
        error: {
          code: "VALIDATION_ERROR",
          message: "ข้อมูลไม่ถูกต้อง",
          details: [{ field: "expectedOutput", message: "กรุณากรอกผลลัพธ์" }],
        },
      },
      422,
    ),
  );
  await assert.rejects(
    api.apiRequest("/api/v1/test-cases"),
    (error) =>
      api.validationFields(error).expectedOutput === "กรุณากรอกผลลัพธ์" &&
      error.requestId === "actual-request-id",
  );
});

test("distinguishes connection failures from authentication failures", async () => {
  const api = client(async () => {
    throw new Error("connection refused");
  });
  await assert.rejects(
    api.apiRequest("/api/v1/me"),
    (error) =>
      error.status === 0 &&
      error.code === "NETWORK_ERROR" &&
      !error.message.includes("เข้าสู่ระบบ"),
  );
});
