'use server'

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

// 교정 결과 타입 정의
export interface RefineResult {
  original: string;
  corrected: string;
  changes: string[]; // 무엇이 바뀌었는지 요약 (예: "맞춤법 수정", "표현 다듬기")
}

export async function refineText(text: string): Promise<RefineResult | null> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash-lite",
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const prompt = `
    너는 20년 경력의 대기업 인사담당자이자 자기소개서 첨삭 전문가야.
    아래 [원문]을 읽고 맞춤법, 띄어쓰기, 그리고 문맥의 어조(Tone)를 다듬어서 [교정문]을 만들어줘.

    **[교정 규칙]**
    1. **맞춤법/띄어쓰기:** 완벽하게 수정할 것.
    2. **어조(Tone):** '해요'체 보다는 '합니다/했습니다' 같은 정중하고 확신에 찬 어조로 변경할 것.
    3. **가독성:** 문장이 너무 길어지면 적절히 끊거나 연결어미를 자연스럽게 고칠 것.
    4. **왜곡 금지:** 원문의 사실관계(팩트)를 절대 추가하거나 삭제하지 말 것. 의미만 강화할 것.
    5. **출력 형식:** 오직 JSON으로만 출력할 것.

    **[JSON 형식]**
    {
      "original": "원문 그대로",
      "corrected": "교정된 전체 텍스트",
      "changes": ["수정된 포인트 1", "수정된 포인트 2"]
    }

    **[원문]**
    ${text}
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });
    const responseText = result.response.text();

    // JSON 파싱 (마크다운 기호 제거 및 백슬래시 처리)
    let cleanedText = responseText.replace(/```json|```/g, "").trim();

    // 백슬래시가 하나만 있는 경우 이스케이프 처리 (JSON 파싱 에러 방지)
    // 예: "팀\원" -> "팀\\원"
    // 단, 이미 이스케이프된 경우(\\)나 유효한 이스케이프 시퀀스(\n, \t, \", \\)는 건드리지 않아야 함.
    // 하지만 정규식으로 완벽하게 처리하기 어려우므로, 가장 흔한 케이스인 "한글\한글" 패턴만 처리 시도
    cleanedText = cleanedText.replace(/([가-힣])\\([가-힣])/g, "$1\\\\$2");

    return JSON.parse(cleanedText) as RefineResult;
  } catch (error) {
    console.error("Refine Error:", error);
    return null;
  }
}
