/** @jest-environment node */

import { DELETE } from '@/app/api/account/delete/route';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockCreateServerClient = createServerClient as jest.Mock;
const mockCreateClient = createClient as jest.Mock;
const mockCookies = cookies as jest.Mock;

describe('account deletion configuration boundary', () => {
    const originalServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    beforeEach(() => {
        jest.clearAllMocks();
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        mockCookies.mockResolvedValue({ get: jest.fn(), set: jest.fn() });
        mockCreateServerClient.mockReturnValue({
            auth: {
                getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'user-id' } }, error: null }),
                signOut: jest.fn().mockResolvedValue({ error: null }),
            },
        });
    });

    afterAll(() => {
        if (originalServiceRoleKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
        else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRoleKey;
    });

    it('fails closed with a configuration response when the admin key is missing', async () => {
        const response = await DELETE();

        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toEqual({
            error: '회원 탈퇴 기능이 아직 설정되지 않았습니다. 관리자에게 문의해 주세요.',
        });
    });

    it('cleans legacy rows before deleting the authenticated account', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        const legacyDeleteQueries = new Map<string, { eq: jest.Mock }>();
        const adminFrom = jest.fn((table: string) => {
            const query = { eq: jest.fn().mockResolvedValue({ error: null }) };
            legacyDeleteQueries.set(table, query);
            return { delete: jest.fn().mockReturnValue(query) };
        });
        const adminDeleteUser = jest.fn().mockResolvedValue({ error: null });
        mockCreateClient.mockReturnValue({
            from: adminFrom,
            storage: {
                from: jest.fn().mockReturnValue({
                    list: jest.fn().mockResolvedValue({ data: [], error: null }),
                    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            },
            auth: { admin: { deleteUser: adminDeleteUser } },
        });

        const response = await DELETE();

        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ success: true });
        expect(adminFrom).toHaveBeenNthCalledWith(1, 'documents');
        expect(adminFrom).toHaveBeenNthCalledWith(2, 'user_profiles');
        expect(legacyDeleteQueries.get('documents')?.eq).toHaveBeenCalledWith('user_id', 'user-id');
        expect(legacyDeleteQueries.get('user_profiles')?.eq).toHaveBeenCalledWith('user_id', 'user-id');
        expect(adminDeleteUser).toHaveBeenCalledWith('user-id');
    });

    it('does not delete auth when legacy cleanup fails', async () => {
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        const adminDeleteUser = jest.fn().mockResolvedValue({ error: null });
        mockCreateClient.mockReturnValue({
            from: jest.fn().mockReturnValue({
                delete: jest.fn().mockReturnValue({
                    eq: jest.fn().mockResolvedValue({ error: { message: 'legacy table unavailable' } }),
                }),
            }),
            storage: {
                from: jest.fn().mockReturnValue({
                    list: jest.fn().mockResolvedValue({ data: [], error: null }),
                    remove: jest.fn().mockResolvedValue({ data: [], error: null }),
                }),
            },
            auth: { admin: { deleteUser: adminDeleteUser } },
        });

        const response = await DELETE();

        expect(response.status).toBe(500);
        await expect(response.json()).resolves.toEqual({
            error: '기존 계정 데이터를 정리하지 못해 회원 탈퇴를 완료할 수 없습니다.',
        });
        expect(adminDeleteUser).not.toHaveBeenCalled();
    });
});
