import { GoogleGenAI } from "@google/genai";
import { CoverLetter } from '../types';

const getClient = () => {
  if (!process.env.API_KEY) {
    console.error("API_KEY is missing from environment variables.");
    throw new Error("API Key missing");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateInsight = async (
  query: string,
  documents: CoverLetter[]
): Promise<string> => {
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

  const systemInstruction = `You are an expert career consultant and data analyst. 
  You have access to the user's archive of past cover letters (provided below). 
  Your goal is to help users find and reuse relevant content from their past applications.
  
  Rules:
  1. When asked about a topic (e.g., "팀워크 경험", "리더십", "프로젝트 경험"), search through ALL cover letters and find the most relevant sections.
  2. Quote the exact text from the cover letters, mentioning which company/role it was from.
  3. If multiple examples exist, show the best 2-3 examples.
  4. Highlight why each example is relevant to the user's question.
  5. Format your response with Markdown (bolding, lists, quotes) for readability.
  6. If no relevant content is found, suggest what kind of content the user should write.
  
  User's Archive:
  ${contextData}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: query,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3, // Lower temperature for more accurate retrieval
      }
    });

    return response.text || "데이터를 기반으로 응답을 생성할 수 없습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "죄송합니다. AI와 통신하는 중 오류가 발생했습니다. API 키를 확인해 주세요.";
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
      model: 'gemini-1.5-flash', // Use cheaper model for simple task
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