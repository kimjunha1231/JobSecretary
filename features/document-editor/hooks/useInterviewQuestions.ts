import { useState } from 'react';
import { generateInterviewQuestions } from '../api';
import { toast } from 'sonner';

export const useInterviewQuestions = (documentContent: string) => {
    const [questions, setQuestions] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!documentContent.trim()) {
            toast.error('자기소개서 내용이 없습니다.');
            return;
        }

        setIsLoading(true);
        try {
            const result = await generateInterviewQuestions(documentContent);
            if (result && result.length > 0) {
                setQuestions(result);
            } else {
                toast.error('질문 생성에 실패했습니다.');
            }
        } catch (error) {

            toast.error('질문 생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyAll = () => {
        const text = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');
        navigator.clipboard.writeText(text);
        toast.success('모든 질문이 복사되었습니다.');
    };

    const hasQuestions = questions.length > 0;

    return {
        questions,
        isLoading,
        hasQuestions,
        handleGenerate,
        handleCopyAll
    };
};
