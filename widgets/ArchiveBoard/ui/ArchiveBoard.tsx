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
