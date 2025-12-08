'use server';

import { GoogleGenAI } from "@google/genai";
import { Document } from '../types';

const getClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInsight = async (
  query: string,
  documents: Document[]
): Promise<{ text: string; relatedDocIds: string[] }> => {
  const ai = getClient();

  // Construct a context-rich prompt using all available documents (RAG-lite)
  const contextData = documents.map(doc => `
    ---
    ID: ${doc.id}
    Company: ${doc.company}
    Role: ${doc.role}
    Date: ${doc.createdAt}
    Content: ${doc.content}
    ---
  `).join('\n');

  const systemInstruction = `
    You are a helpful career assistant. You have access to the user's past cover letters.
    
    Your goal is to help the user write better cover letters by providing insights from their past work.
    
    When answering:
    1. **ALWAYS respond in Korean.**
    2. Use the provided context to answer the user's question.
    3. If you reference a specific cover letter from the context, you MUST format it as a link: [Title](/document/ID). For example: [Samsung Software Engineer](/document/123).
    4. Be concise and encouraging.

    Output Format:
    You MUST return a JSON object with the following structure:
    {
      "text": "Your helpful response here (in Markdown)",
      "relatedDocIds": ["id1", "id2"] // List of IDs of the documents you referenced or found relevant
    }
    
    Here is the context (past cover letters):
    ${contextData}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
        responseMimeType: 'application/json',
      }
    });

    const responseText = response.text;
    if (!responseText) {
      return { text: "데이터를 기반으로 응답을 생성할 수 없습니다.", relatedDocIds: [] };
    }

    try {
      const parsed = JSON.parse(responseText);
      return {
        text: parsed.text || responseText,
        relatedDocIds: parsed.relatedDocIds || []
      };
    } catch (e) {
      console.error("Failed to parse JSON response:", e);
      // Fallback if JSON parsing fails but we have text
      return { text: responseText, relatedDocIds: [] };
    }
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    return {
      text: `오류가 발생했습니다: ${error.message || JSON.stringify(error)} `,
      relatedDocIds: []
    };
  }
};

export const generateQuestions = async (
  company: string,
  role: string,
  jobDescription: string
): Promise<string> => {
  const ai = getClient();

  const systemInstruction = `당신은 전문 커리어 코치입니다. 
  사용자가 지원하려는 회사와 직무, 그리고 채용 공고(선택 사항)를 바탕으로 자기소개서 작성에 도움이 될 만한 질문 3~5가지를 제안해야 합니다.

    규칙:
  1. 질문은 구체적이고 생각할 거리를 던져주는 것이어야 합니다.
  2. 해당 직무에 필요한 핵심 역량을 파악할 수 있는 질문이어야 합니다.
  3. 한국어로 정중하게 답변해 주세요.
  4. 마크다운 형식으로 번호를 매겨 출력해 주세요.`;

  const prompt = `
  지원 회사: ${company}
  지원 직무: ${role}
  채용 공고 내용: ${jobDescription || "정보 없음"}
  
  위 정보를 바탕으로 자기소개서 작성을 위한 심층 질문을 제안해 주세요.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite', // Use cheaper model for simple task
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.8,
      }
    });

    return response.text || "질문을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "질문 생성 중 오류가 발생했습니다.";
  }
};

export const generateDraft = async (
  company: string,
  role: string,
  question: string,
  keywords: string,
  documents: Document[],
  charLimit: number = 700
): Promise<string> => {
  const ai = getClient();

  // RAG: Construct context from past documents
  const contextData = documents.map(doc => `
    ---
    Content: ${doc.content}
    ---
  `).join('\n');

  const systemInstruction = `당신은 전문적인 자기소개서 작성 도우미입니다. 
  사용자의 과거 자기소개서 스타일과 경험을 참고하여, 새로운 질문에 대한 초안을 작성해 주세요.
  
  규칙:
  1. **반드시 한국어로 작성하세요.**
  2. **키워드가 제공되면 해당 키워드를 중심으로 작성하고, 제공되지 않으면 질문의 의도를 파악하여 가장 적절한 내용을 스스로 구성하세요.**
  3. **[매우 중요] 목표 글자 수(${charLimit}자)를 절대 넘기지 마세요.**
     - **${charLimit}자 이내로 작성하는 것이 가장 중요한 제약조건입니다.**
     - 내용이 길어질 것 같으면 불필요한 수식어를 과감히 삭제하고 핵심만 남기세요.
     - 지정된 분량보다 10% 이상 부족한 것은 괜찮지만, 1자라도 초과하는 것은 허용되지 않습니다.
  4. **절대 Markdown 헤더(예: #, ##, ###)나 볼드체(**)를 사용하지 마세요.**
  5. 오직 줄바꿈(엔터)으로만 문단을 구분하세요.
  6. 너무 뻔하거나 추상적인 표현보다는 구체적인 경험을 서술하는 톤으로 작성하세요.
  `;

  const prompt = `
  지원 회사: ${company}
  지원 직무: ${role}
  문항(질문): ${question}
  핵심 키워드/소재: ${keywords || "없음 (질문에 맞춰 자유롭게 작성)"}
  목표 글자 수: 최대 ${charLimit}자 (초과 금지)
  
  참고할 과거 자소서 데이터:
  ${contextData}
  
  위 정보를 바탕으로 자기소개서 초안을 작성해 주세요. 헤더 없이 줄글로만 작성해 주세요.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    return response.text || "초안을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "초안 생성 중 오류가 발생했습니다.";
  }
};