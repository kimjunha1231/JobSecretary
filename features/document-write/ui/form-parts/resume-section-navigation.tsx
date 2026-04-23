import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';

interface ResumeSectionNavigationProps {
    currentSectionIndex: number;
    totalSections: number;
    goToPrevSection: () => void;
    goToNextSection: () => void;
    addSection: () => void;
    removeSection: (index: number) => void;
}

export function ResumeSectionNavigation({
    currentSectionIndex,
    totalSections,
    goToPrevSection,
    goToNextSection,
    addSection,
    removeSection
}: ResumeSectionNavigationProps) {
    return (
        <div className="flex items-center justify-between border-t border-white/10 pt-6">
            <div className="flex items-center gap-2">
                <button
                    onClick={goToPrevSection}
                    disabled={currentSectionIndex === 0}
                    className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="이전 문항"
                >
                    <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-zinc-400">
                    문항 {currentSectionIndex + 1} / {totalSections}
                </span>
                <button
                    onClick={goToNextSection}
                    disabled={currentSectionIndex === totalSections - 1}
                    className="p-2 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    aria-label="다음 문항"
                >
                    <ChevronRight size={20} />
                </button>
            </div>
            <div className="flex items-center gap-2">
                <button
                    onClick={addSection}
                    className="flex items-center gap-2 px-3 py-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
                >
                    <Plus size={16} />
                    문항 추가
                </button>
                {totalSections > 1 && (
                    <button
                        onClick={() => removeSection(currentSectionIndex)}
                        className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
