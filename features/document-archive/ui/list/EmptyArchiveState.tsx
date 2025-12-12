import React from 'react';
import { FileText } from 'lucide-react';

export const EmptyArchiveState = () => {
    return (
        <div className="text-center py-20 text-zinc-500">
            <FileText size={48} className="mx-auto mb-4 opacity-20" />
            <p>조건에 맞는 문서가 없습니다.</p>
        </div>
    );
};
