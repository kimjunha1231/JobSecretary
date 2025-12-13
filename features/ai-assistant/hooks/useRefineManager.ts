import { useState, useEffect } from 'react';
import { refineText, RefineResult } from '@/shared/api/ai';
import { toast } from 'sonner';

interface UseRefineManagerProps {
    text: string;
    autoTrigger?: boolean;
}

export const useRefineManager = ({ text, autoTrigger = false }: UseRefineManagerProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<RefineResult | null>(null);

    useEffect(() => {
        if (autoTrigger && text && text.trim().length >= 10) {
            handleRefine();
        }
    }, []);

    const handleRefine = async () => {
        if (!text || text.trim().length < 10) {
            toast.error('교정할 텍스트가 너무 짧습니다. (10자 이상)');
            return;
        }

        setIsLoading(true);
        try {
            const refineResult = await refineText(text);
            if (refineResult) {
                setResult(refineResult);
            } else {
                toast.error('AI 교정에 실패했습니다. 잠시 후 다시 시도해주세요.');
            }
        } catch (error) {

            toast.error('오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const clearResult = () => setResult(null);

    return {
        isLoading,
        result,
        handleRefine,
        clearResult
    };
};
