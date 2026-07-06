const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const PORT = Number(process.env.PORT || 5173);
const BASEROW_MCP_URL =
  process.env.BASEROW_MCP_URL ||
  "https://baserow.childylab.com/mcp/Gk5vAICYKftvgvJN6NynQDvnboI8wOUp/sse";

const COURSES = [
  {
    id: "5",
    title: "Gemini&NotebookLM: 커스텀 에이전트와 지식 자산화 실무",
    category: "생성형 AI 활용 자동화",
    hours: 8,
    days: 1,
  },
  {
    id: "6",
    title: "ChatGPT 실무 자동화: 데이터 분석 및 업무 지능화",
    category: "생성형 AI 활용 자동화",
    hours: 8,
    days: 1,
  },
  {
    id: "12",
    title: "Claude 업무 자동화: 문서분석 및 노코드 제작",
    category: "생성형 AI 활용 자동화",
    hours: 8,
    days: 1,
  },
  {
    id: "13",
    title: "클로드 프로젝트와 MCP 활용 업무 자동화 완성",
    category: "생성형 AI 활용 자동화",
    hours: 8,
    days: 1,
  },
  {
    id: "28",
    title: "NotebookLM 활용 사내 매뉴얼 지식 베이스 구축 실무",
    category: "생성형 AI 활용 자동화",
    hours: 8,
    days: 1,
  },
];

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
};

const STATIC_FILES = new Set(["/index.html", "/app.js", "/styles.css"]);

class McpClient {
  constructor(url) {
    this.url = url;
    this.nextId = 1;
    this.pending = new Map();
    this.buffer = "";
    this.ready = false;
    this.startPromise = null;
  }

  async ensureStarted() {
    if (this.ready) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = new Promise((resolve, reject) => {
      this.process = spawn("npx", ["--yes", "mcp-remote", this.url], {
        stdio: ["pipe", "pipe", "pipe"],
      });

      const failTimer = setTimeout(() => {
        reject(new Error("Baserow MCP 연결 시간이 초과되었습니다."));
      }, 20000);

      this.process.stdout.on("data", (chunk) => this.handleStdout(chunk));
      this.process.stderr.on("data", (chunk) => {
        const text = chunk.toString();
        if (text.includes("Proxy established successfully")) {
          this.initialize()
            .then(() => {
              clearTimeout(failTimer);
              this.ready = true;
              resolve();
            })
            .catch((error) => {
              clearTimeout(failTimer);
              reject(error);
            });
        }
      });

      this.process.on("error", (error) => {
        clearTimeout(failTimer);
        reject(error);
      });

      this.process.on("exit", () => {
        this.ready = false;
        this.startPromise = null;
        for (const { reject: rejectPending } of this.pending.values()) {
          rejectPending(new Error("Baserow MCP 프로세스가 종료되었습니다."));
        }
        this.pending.clear();
      });
    });

    return this.startPromise;
  }

  handleStdout(chunk) {
    this.buffer += chunk.toString();
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let message;
      try {
        message = JSON.parse(line);
      } catch {
        continue;
      }

      if (!message.id || !this.pending.has(message.id)) continue;
      const { resolve, reject, timer } = this.pending.get(message.id);
      clearTimeout(timer);
      this.pending.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message || "MCP 요청 실패"));
      } else {
        resolve(message.result);
      }
    }
  }

  send(method, params = {}) {
    const id = this.nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`MCP 요청 시간이 초과되었습니다: ${method}`));
      }, 20000);

      this.pending.set(id, { resolve, reject, timer });
      this.process.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  }

  notify(method, params = {}) {
    const payload = { jsonrpc: "2.0", method, params };
    this.process.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  async initialize() {
    await this.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "training-survey-form", version: "1.0.0" },
    });
    this.notify("notifications/initialized");
  }

  async createSurveyRow(row) {
    await this.ensureStarted();
    const result = await this.send("tools/call", {
      name: "create_row_table_2136",
      arguments: { row },
    });

    if (result?.isError) {
      const detail = result.content?.map((item) => item.text).filter(Boolean).join("\n");
      throw new Error(detail || "Baserow 행 생성에 실패했습니다.");
    }

    return result;
  }
}

const mcp = new McpClient(BASEROW_MCP_URL);

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 100_000) {
        reject(new Error("요청 본문이 너무 큽니다."));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function buildNote({ courses, memo }) {
  const lines = [
    `선택 과정 수: ${courses.length}`,
    "선택 과정:",
    ...courses.map(
      (course, index) =>
        `${index + 1}. [${course.id}] ${course.title} / ${course.category} / ${course.hours}H / ${course.days}일`,
    ),
  ];

  if (memo) lines.push(`비고: ${memo}`);
  lines.push(`제출일시: ${new Date().toISOString()}`);
  return lines.join("\n");
}

async function handleSubmit(req, res) {
  try {
    const raw = await readBody(req);
    const data = JSON.parse(raw || "{}");
    const name = String(data.name || "").trim();
    const courseIds = Array.isArray(data.courseIds)
      ? data.courseIds.map((id) => String(id).trim()).filter(Boolean)
      : [String(data.courseId || "").trim()].filter(Boolean);
    const memo = String(data.memo || "").trim();
    const courses = courseIds
      .map((courseId) => COURSES.find((item) => item.id === courseId))
      .filter(Boolean);

    if (!name) {
      return sendJson(res, 400, { ok: false, message: "이름을 입력해주세요." });
    }

    if (!courses.length) {
      return sendJson(res, 400, { ok: false, message: "수강 희망 과정을 하나 이상 선택해주세요." });
    }

    const result = await mcp.createSurveyRow({
      이름: name,
      노트: buildNote({ courses, memo }),
      활성: true,
    });

    sendJson(res, 200, { ok: true, result });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      message: error.message || "제출 중 오류가 발생했습니다.",
    });
  }
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;

  if (!STATIC_FILES.has(requestedPath)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const filePath = path.normalize(path.join(__dirname, requestedPath));

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath)] || "application/octet-stream",
    });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url.startsWith("/api/courses")) {
    return sendJson(res, 200, { courses: COURSES });
  }

  if (req.method === "POST" && req.url.startsWith("/api/submit")) {
    return handleSubmit(req, res);
  }

  if (req.method === "GET") {
    return serveStatic(req, res);
  }

  res.writeHead(405);
  res.end("Method not allowed");
});

server.listen(PORT, () => {
  console.log(`조사 폼 서버가 실행되었습니다: http://localhost:${PORT}`);
});
