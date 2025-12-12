'use client';

import { Command } from 'lucide-react';
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
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            fill="#4285F4"
                        />
                        <path
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            fill="#34A853"
                        />
                        <path
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            fill="#FBBC05"
                        />
                        <path
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            fill="#EA4335"
                        />
                    </svg>
                    Google 계정으로 시작하기
                </button>
            </div>
        </div>
    );
}
