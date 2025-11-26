import React from 'react';
import ResumeForm from '@/components/write/ResumeForm';
import ReferenceSidebar from '@/components/write/ReferenceSidebar';

export default function WritePage() {
    return (
        <div className="w-full h-full overflow-hidden flex flex-col">
            <div className="grid grid-cols-12 gap-6 h-full min-h-0">
                {/* Left Side: Resume Form (75%) */}
                <div className="col-span-9 h-full overflow-y-auto pr-4 custom-scrollbar pb-6">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-2">자기소개서 작성</h1>
                        <p className="text-zinc-400">태그를 활용하여 과거 자소서를 참고하며 작성하세요</p>
                    </div>
                    <ResumeForm />
                </div>

                {/* Right Side: Reference Sidebar (25%) */}
                <div className="col-span-3 h-full border-l border-white/10 pl-4 min-h-0">
                    <ReferenceSidebar />
                </div>
            </div>
        </div>
    );
}
