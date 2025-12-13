'use client';

import React from 'react';
import { ResumeForm } from '@/features/document-write';
import { ReferenceSidebar, ReferenceDrawer } from '@/features/reference-search';
import { useDocumentWriteBoardLogic } from '../hooks';

export function DocumentWriteBoard() {
    const { searchProps, referenceDrawer } = useDocumentWriteBoardLogic();

    return (
        <div className="w-full h-full overflow-hidden flex flex-col relative">
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
