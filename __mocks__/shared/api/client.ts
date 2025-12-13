/**
 * Mock Supabase client for testing
 * Prevents actual API calls and env variable requirements
 */

const mockSupabaseClient = {
    from: jest.fn(() => mockSupabaseClient),
    select: jest.fn(() => mockSupabaseClient),
    insert: jest.fn(() => mockSupabaseClient),
    update: jest.fn(() => mockSupabaseClient),
    delete: jest.fn(() => mockSupabaseClient),
    eq: jest.fn(() => mockSupabaseClient),
    in: jest.fn(() => mockSupabaseClient),
    order: jest.fn(() => mockSupabaseClient),
    single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    auth: {
        getUser: jest.fn(() => Promise.resolve({
            data: {
                user: {
                    id: 'test-user-id',
                    email: 'test@example.com'
                }
            },
            error: null
        })),
        getSession: jest.fn(() => Promise.resolve({
            data: { session: null },
            error: null
        })),
        signInWithOAuth: jest.fn(),
        signOut: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
            data: { subscription: { unsubscribe: jest.fn() } }
        })),
    },
    storage: {
        from: jest.fn(() => ({
            upload: jest.fn(),
            download: jest.fn(),
            getPublicUrl: jest.fn(() => ({ data: { publicUrl: '' } })),
        })),
    },
};

// Make chainable methods return resolved promises when needed
mockSupabaseClient.select.mockImplementation(() => ({
    ...mockSupabaseClient,
    then: (resolve: (value: { data: unknown[]; error: null }) => void) => resolve({ data: [], error: null }),
}));

export const supabase = mockSupabaseClient;
