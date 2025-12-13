'use client';

import React from 'react';
import Image from 'next/image';
import { User, Session } from '@supabase/supabase-js';
import { LogOut, UserX, Loader2 } from 'lucide-react';
import { GoogleIcon } from '@/shared/ui/icons';

interface SidebarUserProfileProps {
    user: User | null;
    isLoading: boolean;
    onSignOut: () => Promise<void>;
    onSignIn: () => Promise<void>;
    onDeleteAccount: () => void;
}

export const SidebarUserProfile: React.FC<SidebarUserProfileProps> = ({
    user,
    isLoading,
    onSignOut,
    onSignIn,
    onDeleteAccount
}) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-4">
                <Loader2 size={20} className="animate-spin text-zinc-500" />
            </div>
        );
    }

    if (user) {
        return (
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {user.user_metadata.avatar_url ? (
                            <div className="relative w-8 h-8">
                                <Image
                                    src={user.user_metadata.avatar_url}
                                    alt="Profile"
                                    fill
                                    className="rounded-full border border-zinc-600 object-cover"
                                    sizes="32px"
                                />
                            </div>
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-800 border border-zinc-600 flex items-center justify-center text-xs font-bold">
                                {user.email?.[0].toUpperCase()}
                            </div>
                        )}
                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-white max-w-[100px] truncate">{user.user_metadata.full_name || user.email?.split('@')[0]}</span>
                        </div>
                    </div>
                    <button
                        onClick={onSignOut}
                        className="text-zinc-500 hover:text-white transition-colors p-1.5 hover:bg-white/10 rounded"
                        title="로그아웃"
                        aria-label="로그아웃"
                    >
                        <LogOut size={14} />
                    </button>
                </div>
                <button
                    onClick={onDeleteAccount}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 border border-transparent hover:border-red-500/30"
                >
                    <UserX size={14} />
                    <span>회원 탈퇴</span>
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={onSignIn}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white text-black rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
        >
            <GoogleIcon className="w-4 h-4" />
            Google 로그인
        </button>
    );
};
