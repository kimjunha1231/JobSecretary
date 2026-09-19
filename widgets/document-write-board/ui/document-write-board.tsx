'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, FlaskConical } from 'lucide-react';
import { ResumeForm } from '@/features/document-write';
import { ReferenceSidebar, ReferenceDrawer } from '@/features/reference-search';
import { useDocumentWriteBoardLogic } from '../model';

export function DocumentWriteBoard({ showWritingStudioLink = true }: { showWritingStudioLink?: boolean }) {
    const { searchProps, referenceDrawer } = useDocumentWriteBoardLogic();

    return (
        <div className="w-full h-full overflow-hidden flex flex-col relative">
            {showWritingStudioLink && <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <FlaskConical size={18} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
                    <div><p className="text-sm font-semibold text-white">근거를 고르고 초안을 비교하는 새 작성 작업대가 열려 있습니다.</p><p className="mt-1 text-xs leading-5 text-zinc-400">기존 작성 화면은 그대로 유지하면서, 지원 대상별 문항·활동·말투를 연결해 작성할 수 있습니다.</p></div>
                </div>
                <Link href="/writing/new" className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">새 작업대 열기 <ArrowRight size={14} aria-hidden="true" /></Link>
            </div>}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full min-h-0">
                {/* Left Side: Resume Form */}
                <div className="col-span-1 lg:col-span-9 h-full overflow-y-auto pr-2 lg:pr-4 custom-scrollbar pb-20 lg:pb-6">
                    <ResumeForm />
                </div>

                <div className="hidden lg:block lg:col-span-3 h-full border-l border-white/10 pl-4 min-h-0">
                    <ReferenceSidebar {...searchProps} />
                </div>
            </div>

            <ReferenceDrawer
                isOpen={referenceDrawer.isOpen}
                onOpen={referenceDrawer.onOpen}
                onClose={referenceDrawer.onClose}
                searchProps={searchProps}
            />
        </div>
    );
}
