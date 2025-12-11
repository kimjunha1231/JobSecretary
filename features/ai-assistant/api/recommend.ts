'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/shared/api';
import { RecommendedDoc } from '@/shared/store/useDraftStore';

const genAI = new GoogleGenerativeAI(process.env.API_KEY!);

export async function getRelevantResumes(field: string, userId: string): Promise<RecommendedDoc[]> {
    if (!field) return [];

    // 1. Fetch recent documents from Supabase
    // Note: In a real app, you might want to use vector search (pgvector) for better relevance.
    // For now, we'll fetch the last 10 documents and let Gemini pick the best ones.
    const { data: documents, error } = await supabase
        .from('documents')
        .select('id, title, company, content')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error || !documents || documents.length === 0) {
        console.error("Error fetching documents:", error);
        return [];
    }

    // 2. Prepare context for Gemini
    const docsContext = documents.map(doc => `
    ---
    ID: ${doc.id}
    Company: ${doc.company}
    Content: ${doc.content}
    ---
    `).join('\n');

    const prompt = `
    사용자가 지금 자기소개서의 '${field}' 항목을 작성하고 있습니다.
    아래 제공된 사용자의 과거 자기소개서 목록 중에서, 현재 작성 중인 '${field}' 항목과 내용상 관련성이 높거나 참고하기 좋은 내용을 찾아주세요.

    [과거 자기소개서 목록]
    ${docsContext}

    [요청 사항]
    1. 관련성이 있는 문서를 최대한 많이(3~5개) 선택하세요.
    2. 각 문서에 대해 다음 정보를 JSON 형식으로 반환해주세요:
       - id: 문서 ID
       - companyName: 회사 이름
       - subtitle: 해당 문항의 소제목 (예: 지원동기, 성격의 장단점 등). 만약 소제목이 없다면 '자기소개서'라고 적으세요.
       - originalContent: 소제목을 제외한 상세 내용만 발췌 (### 등의 마크다운 헤더 제외)
       - aiAdvice: 이번 지원에 이 내용을 어떻게 활용하면 좋을지 1줄 팁 (한국어)

    [출력 형식]
    JSON 배열 형태로만 출력하세요. 예:
    [
      {
        "id": "...",
        "companyName": "...",
        "subtitle": "...",
        "originalContent": "...",
        "aiAdvice": "..."
      }
    ]
    `;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // Clean up markdown code blocks if present
        const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        const recommendations: RecommendedDoc[] = JSON.parse(cleanedText);
        return recommendations;
    } catch (e) {
        console.error("Error generating recommendations:", e);
        return [];
    }
}
