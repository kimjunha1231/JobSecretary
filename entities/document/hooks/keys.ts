// Query keys for document entity
export const documentKeys = {
    all: ['documents'] as const,
    list: () => [...documentKeys.all, 'list'] as const,
    detail: (id: string) => [...documentKeys.all, 'detail', id] as const,
    archived: () => [...documentKeys.all, 'archived'] as const,
};
