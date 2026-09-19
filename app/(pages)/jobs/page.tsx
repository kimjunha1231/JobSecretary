import { JobTargetBoard } from '@/widgets/job-target-board';

export default function JobTargetsPage() {
    return (
        <div className="pb-20">
            <div className="mb-8 max-w-3xl">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">Job workspace</p>
                <h1 className="text-3xl font-bold text-white md:text-4xl">지원 대상과 공고 분석</h1>
                <p className="mt-3 text-sm leading-6 text-zinc-400 md:text-base">
                    회사·직무별로 채용 자료를 묶고, 원문 근거가 있는 요구사항 후보를 직접 검수하세요.
                </p>
            </div>
            <JobTargetBoard />
        </div>
    );
}
