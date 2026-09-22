import Link from 'next/link';
import { ArrowRight, Check, Download, FileText, FolderKanban, PenLine, ShieldCheck } from 'lucide-react';

export const metadata = {
    title: '출력 센터 | JobSecretary',
    description: '승인한 경력 자료와 최종 자기소개서를 제출용 PDF로 준비합니다.',
};

const exportCards = [
    {
        href: '/career',
        eyebrow: 'CAREER LIBRARY',
        title: '이력서 · 포트폴리오',
        description: '검수 완료한 프로젝트와 활동만 골라 순서를 정하고, 두 가지 형식의 A4 PDF로 내보냅니다.',
        icon: FolderKanban,
        accent: 'from-primary/25 via-primary/5 to-transparent',
        bullets: ['활동 선택과 출력 순서 편집', '승인된 근거만 서버에서 재확인', '이력서형 · 포트폴리오형 제공'],
        cta: '경력 자료 고르기',
    },
    {
        href: '/writing/new',
        eyebrow: 'WRITING STUDIO',
        title: '자기소개서 PDF',
        description: '근거와 초안을 비교해 직접 확정한 문항만 한국어 A4 템플릿으로 출력합니다.',
        icon: PenLine,
        accent: 'from-sky-400/20 via-sky-400/5 to-transparent',
        bullets: ['문항별 초안·문단 선택', '최종 확정 문항만 출력 가능', '내장 글꼴로 한글 깨짐 방지'],
        cta: '새 작성 세션 시작',
    },
    {
        href: '/archive',
        eyebrow: 'ARCHIVE',
        title: '기존 문서 다시 쓰기',
        description: '예전에 작성한 자기소개서를 열어 내용을 확인하고, 필요한 경우 새 작성 흐름으로 옮깁니다.',
        icon: FileText,
        accent: 'from-amber-300/20 via-amber-300/5 to-transparent',
        bullets: ['지원 기록과 상태 한눈에 보기', '문서별 상세 화면에서 재검토', '새 스튜디오로 점진적 전환'],
        cta: '저장소 열기',
    },
] as const;

export default function ExportsPage() {
    return (
        <div className="pb-24">
            <header className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-surface/60 px-6 py-9 shadow-2xl shadow-black/10 md:px-10 md:py-12">
                <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-primary/10 blur-3xl" aria-hidden="true" />
                <div className="relative max-w-3xl">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Submission desk</p>
                    <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">출력 센터</h1>
                    <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 md:text-base">
                        작성한 내용을 바로 내려받기보다, 내가 확인하고 승인한 근거만 제출 문서에 담습니다. 필요한 작업을 고른 뒤 마지막 검수 화면에서 PDF를 생성하세요.
                    </p>
                    <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-3 py-1.5"><ShieldCheck size={14} className="text-emerald-300" aria-hidden="true" /> 승인 데이터만 사용</span>
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/10 px-3 py-1.5"><Download size={14} className="text-primary" aria-hidden="true" /> 한국어 A4 PDF</span>
                    </div>
                </div>
            </header>

            <section className="mt-8 grid gap-4 lg:grid-cols-3" aria-labelledby="export-options-title">
                <h2 id="export-options-title" className="sr-only">출력 형식 선택</h2>
                {exportCards.map(({ href, eyebrow, title, description, icon: Icon, accent, bullets, cta }) => (
                    <article key={href} className={`group relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${accent} bg-surface/60 p-6 transition duration-300 hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl hover:shadow-black/20 md:p-7`}>
                        <div className="mb-10 flex items-start justify-between gap-4">
                            <div className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-black/10 text-white shadow-inner"><Icon size={20} aria-hidden="true" /></div>
                            <span className="text-[10px] font-semibold tracking-[0.2em] text-zinc-500">{eyebrow}</span>
                        </div>
                        <h3 className="text-xl font-semibold text-white">{title}</h3>
                        <p className="mt-3 min-h-[5.5rem] text-sm leading-6 text-zinc-400">{description}</p>
                        <ul className="mt-6 space-y-2 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-400">
                            {bullets.map(bullet => <li key={bullet} className="flex items-start gap-2"><Check size={14} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />{bullet}</li>)}
                        </ul>
                        <Link href={href} className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-white transition group-hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background">
                            {cta}<ArrowRight size={16} className="transition-transform group-hover:translate-x-1" aria-hidden="true" />
                        </Link>
                    </article>
                ))}
            </section>

            <section className="mt-8 grid gap-4 rounded-3xl border border-white/10 bg-surface/35 p-6 md:grid-cols-[1fr_auto] md:items-center md:px-8" aria-labelledby="export-flow-title">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">A quiet final check</p>
                    <h2 id="export-flow-title" className="mt-2 text-lg font-semibold text-white">PDF를 만들기 전, 세 가지만 확인하세요.</h2>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">사실과 숫자, 회사명·직무명, 그리고 실제 제출하려는 문항이 맞는지 확인하면 됩니다. AI가 승인하지 않은 활동을 대신 추가하지 않습니다.</p>
                </div>
                <Link href="/career" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-3 text-sm text-zinc-300 transition hover:border-white/20 hover:bg-white/5 focus:outline-none focus:ring-2 focus:ring-primary/40">자료 검수하러 가기<ArrowRight size={16} aria-hidden="true" /></Link>
            </section>
        </div>
    );
}
