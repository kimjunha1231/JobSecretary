import { CareerProfileServiceError, careerProfileService } from '@/entities/career-profile';
import { GET, PUT } from '@/app/api/career-profiles/me/route';

jest.mock('@/entities/career-profile', () => ({
    CareerProfileServiceError: jest.requireActual('@/entities/career-profile').CareerProfileServiceError,
    careerProfileService: {
        get: jest.fn(),
        update: jest.fn(),
    },
}));

jest.mock('next/server', () => ({
    NextResponse: {
        json: (body: unknown, init?: { status?: number; headers?: Record<string, string> }) => ({
            status: init?.status ?? 200,
            headers: { get: (name: string) => Object.entries(init?.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1] ?? null },
            json: async () => body,
        }),
    },
}));

const mockedService = careerProfileService as jest.Mocked<typeof careerProfileService>;

describe('career profile route', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns private no-store profile data', async () => {
        mockedService.get.mockResolvedValue({ profile: null });

        const response = await GET();

        expect(response.status).toBe(200);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        await expect(response.json()).resolves.toEqual({ profile: null });
    });

    it('rejects invalid JSON without calling the service', async () => {
        const response = await PUT({ json: async () => { throw new Error('invalid json'); } } as unknown as Request);

        expect(response.status).toBe(400);
        expect(mockedService.update).not.toHaveBeenCalled();
    });

    it('preserves auth and missing-migration statuses', async () => {
        mockedService.get.mockRejectedValueOnce(new CareerProfileServiceError('unauthorized', '로그인이 필요합니다.', 401));
        expect((await GET()).status).toBe(401);

        mockedService.get.mockRejectedValueOnce(new CareerProfileServiceError('unavailable', 'migration needed', 503));
        expect((await GET()).status).toBe(503);
    });
});
