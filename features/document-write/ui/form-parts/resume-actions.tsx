import { Save } from 'lucide-react';
import { Spinner } from '@/shared/ui';

interface ResumeActionsProps {
    onSave: () => void;
    isSaving: boolean;
}

export function ResumeActions({ onSave, isSaving }: ResumeActionsProps) {
    return (
        <div className="pt-4">
            <button
                onClick={onSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground hover:bg-indigo-600 hover:text-white rounded-lg transition-colors disabled:cursor-not-allowed disabled:text-black shadow-lg shadow-primary/20"
            >
                {isSaving ? (
                    <>
                        <Spinner size="sm" className="border-white/30 border-t-white" />
                        <span>저장 중...</span>
                    </>
                ) : (
                    <>
                        <Save size={18} />
                        <span>저장하기</span>
                    </>
                )}
            </button>
        </div>
    );
}
