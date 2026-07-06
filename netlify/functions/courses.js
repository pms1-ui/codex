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

exports.handler = async () => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
  },
  body: JSON.stringify({ courses: COURSES }),
});
