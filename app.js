const DEFAULT_COURSES = [
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

const form = document.querySelector("#survey-form");
const courseList = document.querySelector("#course-list");
const message = document.querySelector("#form-message");
const submitButton = document.querySelector("#submit-button");

function setMessage(text, type = "") {
  message.textContent = text;
  message.dataset.type = type;
}

function renderCourses(courses) {
  courseList.innerHTML = courses
    .map(
      (course) => `
        <label class="course-option">
          <input type="checkbox" name="courseIds" value="${course.id}" />
          <span class="course-copy">
            <strong>${course.title}</strong>
            <span>과정번호 ${course.id} · ${course.hours}H · ${course.days}일</span>
          </span>
        </label>
      `,
    )
    .join("");
}

async function loadCourses() {
  try {
    const response = await fetch("/api/courses");
    if (!response.ok) throw new Error("API unavailable");
    const data = await response.json();
    renderCourses(data.courses);
  } catch {
    renderCourses(DEFAULT_COURSES);
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setMessage("");
  submitButton.disabled = true;
  submitButton.textContent = "제출 중...";

  const formData = new FormData(form);
  const payload = {
    name: formData.get("name"),
    courseIds: formData.getAll("courseIds"),
  };

  try {
    if (!payload.courseIds.length) {
      throw new Error("수강 희망 과정을 하나 이상 선택해주세요.");
    }

    const response = await fetch("/api/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();

    if (!response.ok || !data.ok) {
      throw new Error(data.message || "제출에 실패했습니다.");
    }

    form.reset();
    setMessage("접수되었습니다. Baserow 테이블에 반영됐습니다.", "success");
  } catch (error) {
    setMessage(
      error.message || "제출 API가 실행 중이 아닙니다. 서버에서 npm start로 실행한 주소에서 제출해주세요.",
      "error",
    );
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "제출하기";
  }
});

loadCourses();
