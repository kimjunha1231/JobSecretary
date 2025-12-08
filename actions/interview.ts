'use server'

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

export async function generateInterviewQuestions(content: string): Promise<string[]> {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash-lite",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const prompt = `
    너는 20년 경력의 대기업 인사담당자이자 면접관이야.
    아래 [자기소개서] 내용을 바탕으로, 실제 면접에서 나올 법한 날카롭고 핵심적인 예상 면접 질문 5~7개를 뽑아줘.

    **[질문 생성 규칙]**
    1. **직무 적합성:** 지원 직무와 관련된 역량을 검증하는 질문을 포함할 것.
    2. **경험 검증:** 자기소개서에 언급된 프로젝트나 경험에 대해 구체적인 상황, 행동, 결과를 묻는 질문을 포함할 것.
    3. **인성/가치관:** 지원자의 가치관이나 조직 적합성을 판단할 수 있는 질문을 포함할 것.
    4. **압박 질문:** 필요하다면 논리적 허점이나 약점을 파고드는 질문도 1~2개 포함할 것.
    5. **출력 형식:** 오직 JSON 문자열 배열로만 출력할 것.

    **[JSON 형식]**
    ["질문 1", "질문 2", "질문 3", ...]

    **[자기소개서]**
    ${content}
  `;

    try {
        const result = await model.generateContent({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
        });
        const responseText = result.response.text();

        // JSON 파싱 (마크다운 기호 제거)
        const cleanedText = responseText.replace(/```json|```/g, "").trim();

        return JSON.parse(cleanedText) as string[];
    } catch (error) {
        console.error("Interview Question Generation Error:", error);
        return [];
    }
}
