import { create } from 'zustand';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/shared/api';

interface AlertState {
    message: string;
    type: 'success' | 'error' | null;
}

interface AuthState {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    alert: AlertState;
    
    // Actions
    setUser: (user: User | null) => void;
    setSession: (session: Session | null) => void;
    setIsLoading: (isLoading: boolean) => void;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    showAlert: (message: string, type: 'success' | 'error') => void;
    hideAlert: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
    user: null,
    session: null,
    isLoading: true,
    alert: { message: '', type: null },

    setUser: (user) => set({ user }),
    setSession: (session) => set({ session, user: session?.user ?? null }),
    setIsLoading: (isLoading) => set({ isLoading }),

    showAlert: (message, type) => {
        set({ alert: { message, type } });
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            set({ alert: { message: '', type: null } });
        }, 3000);
    },

    hideAlert: () => {
        set({ alert: { message: '', type: null } });
    },

    signInWithGoogle: async () => {
        try {
            const isLocal = typeof window !== 'undefined' && 
                (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
            const redirectTo = isLocal
                ? 'http://localhost:3000/auth/callback'
                : `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`;

            console.log('Google Login Debug:', {
                isLocal,
                hostname: typeof window !== 'undefined' ? window.location.hostname : '',
                origin: typeof window !== 'undefined' ? window.location.origin : '',
                redirectTo
            });

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            get().showAlert('로그인 중 오류가 발생했습니다.', 'error');
        }
    },

    signOut: async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            get().showAlert('로그아웃 되었습니다.', 'success');
            if (typeof window !== 'undefined') {
                window.location.href = '/'; // Force refresh and go to home
            }
        } catch (error) {
            console.error('Error signing out:', error);
            get().showAlert('로그아웃 중 오류가 발생했습니다.', 'error');
        }
    },
}));

// Hook alias for compatibility
export const useAuth = () => useAuthStore();

