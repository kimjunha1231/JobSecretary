'use client';

import { X, Sparkles, Loader2, Tag } from 'lucide-react';
import { BaseModal } from '@/shared/ui';
import { AutoDraftModalProps } from '../types';
import { useAutoDraftModal } from '../hooks';

export const AutoDraftModal: React.FC<AutoDraftModalProps> = ({
    isOpen,
    onClose,
    onDraftGenerated,
    company,
    role,
    question
}) => {
    const {
        keywords,
        setKeywords,
        charLimit,
        setCharLimit,
        selectedTags,
        allTags,
        isGenerating,
        toggleTag,
        handleGenerate
    } = useAutoDraftModal({ isOpen, company, role, question, onDraftGenerated, onClose });

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="AI 초안 작성"
            size="lg"
        >
            <div className="space-y-6">
                <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                        참고할 태그 선택 (선택 사항)
                    </label>
                    {allTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border border-white/5 rounded-lg bg-black/20">
                            {allTags.map(tag => (
                                <button
                                    key={tag}
                                    onClick={() => toggleTag(tag)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-all ${selectedTags.includes(tag)
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                                        }`}
                                >
                                    <Tag size={12} />
                                    {tag}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-zinc-500 italic">저장된 태그가 없습니다.</p>
                    )}
                    <p className="text-xs text-zinc-500 mt-2">
                        * 태그를 선택하면 해당 태그가 포함된 문서만 참고하여 작성합니다. 선택하지 않으면 전체 문서를 참고합니다.
                    </p>
                </div>

                <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                        포함하고 싶은 핵심 키워드나 경험을 입력하세요
                    </label>
                    <textarea
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder="예: 캡스톤 디자인 프로젝트 리더 경험, 문제 해결 능력, 팀워크 발휘 사례..."
                        className="w-full h-32 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-white focus:border-primary focus:outline-none resize-none"
                    />
                </div>

                <div>
                    <label className="block text-sm text-zinc-400 mb-2">
                        목표 글자 수
                    </label>
                    <div className="flex items-center gap-4">
                        <input
                            type="range"
                            min="300"
                            max="2000"
                            step="100"
                            value={charLimit}
                            onChange={(e) => setCharLimit(Number(e.target.value))}
                            className="flex-1 accent-indigo-500"
                        />
                        <span className="text-white font-mono w-16 text-right">{charLimit}자</span>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            <span>작성 중... (약 10초 소요)</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} />
                            <span>초안 생성하기</span>
                        </>
                    )}
                </button>
            </div>
        </BaseModal>
    );
};
