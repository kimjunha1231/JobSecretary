import { SourceLibraryBoard } from '@/widgets/source-library-board';
import { Download } from 'lucide-react';

export default function CareerLibraryPage() {
    return (
        <div className="pb-20">
            <div className="mb-8 max-w-3xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Career workspace</p>
                <h1 className="text-3xl font-bold text-white md:text-4xl">경력 자료 라이브러리</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400 md:text-base">
                    이력서, 포트폴리오, 프로젝트 기록을 한곳에 모으고 직접 확인한 근거만 자기소개서 작성에 연결하세요.
                </p>
            </div>
            <section className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-4 md:p-5" aria-labelledby="career-export-title">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">Export</p>
                        <h2 id="career-export-title" className="mt-1 text-base font-semibold text-white">검수 완료 활동을 제출용 PDF로 묶기</h2>
                        <p className="mt-1 text-xs leading-5 text-zinc-400">승인된 활동 근거만 포함하며, 내부 ID·AI 메타데이터는 출력하지 않습니다.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <a href="/api/career/export?format=portfolio" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/40">
                            <Download size={14} aria-hidden="true" /> 포트폴리오 PDF
                        </a>
                        <a href="/api/career/export?format=resume" className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-xs text-zinc-300 transition hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40">
                            <Download size={14} aria-hidden="true" /> 이력서 PDF
                        </a>
                    </div>
                </div>
            </section>
            <SourceLibraryBoard />
        </div>
    );
}
