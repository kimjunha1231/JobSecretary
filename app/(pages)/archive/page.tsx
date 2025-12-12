'use client';

import {
    ArchiveHeader,
    ArchiveStats,
    ArchiveFilterBar,
    ArchiveDocumentList,
    useArchiveLogic
} from '@/features/document-archive';

export default function Archive() {
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
    } = useArchiveLogic();

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
