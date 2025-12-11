import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDocuments } from '@/entities/document';
import { generateInsight, generateQuestions } from '@/features/ai-assistant';
import { ChatMessage } from '@/types';
import { Send, Sparkles, Loader2, User, X, MessageSquare, HelpCircle, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

interface AiSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    context?: {
        type: 'write';
        company: string;
        role: string;
        jobDescription?: string;
    };
}

export const AiSidebar: React.FC<AiSidebarProps> = ({ isOpen, onClose, context }) => {
    const router = useRouter();
    const { data: documents = [] } = useDocuments();
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [query, setQuery] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: 'welcome',
            role: 'model',
            text: `안녕하세요! **${documents.length}개의 저장된 자기소개서**를 분석했습니다. 과거 경험에 대해 무엇이든 물어보거나, 이력을 바탕으로 새로운 단락 작성을 요청해 보세요.`,
            timestamp: Date.now()
        }
    ]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen]);

    const handleSend = async () => {
        if (!query.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: query,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, userMsg]);
        setQuery('');
        setIsTyping(true);

        try {
            const { text, relatedDocIds } = await generateInsight(userMsg.text, documents);

            const modelMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: text,
                relatedDocIds: relatedDocIds,
                timestamp: Date.now()
            };

            setMessages(prev => [...prev, modelMsg]);
        } catch (error) {
            console.error("Error generating insight:", error);
            const errorMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: "죄송합니다. 오류가 발생했습니다.",
                timestamp: Date.now()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleGenerateQuestions = async () => {
        if (!context || context.type !== 'write') return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: "이 직무와 회사에 맞는 자기소개서 질문을 추천해줘.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setIsTyping(true);

        const responseText = await generateQuestions(context.company, context.role, context.jobDescription || '');

        const modelMsg: ChatMessage = {
            id: (Date.now() + 1).toString(),
            role: 'model',
            text: responseText,
            timestamp: Date.now()
        };

        setMessages(prev => [...prev, modelMsg]);
        setIsTyping(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.nativeEvent.isComposing) return;
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getRelatedDocuments = (ids: string[]) => {
        return documents.filter(doc => ids.includes(doc.id));
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for mobile */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed right-0 top-0 h-screen w-full md:w-[400px] bg-[#18181b] border-l border-zinc-800 z-50 shadow-2xl flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                            <div className="flex items-center gap-2">
                                <Sparkles size={18} className="text-indigo-400" />
                                <h2 className="font-semibold text-white">AI 어시스턴트</h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'model' ? 'bg-gradient-to-tr from-indigo-600 to-purple-600' : 'bg-zinc-700'}`}>
                                        {msg.role === 'model' ? <Sparkles size={14} className="text-white" /> : <User size={14} className="text-zinc-300" />}
                                    </div>

                                    <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                            ? 'bg-zinc-800 text-white rounded-tr-sm'
                                            : 'bg-indigo-950/30 border border-indigo-500/20 text-indigo-100 rounded-tl-sm'
                                            }`}>
                                            {msg.role === 'model' ? (
                                                <ReactMarkdown
                                                    components={{
                                                        strong: ({ node, ...props }) => <span className="font-bold text-indigo-300" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc pl-4 my-2 space-y-1" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-4 my-2 space-y-1" {...props} />,
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        a: ({ node, href, children, ...props }) => {
                                                            return (
                                                                <span
                                                                    className="text-indigo-300 hover:underline cursor-pointer"
                                                                    onClick={() => {
                                                                        if (href) {
                                                                            // onClose(); // Optional: close sidebar on navigation
                                                                            router.push(href);
                                                                        }
                                                                    }}
                                                                >
                                                                    {children}
                                                                </span>
                                                            );
                                                        }
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            ) : (
                                                msg.text
                                            )}
                                        </div>

                                        {/* Related Documents Cards */}
                                        {msg.role === 'model' && msg.relatedDocIds && msg.relatedDocIds.length > 0 && (
                                            <div className="mt-3 w-full space-y-2">
                                                <p className="text-xs text-zinc-500 ml-1">관련 문서</p>
                                                {getRelatedDocuments(msg.relatedDocIds).map(doc => (
                                                    <div
                                                        key={doc.id}
                                                        className="bg-zinc-900/50 border border-zinc-800 rounded-lg overflow-hidden transition-all"
                                                    >
                                                        <div
                                                            onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                                                            className="p-3 flex items-start justify-between cursor-pointer hover:bg-zinc-800/50 group"
                                                        >
                                                            <div>
                                                                <h4 className="text-sm font-medium text-zinc-200 group-hover:text-indigo-300 transition-colors line-clamp-1">{doc.title}</h4>
                                                                <p className="text-xs text-zinc-500 mt-1">{doc.company} · {doc.role}</p>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">{doc.createdAt}</span>
                                                                {expandedDocId === doc.id ? <ChevronUp size={14} className="text-zinc-500" /> : <ChevronDown size={14} className="text-zinc-500" />}
                                                            </div>
                                                        </div>

                                                        {expandedDocId === doc.id && (
                                                            <div className="px-3 pb-3 pt-0 border-t border-zinc-800/50">
                                                                <div className="mt-2 flex justify-end">
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            router.push(`/document/${doc.id}`);
                                                                        }}
                                                                        className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline"
                                                                    >
                                                                        <span>전체 보기</span>
                                                                        <ExternalLink size={10} />
                                                                    </button>
                                                                </div>
                                                                <div className="mt-2 text-xs text-zinc-400 leading-relaxed max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                                    <ReactMarkdown>{doc.content}</ReactMarkdown>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex gap-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center flex-shrink-0">
                                        <Sparkles size={14} className="text-white" />
                                    </div>
                                    <div className="px-4 py-3 bg-indigo-950/30 border border-indigo-500/20 rounded-2xl rounded-tl-sm flex items-center">
                                        <Loader2 className="animate-spin text-indigo-400" size={16} />
                                    </div>
                                </div>
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Context Actions */}
                        {context?.type === 'write' && (
                            <div className="px-4 py-2 border-t border-zinc-800 bg-zinc-900/30">
                                <button
                                    onClick={handleGenerateQuestions}
                                    disabled={isTyping || !context.company || !context.role}
                                    className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-sm text-indigo-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <HelpCircle size={14} />
                                    <span>이 직무를 위한 질문 추천받기</span>
                                </button>
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                            <div className="relative">
                                <textarea
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="무엇이든 물어보세요..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary resize-none h-12 max-h-32 min-h-[48px]"
                                    style={{ minHeight: '48px' }}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!query.trim() || isTyping}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-primary hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
