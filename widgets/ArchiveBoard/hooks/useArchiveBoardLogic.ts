import {
    ArchiveHeader,
    ArchiveStats,
    ArchiveFilterBar,
    ArchiveDocumentList,
} from '@/features/document-archive';
import { useArchiveLogic } from '@/features/document-archive/hooks';

export const useArchiveBoardLogic = () => {
    const logic = useArchiveLogic();
    return logic;
};
