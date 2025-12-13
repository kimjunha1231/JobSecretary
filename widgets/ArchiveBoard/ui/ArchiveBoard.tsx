'use client';

import {
    ArchiveHeader,
    ArchiveStats,
    ArchiveFilterBar,
    ArchiveDocumentList,
} from '@/features/document-archive';
import { useArchiveBoardLogic } from '../hooks';

export function ArchiveBoard() {
    const {
        archivedDocuments,
        filteredDocs,
        filterState,
        toggleTag,
        isFiltered,
        dndProps,
        handleToggleFavorite,
        deleteDocument,
        allTags
    } = useArchiveBoardLogic();

    return (
        <div className="pb-20">
            <ArchiveHeader />
            <h2 className="sr-only">자기소개서 통계 및 목록</h2>
            <ArchiveStats documents={archivedDocuments} />

            <ArchiveFilterBar
                {...filterState}
                toggleTag={toggleTag}
                allTags={allTags}
            />
            <ArchiveDocumentList
                filteredDocs={filteredDocs}
                isFiltered={isFiltered}
                dndProps={dndProps}
                onDelete={deleteDocument}
                onToggleFavorite={handleToggleFavorite}
            />
        </div>
    );
}
