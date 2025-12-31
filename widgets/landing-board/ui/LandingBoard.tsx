import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Command, CheckCircle2, Sparkles, Layout, ShieldCheck, Search, MessageSquare, ClipboardList, Archive, FileDown, X } from 'lucide-react';
import { GoogleIcon } from '@/shared/ui/icons';
import Image from 'next/image';
import { useLoginBoardLogic } from '../../login-board/hooks';

export function LandingBoard() {
    const { signInWithGoogle } = useLoginBoardLogic();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 selection:bg-primary/30">
            {/* Header */}
            <header className="fixed top-0 w-full z-50 border-b border-white/5 bg-background/80 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-lg shadow-primary/20">
                            <Command size={18} className="text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">JobSecretary</span>
                    </div>
                    <button
                        onClick={signInWithGoogle}
                        className="px-5 py-2 bg-white text-black rounded-full font-semibold text-sm hover:bg-zinc-200 transition-all active:scale-95"
                    >
                        로그인
                    </button>
                </div>
            </header>

            <main>
                {/* Hero Section */}
                <section className="relative pt-32 pb-20 overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-primary/10 via-transparent to-background pointer-events-none -z-10" />
                    <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
                                <Sparkles size={14} />
                                <span>AI 통합 채용 관리 플랫폼</span>
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-[1.1] tracking-tight text-white">
                                당신의 취업 성공을 위한<br />
                                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">AI 비서</span>
                            </h1>
                            <p className="text-zinc-400 text-lg md:text-xl mb-10 leading-relaxed max-w-xl">
                                복잡한 채용 과정을 한눈에 관리하고,<br />
                                AI를 통해 완벽한 자기소개서와 면접을 준비하세요.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button
                                    onClick={signInWithGoogle}
                                    className="flex items-center justify-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-zinc-200 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
                                >
                                    <GoogleIcon className="w-6 h-6" />
                                    Google 계정으로 시작하기
                                </button>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            onClick={() => setSelectedImage('/1.png')}
                            className="relative aspect-[16/10] w-full lg:scale-110 origin-right cursor-zoom-in group"
                        >
                            <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full -z-10 group-hover:bg-primary/30 transition-all" />
                            <div className="relative h-full w-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl bg-[#121212]/50 group-hover:border-primary/50 transition-all">
                                <Image
                                    src="/1.png"
                                    alt="JobSecretary 지원 현황"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Search className="text-white" size={32} />
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Main Features */}
                <section className="py-24 bg-zinc-950/50">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center max-w-3xl mx-auto mb-20">
                            <h2 className="text-3xl md:text-5xl font-bold mb-6">취준생을 위한 완벽한 도구함</h2>
                            <p className="text-zinc-400 text-lg">자기소개서 작성부터 합격의 순간까지, 모든 과정을 돕습니다.</p>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
                            <div className="order-2 lg:order-1">
                                <FeatureTag icon={<Layout />} label="지원 현황 관리" color="text-blue-400" />
                                <h3 className="text-3xl font-bold mt-4 mb-6">드래그 앤 드롭으로 관리하는 지원 프로세스</h3>
                                <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                                    지원한 기업들을 카드 형태로 시각화하여 현재 진행 상황을 한눈에 파악하세요.
                                    서류 제출, 면접, 결과 대기 등 전형 단계를 드래그 앤 드롭으로 간편하게 업데이트할 수 있습니다.
                                </p>
                            </div>
                            <motion.div
                                onClick={() => setSelectedImage('/1.png')}
                                whileHover={{ scale: 1.02 }}
                                className="order-1 lg:order-2 rounded-2xl border border-white/10 overflow-hidden shadow-2xl aspect-[16/10] relative bg-[#121212]/50 cursor-zoom-in group"
                            >
                                <Image src="/1.png" alt="Kanban Board" fill className="object-contain" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Search className="text-white" size={32} />
                                </div>
                            </motion.div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-16 items-center mb-32">
                            <motion.div
                                onClick={() => setSelectedImage('/2.png')}
                                whileHover={{ scale: 1.02 }}
                                className="rounded-2xl border border-white/10 overflow-hidden shadow-2xl aspect-[16/10] relative bg-[#121212]/50 cursor-zoom-in group"
                            >
                                <Image src="/2.png" alt="Resume Editor" fill className="object-contain" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <Search className="text-white" size={32} />
                                </div>
                            </motion.div>
                            <div>
                                <FeatureTag icon={<ClipboardList />} label="스마트 에디터" color="text-purple-400" />
                                <h3 className="text-3xl font-bold mt-4 mb-6">기존에 작성했던 자기소개서를 참고하며 자기소개서를 작성하세요</h3>
                                <div className="space-y-4 text-zinc-400 text-lg leading-relaxed mb-8">
                                    <p>
                                        자기소개서를 작성할 때 이전의 경험들을 따로 찾을 필요가 없습니다.
                                        우측 사이드바에서 과거 자소서와 경험들을 태그로 검색하여 즉시 참고하며 작성하세요.
                                    </p>
                                    <p className="flex items-start gap-2 text-primary/90 font-medium">
                                        <FileDown size={20} className="mt-1 shrink-0" />
                                        <span>작성이 완료된 문장은 클릭 한 번으로 전문적인 레이아웃의 PDF로 즉시 다운로드할 수 있습니다.</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-2 gap-16 items-center">
                            <div className="order-2 lg:order-1">
                                <FeatureTag icon={<Sparkles />} label="AI 협업" color="text-amber-400" />
                                <h3 className="text-3xl font-bold mt-4 mb-6">AI가 제안하는 초안과 완성도 높은 교정</h3>
                                <p className="text-zinc-400 text-lg leading-relaxed mb-8">
                                    키워드 몇 가지만으로도 AI가 풍부한 초안을 작성해줍니다.
                                    또한 맞춤법 검사는 물론, 당신의 의도를 유지하면서 더 전문적인 어조로 문장을 다듬어주는 AI 교정 기능을 경험해보세요.
                                </p>
                            </div>
                            <div className="order-1 lg:order-2 flex flex-col gap-4">
                                <motion.div
                                    onClick={() => setSelectedImage('/3.png')}
                                    whileHover={{ y: -5 }}
                                    className="rounded-xl border border-white/10 overflow-hidden shadow-xl aspect-[16/10] relative bg-[#121212]/50 cursor-zoom-in group"
                                >
                                    <Image src="/3.png" alt="AI Draft" fill className="object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Search className="text-white" size={24} />
                                    </div>
                                </motion.div>
                                <motion.div
                                    onClick={() => setSelectedImage('/5.png')}
                                    whileHover={{ y: -5 }}
                                    className="rounded-xl border border-white/10 overflow-hidden shadow-xl aspect-[16/10] relative bg-[#121212]/50 cursor-zoom-in group"
                                >
                                    <Image src="/5.png" alt="AI Correction" fill className="object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Search className="text-white" size={24} />
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Additional Tools */}
                <section className="py-24">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid md:grid-cols-2 gap-8">
                            <motion.div
                                onClick={() => setSelectedImage('/6.png')}
                                whileHover={{ y: -10 }}
                                className="bg-zinc-900 border border-white/10 rounded-3xl p-8 md:p-12 overflow-hidden relative group cursor-zoom-in"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] -z-10 group-hover:bg-primary/20 transition-all" />
                                <Archive className="text-primary mb-6" size={40} />
                                <h3 className="text-2xl font-bold mb-4">자기소개서 저장소</h3>
                                <p className="text-zinc-400 mb-8 max-w-md">지원했던 모든 기록이 데이터가 됩니다. 합격률 통계와 태그 중심의 보관함을 통해 당신의 경험 에셋을 체계적으로 관리하세요.</p>
                                <div className="rounded-xl border border-white/10 overflow-hidden shadow-lg aspect-[16/10] relative bg-[#121212]/50 group-hover:border-primary/30 transition-all">
                                    <Image src="/6.png" alt="Archive" fill className="object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Search className="text-white" size={32} />
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                onClick={() => setSelectedImage('/7.png')}
                                whileHover={{ y: -10 }}
                                className="bg-zinc-900 border border-white/10 rounded-3xl p-8 md:p-12 overflow-hidden relative group cursor-zoom-in"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 blur-[80px] -z-10 group-hover:bg-purple-500/20 transition-all" />
                                <MessageSquare className="text-purple-400 mb-6" size={40} />
                                <h3 className="text-2xl font-bold mb-4">AI 예상 면접 질문</h3>
                                <p className="text-zinc-400 mb-8 max-w-md">작성한 자기소개서를 기반으로 AI가 면접관의 시선에서 예상 질문을 뽑아줍니다. 실전과 같은 질문으로 완벽하게 대비하세요.</p>
                                <div className="rounded-xl border border-white/10 overflow-hidden shadow-lg aspect-[16/10] relative bg-[#121212]/50 group-hover:border-purple-500/30 transition-all">
                                    <Image src="/7.png" alt="Interview Questions" fill className="object-contain" />
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <Search className="text-white" size={32} />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 text-center">
                    <div className="max-w-3xl mx-auto px-6">
                        <h2 className="text-4xl md:text-6xl font-bold mb-8 italic">HIRE READY?</h2>
                        <p className="text-zinc-400 text-xl mb-12">취업을 위한 모든 준비, 이제 JobSecretary와 함께 시작하세요.</p>
                    </div>
                </section>
            </main>

            <footer className="py-12 border-t border-white/5 bg-zinc-950">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-2 opacity-50">
                        <Command size={20} />
                        <span className="font-bold">JobSecretary</span>
                    </div>
                    <p className="text-zinc-500 text-sm">© 2025 JobSecretary. All rights reserved.</p>
                    <div className="flex gap-8 text-zinc-500 text-sm">
                        <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
                        <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>

            {/* Image Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 md:p-12 cursor-zoom-out"
                    >
                        <motion.button
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors p-2"
                        >
                            <X size={32} />
                        </motion.button>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full h-full"
                        >
                            <Image
                                src={selectedImage}
                                alt="Zoomed view"
                                fill
                                className="object-contain"
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function FeatureTag({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
    return (
        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 ${color} text-sm font-medium`}>
            {icon && <span className="opacity-80 scale-75">{icon}</span>}
            <span>{label}</span>
        </div>
    );
}
