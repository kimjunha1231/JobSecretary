/** @jest-environment node */

import { DELETE } from '@/app/api/account/delete/route';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

jest.mock('next/headers', () => ({ cookies: jest.fn() }));
jest.mock('@supabase/ssr', () => ({ createServerClient: jest.fn() }));
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn() }));
jest.mock('@/shared/lib', () => ({ logger: { error: jest.fn() } }));

const mockCreateServerClient = createServerClient as jest.Mock;
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
});
