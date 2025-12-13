// Query keys
export { documentKeys } from './keys';

// Query hooks
export { useDocuments, useArchivedDocuments } from './useDocuments';
export { useDocument } from './useDocument';

// Mutation hooks
export {
    useToggleFavorite,
    useUpdateDocument,
    useDeleteDocument,
    useArchiveDocument,
    useUpdateDocumentOrder,
    useCreateDocument,
    useArchiveDocuments,
} from './useDocumentMutations';
