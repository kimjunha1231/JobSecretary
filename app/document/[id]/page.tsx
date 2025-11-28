'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDocuments } from '@/context/DocumentContext';
import { ArrowLeft, Calendar, Trash2, Building2, Edit2, Save, X, Copy, Check, Sparkles, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { SmartTagInput } from '@/components/ui/smart-tag-input';
import { Badge } from '@/components/ui/badge';
import RefineManager from '@/components/write/RefineManager';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Status } from '@/types';

const STATUS_LABELS: Record<Status, string> = {
    writing: '작성 중',
    applied: '지원 완료',
    interview: '면접 진행 중',
    pass: '합격',
    fail: '불합격'
};

const STATUS_BADGE_CLASSES: Record<Status, string> = {
    writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    applied: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    interview: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    pass: 'bg-green-500/10 text-green-400 border-green-500/20',
    fail: 'bg-red-500/10 text-red-400 border-red-500/20'
};

interface Section {
    title: string;
    content: string;
}

export default function DocumentDetail() {
    const params = useParams();
    const id = params?.id as string;
    const router = useRouter();
    const { documents, deleteDocument, updateDocument } = useDocuments();

    const doc = documents.find(d => d.id === id);

    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({
        company: '',
        role: '',
        jobPostUrl: '',
        tags: [] as string[],
        status: 'writing' as Status,
        sections: [] as Section[]
    });
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [autoRefineIndex, setAutoRefineIndex] = useState<number | null>(null);
    const [isDocDeleteModalOpen, setIsDocDeleteModalOpen] = useState(false); // Added state
    const [isSectionDeleteModalOpen, setIsSectionDeleteModalOpen] = useState(false); // Added state
    const [sectionDeleteIndex, setSectionDeleteIndex] = useState<number | null>(null); // Added state

    useEffect(() => {
        if (doc) {
            const parsedSections = doc.content.split(/(?=### )/g)
                .filter(s => s.trim())
                .map(s => {
                    const titleMatch = s.match(/^### (.*)(\n|$)/);
                    const title = titleMatch ? titleMatch[1].trim() : '무제';
                    const content = s.replace(/^### .*\n?/, '').trim();
                    return { title, content };
                });

            const finalSections = parsedSections.length > 0 ? parsedSections : [{ title: '자기소개서', content: doc.content }];

            setEditForm({
                company: doc.company,
                role: doc.role,
                jobPostUrl: doc.jobPostUrl || '',
                tags: doc.tags || [],
                status: doc.status || 'writing',
                sections: finalSections
            });
        }
    }, [doc]);

    if (!doc) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-zinc-500">
                <p>문서를 찾을 수 없습니다.</p>
                <button
                    onClick={() => router.push('/archive')}
                    className="mt-4 text-primary hover:underline"
                >
                    아카이브로 돌아가기
                </button>
            </div>
        );
    }

    const handleDelete = () => { // Modified to open modal
        setIsDocDeleteModalOpen(true);
    };

    const confirmDocDelete = async () => { // Added confirmation handler
        await deleteDocument(doc.id);
        router.push('/archive');
        setIsDocDeleteModalOpen(false);
    };

    const handleSave = async () => {
        const combinedContent = editForm.sections.map(s => {
            return `### ${s.title}\n${s.content}`;
        }).join('\n\n');

        await updateDocument(doc.id, {
            company: editForm.company,
            role: editForm.role,
            content: combinedContent,
            jobPostUrl: editForm.jobPostUrl,
            tags: editForm.tags,
            status: editForm.status
        });
        setIsEditing(false);
    };

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const updateSection = (index: number, field: keyof Section, value: string) => {
        const newSections = [...editForm.sections];
        newSections[index] = { ...newSections[index], [field]: value };
        setEditForm(prev => ({ ...prev, sections: newSections }));
    };

    const handleAddSection = () => {
        setEditForm(prev => ({
            ...prev,
            sections: [...prev.sections, { title: '', content: '' }]
        }));
    };

    const handleDeleteSection = (index: number) => { // Modified to open modal
        setSectionDeleteIndex(index);
        setIsSectionDeleteModalOpen(true);
    };

    const confirmSectionDelete = () => { // Added confirmation handler
        if (sectionDeleteIndex !== null) {
            setEditForm(prev => ({
                ...prev,
                sections: prev.sections.filter((_, i) => i !== sectionDeleteIndex)
            }));
            setSectionDeleteIndex(null);
        }
        setIsSectionDeleteModalOpen(false);
    };

    return (
        <div className="max-w-4xl mx-auto pb-20">
            <div className="mb-10">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6 group"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>목록으로</span>
                </button>

                <div className="flex items-start justify-between">
                    <div className="flex-1 mr-8">
                        {isEditing ? (
                            <div className="space-y-4">
                                <div className="flex flex-col gap-1 w-full">
                                    <div className="flex items-center gap-2 text-zinc-400">
                                        <Building2 size={18} />
                                        <input
                                            type="text"
                                            value={editForm.company}
                                            onChange={e => setEditForm(prev => ({ ...prev, company: e.target.value }))}
                                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none w-full max-w-xs"
                                            placeholder="회사명"
                                        />
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full border ${STATUS_BADGE_CLASSES[editForm.status]}`}
                                        >
                                            {STATUS_LABELS[editForm.status]}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-500 pl-6">
                                        상태는 지원 현황 칸반에서만 변경할 수 있습니다.
                                    </p>
                                </div>
                                <input
                                    type="text"
                                    value={editForm.role}
                                    onChange={e => setEditForm(prev => ({ ...prev, role: e.target.value }))}
                                    className="text-4xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-primary focus:outline-none w-full"
                                    placeholder="지원 직무"
                                />
                                <input
                                    type="url"
                                    value={editForm.jobPostUrl}
                                    onChange={e => setEditForm(prev => ({ ...prev, jobPostUrl: e.target.value }))}
                                    className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none text-sm"
                                    placeholder="채용 공고 링크 (선택)"
                                />
                                <SmartTagInput
                                    tags={editForm.tags}
                                    onChange={tags => setEditForm(prev => ({ ...prev, tags }))}
                                    placeholder="태그 입력..."
                                    className="bg-zinc-900 border-zinc-700"
                                />
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center gap-3 text-zinc-400 mb-3">
                                    <div className="flex items-center gap-2">
                                        <Building2 size={18} />
                                        <span className="font-medium text-lg">{doc.company}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_BADGE_CLASSES[doc.status]}`}>
                                        {STATUS_LABELS[doc.status]}
                                    </span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight tracking-tight">{doc.role}</h1>
                            </div>
                        )}

                        {!isEditing && (
                            <div className="space-y-3 mt-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <div className="flex items-center gap-2 text-sm text-zinc-400 bg-white/5 px-3 py-1.5 rounded-full border border-white/5">
                                        <Calendar size={14} />
                                        {doc.createdAt}
                                    </div>
                                    {doc.tags && doc.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="text-xs">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                                {doc.jobPostUrl && (
                                    <div className="flex items-start gap-2 text-sm">
                                        <span className="text-zinc-500">채용 공고:</span>
                                        <a
                                            href={doc.jobPostUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary hover:text-indigo-400 hover:underline transition-colors break-all"
                                        >
                                            {doc.jobPostUrl}
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 transition-all rounded-xl"
                                    title="취소"
                                >
                                    <X size={20} />
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="p-3 bg-indigo-600 text-white hover:bg-indigo-500 transition-all rounded-xl shadow-lg shadow-indigo-500/20"
                                    title="저장"
                                >
                                    <Save size={20} />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-3 text-zinc-400 hover:text-white hover:bg-white/10 transition-all rounded-xl"
                                    title="수정"
                                >
                                    <Edit2 size={20} />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="p-3 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-xl"
                                    title="삭제"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </>
                        )}
                    </div>

                </div>
            </div>

            <div className="space-y-8">
                {isEditing ? (
                    <>
                        {editForm.sections.map((section, index) => (
                            <div key={index} className="bg-surface border border-white/5 rounded-2xl overflow-hidden">
                                <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary text-sm font-mono font-bold shrink-0 mt-1">
                                            {index + 1}
                                        </span>
                                        <input
                                            type="text"
                                            value={section.title}
                                            onChange={e => updateSection(index, 'title', e.target.value)}
                                            className="flex-1 bg-transparent border-none text-xl font-semibold text-white focus:outline-none focus:ring-0 placeholder-zinc-600 break-words"
                                            placeholder="문항 제목"
                                        />
                                        <button
                                            onClick={() => handleDeleteSection(index)}
                                            className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all rounded-lg"
                                            title="문항 삭제"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                    <div className="flex items-center justify-between gap-3 pl-10">
                                        <span className="text-sm text-zinc-500 font-mono">
                                            {section.content.length}자
                                        </span>
                                        <RefineManager
                                            text={section.content}
                                            onApply={(corrected) => updateSection(index, 'content', corrected)}
                                            autoTrigger={autoRefineIndex === index}
                                        />
                                    </div>
                                </div>
                                <div className="p-8">
                                    <textarea
                                        value={section.content}
                                        onChange={e => updateSection(index, 'content', e.target.value)}
                                        className="w-full h-64 bg-zinc-900/50 border border-zinc-700 rounded-lg p-4 text-zinc-300 leading-relaxed focus:border-primary focus:outline-none resize-none"
                                        placeholder="내용을 입력하세요..."
                                    />
                                </div>
                            </div>
                        ))}
                        <button
                            onClick={handleAddSection}
                            className="w-full py-4 border-2 border-dashed border-zinc-700 rounded-2xl text-zinc-400 hover:text-white hover:border-zinc-500 hover:bg-white/5 transition-all flex items-center justify-center gap-2 font-medium"
                        >
                            <Plus size={20} />
                            문항 추가하기
                        </button>
                    </>
                ) : (
                    editForm.sections.map((section, index) => (
                        <div key={index} className="bg-surface border border-white/5 rounded-2xl overflow-hidden hover:border-primary/30 transition-colors shadow-sm group">
                            <div className="px-8 py-6 border-b border-white/5 bg-white/[0.02]">
                                <div className="flex items-start gap-3 mb-3">
                                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/20 text-primary text-sm font-mono font-bold shrink-0 mt-1">
                                        {index + 1}
                                    </span>
                                    <h3 className="text-xl font-semibold text-white flex-1 break-words leading-relaxed">
                                        {section.title}
                                    </h3>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={() => handleCopy(section.content, index)}
                                            className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5 opacity-0 group-hover:opacity-100"
                                            title="내용 복사"
                                        >
                                            {copiedIndex === index ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setAutoRefineIndex(index);
                                                setIsEditing(true);
                                            }}
                                            className="text-zinc-500 hover:text-purple-400 transition-colors p-2 rounded-lg hover:bg-purple-500/10 opacity-0 group-hover:opacity-100"
                                            title="AI 교정"
                                        >
                                            <Sparkles size={18} />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 pl-10">
                                    <span className="text-sm text-zinc-500 font-mono">
                                        {section.content.length}자
                                    </span>
                                </div>
                            </div>
                            <div className="p-8 text-zinc-300 leading-relaxed whitespace-pre-wrap text-lg">
                                <ReactMarkdown>{section.content}</ReactMarkdown>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <ConfirmationModal
                isOpen={isDocDeleteModalOpen}
                onClose={() => setIsDocDeleteModalOpen(false)}
                onConfirm={confirmDocDelete}
                title="문서 삭제"
                message="정말 이 문서를 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />

            <ConfirmationModal
                isOpen={isSectionDeleteModalOpen}
                onClose={() => {
                    setIsSectionDeleteModalOpen(false);
                    setSectionDeleteIndex(null);
                }}
                onConfirm={confirmSectionDelete}
                title="문항 삭제"
                message="이 문항을 삭제하시겠습니까?"
                confirmText="삭제"
                variant="danger"
            />
        </div>
    );
}
