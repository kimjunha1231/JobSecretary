import { StyleProfileAnalysisSchema, type StyleExample, type StyleProfileAnalysis } from '@/entities/style-profile/model';

const CONNECTORS = [
    '먼저', '이후', '그래서', '또한', '하지만', '따라서', '결과적으로', '특히',
    '당시', '반면', '그 과정에서', '이를 위해', '함께', '결국',
];

const ENDING_SUFFIXES = [
    '했습니다', '되었습니다', '있습니다', '없습니다', '하였습니다', '합니다', '됩니다',
    '습니다', 'ㅂ니다', '했어요', '해요', '어요', '아요', '한다', '했다', '이다', '였다', '요', '다',
];

function splitSentences(content: string): string[] {
    return content
        .normalize('NFKC')
        .split(/(?<=[.!?。！？])\s+|\n+/u)
        .map(sentence => sentence.trim().replace(/^[\s"'“”‘’([{]+|[\s"'“”‘’)\]}]+$/g, ''))
        .filter(Boolean);
}

function pickTopValues(counts: Map<string, number>, limit: number): string[] {
    return [...counts.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'ko-KR'))
        .slice(0, limit)
        .map(([value]) => value);
}

function detectEnding(sentence: string): string | undefined {
    const normalized = sentence.replace(/[\s.,!?。！？]+$/gu, '');
    return ENDING_SUFFIXES.find(suffix => normalized.endsWith(suffix));
}

export function analyzeStyleExamples(examples: Pick<StyleExample, 'content' | 'approved'>[]): StyleProfileAnalysis {
    const approvedExamples = examples.filter(example => example.approved && example.content.trim());
    const sentences = approvedExamples.flatMap(example => splitSentences(example.content));
    const lengths = sentences.map(sentence => Array.from(sentence).length).filter(length => length > 0);
    const endingCounts = new Map<string, number>();
    const connectorCounts = new Map<string, number>();

    for (const sentence of sentences) {
        const ending = detectEnding(sentence);
        if (ending) endingCounts.set(ending, (endingCounts.get(ending) ?? 0) + 1);
    }
    for (const example of approvedExamples) {
        const content = example.content.normalize('NFKC');
        for (const connector of CONNECTORS) {
            const count = content.split(connector).length - 1;
            if (count > 0) connectorCounts.set(connector, (connectorCounts.get(connector) ?? 0) + count);
        }
    }

    return StyleProfileAnalysisSchema.parse({
        analyzedExampleCount: approvedExamples.length,
        sentenceCount: sentences.length,
        sentenceLength: lengths.length > 0
            ? {
                min: Math.min(...lengths),
                max: Math.max(...lengths),
                average: Math.round((lengths.reduce((total, length) => total + length, 0) / lengths.length) * 10) / 10,
            }
            : {},
        endingStyle: pickTopValues(endingCounts, 5),
        preferredConnectors: pickTopValues(connectorCounts, 5),
        confidence: Math.min(1, Math.round((sentences.length / 20) * 100) / 100),
    });
}
