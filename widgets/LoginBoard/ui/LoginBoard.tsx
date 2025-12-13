'use client';

import { Command } from 'lucide-react';
import { GoogleIcon } from '@/shared/ui/icons';
import { useLoginBoardLogic } from '../hooks';

export function LoginBoard() {
    const { isLoading, signInWithGoogle } = useLoginBoardLogic();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background text-white p-4 relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-primary/10 to-background pointer-events-none"></div>

            <div className="relative z-10 flex flex-col items-center text-center max-w-lg">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-purple-600 flex items-center justify-center shadow-2xl shadow-primary/30 mb-8">
                    <Command size={32} className="text-white" />
                </div>

                <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                    JobSecretary
                </h1>
                <p className="text-zinc-400 text-lg mb-10 leading-relaxed">
                    AI 통합 채용 관리 플랫폼, JobSecretary.<br />
                    자기소개서 관리부터 면접 준비까지, 당신의 취업 성공을 위한 AI 비서입니다.
                </p>

                <button
                    onClick={signInWithGoogle}
                    className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:bg-zinc-200 transition-all shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
                >
                    <GoogleIcon className="w-6 h-6" />
                    Google 계정으로 시작하기
                </button>
            </div>
        </div>
    );
}
