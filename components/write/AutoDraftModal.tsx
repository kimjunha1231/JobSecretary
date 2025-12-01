import React, { useState, useMemo } from 'react';
import { X, Sparkles, Loader2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateDraft } from '@/services/geminiService';
import { useDocuments } from '@/context/DocumentContext';
import { toast } from 'sonner';

interface AutoDraftModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDraftGenerated: (draft: string) => void;
    company: string;
    role: string;
    question: string;
}

export const AutoDraftModal: React.FC<AutoDraftModalProps> = ({
    isOpen,
    onClose,
    onDraftGenerated,
    company,
    role,
    question
}) => {
    const [keywords, setKeywords] = useState('');
    const [charLimit, setCharLimit] = useState(700);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const { documents } = useDocuments();

    // Reset state when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setKeywords('');
            setCharLimit(700);
            setSelectedTags([]);
        }
    }, [isOpen]);

    // Extract unique tags from all documents
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        documents.forEach(doc => {
            doc.tags?.forEach(tag => tags.add(tag));
        });
        return Array.from(tags).sort();
    }, [documents]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag)
                ? prev.filter(t => t !== tag)
                : [...prev, tag]
        );
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        try {
            // Filter documents based on selected tags
            // If no tags selected, use all documents (default behavior)
            // If tags selected, use only documents that have at least one of the selected tags
            const contextDocuments = selectedTags.length > 0
                ? documents.filter(doc => doc.tags?.some(tag => selectedTags.includes(tag)))
                : documents;

            if (selectedTags.length > 0 && contextDocuments.length === 0) {
                toast.warning('선택한 태그와 일치하는 문서가 없습니다. 전체 문서를 참고합니다.');
            }

            const finalDocs = contextDocuments.length > 0 ? contextDocuments : documents;

            const draft = await generateDraft(company, role, question, keywords, finalDocs, charLimit);
            onDraftGenerated(draft);
            toast.success('초안이 생성되었습니다!');
            onClose();
        } catch (error) {
            console.error('Draft generation failed:', error);
            toast.error('초안 생성에 실패했습니다.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-lg bg-surface border border-white/10 rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between p-6 sticky top-0 z-10 bg-surface/50 backdrop-blur-md border-b border-white/10">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center">
                                        <Sparkles size={16} className="text-white" />
                                    </div>
                                    <h2 className="text-lg font-bold text-white">AI 초안 작성</h2>
                                </div>
                                <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="space-y-6 p-6">
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
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
