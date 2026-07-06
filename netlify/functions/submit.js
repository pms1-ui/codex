const BASEROW_TOKEN = process.env.BASEROW_DATABASE_TOKEN || "TYqIXBawAasC76A15DSQlmR1efHHEyLJ";
const BASEROW_CREATE_ROW_URL =
  "https://baserow.childylab.com/api/database/rows/table/2136/?user_field_names=true";

const COURSES = [
  {
    id: "5",
    title: "Gemini&NotebookLM: 커스텀 에이전트와 지식 자산화 실무",
  },
  {
    id: "6",
    title: "ChatGPT 실무 자동화: 데이터 분석 및 업무 지능화",
  },
  {
    id: "12",
    title: "Claude 업무 자동화: 문서분석 및 노코드 제작",
  },
  {
    id: "13",
    title: "클로드 프로젝트와 MCP 활용 업무 자동화 완성",
  },
  {
    id: "28",
    title: "NotebookLM 활용 사내 매뉴얼 지식 베이스 구축 실무",
  },
];

function json(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(payload),
  };
}

function formatCourse(course) {
  return `[${course.id}] ${course.title}`;
}

function buildCourseFields(courses) {
  return courses.slice(0, 5).reduce((fields, course, index) => {
    fields[`희망과정_${index + 1}`] = formatCourse(course);
    return fields;
  }, {});
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, message: "Method not allowed" });
  }

  try {
    const data = JSON.parse(event.body || "{}");
    const name = String(data.name || "").trim();
    const courseIds = Array.isArray(data.courseIds)
      ? data.courseIds.map((id) => String(id).trim()).filter(Boolean)
      : [];
    const courses = courseIds
      .map((courseId) => COURSES.find((course) => course.id === courseId))
      .filter(Boolean);

    if (!name) {
      return json(400, { ok: false, message: "이름을 입력해주세요." });
    }

    if (!courses.length) {
      return json(400, { ok: false, message: "수강 희망 과정을 하나 이상 선택해주세요." });
    }

    const baserowResponse = await fetch(BASEROW_CREATE_ROW_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${BASEROW_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        이름: name,
        ...buildCourseFields(courses),
      }),
    });
    const text = await baserowResponse.text();
    const payload = text ? JSON.parse(text) : {};

    if (!baserowResponse.ok) {
      return json(baserowResponse.status, {
        ok: false,
        message: payload.detail || payload.error || "Baserow 제출에 실패했습니다.",
      });
    }

    return json(200, { ok: true, result: payload });
  } catch (error) {
    return json(500, {
      ok: false,
      message: error.message || "제출 중 오류가 발생했습니다.",
    });
  }
};
