import { CareerActivityBoard, CareerProfileEditor, SourceLibraryBoard } from '@/widgets';

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
            <CareerProfileEditor />
            <SourceLibraryBoard />
            <CareerActivityBoard />
        </div>
    );
}
