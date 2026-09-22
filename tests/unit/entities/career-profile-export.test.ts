import { evidenceRecordService } from '@/entities/evidence-record/api';
import { CareerProfileServiceError, careerProfileService } from '@/entities/career-profile';
import { renderPdfDocument } from '@/entities/export/api/pdf-document';
import { pdfExportService } from '@/entities/export/api/export.service';

jest.mock('@/entities/evidence-record/api', () => ({
    evidenceRecordService: { listApproved: jest.fn(), getApprovedByIds: jest.fn() },
    EvidenceRecordServiceError: class EvidenceRecordServiceError extends Error {},
}));

jest.mock('@/entities/career-profile', () => ({
    CareerProfileServiceError: jest.requireActual('@/entities/career-profile').CareerProfileServiceError,
    careerProfileService: { get: jest.fn() },
}));

jest.mock('@/entities/export/api/pdf-document', () => ({
    renderPdfDocument: jest.fn(),
}));

const mockedEvidenceService = evidenceRecordService as jest.Mocked<typeof evidenceRecordService>;
const mockedCareerProfileService = careerProfileService as jest.Mocked<typeof careerProfileService>;
const mockedRenderPdfDocument = renderPdfDocument as jest.MockedFunction<typeof renderPdfDocument>;

describe('career profile PDF export compatibility', () => {
    beforeEach(() => jest.clearAllMocks());

    it('preserves approved-activity PDF export while the new profile migration is unavailable', async () => {
        mockedEvidenceService.listApproved.mockResolvedValue([{
            record: { status: 'approved', metrics: [], skills: [], action: '검색을 개선했습니다.' },
            careerItem: { status: 'approved', title: '검색 개선', kind: 'project' },
        } as never]);
        mockedCareerProfileService.get.mockRejectedValue(new CareerProfileServiceError('unavailable', 'migration missing', 503));
        mockedRenderPdfDocument.mockResolvedValue(Buffer.from('%PDF-'));

        await expect(pdfExportService.renderCareerProfile('resume')).resolves.toEqual(Buffer.from('%PDF-'));
        expect(mockedRenderPdfDocument).toHaveBeenCalledWith(expect.objectContaining({
            profileKind: 'resume',
            candidateProfile: undefined,
            sections: [expect.objectContaining({ heading: '검색 개선' })],
        }));
    });
});
