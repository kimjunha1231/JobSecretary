'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AlertState {
    message: string;
    type: 'success' | 'error' | null;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    isLoading: boolean;
    alert: AlertState;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    showAlert: (message: string, type: 'success' | 'error') => void;
    hideAlert: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [alert, setAlert] = useState<AlertState>({ message: '', type: null });

    const showAlert = (message: string, type: 'success' | 'error') => {
        setAlert({ message, type });
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            setAlert({ message: '', type: null });
        }, 3000);
    };

    const hideAlert = () => {
        setAlert({ message: '', type: null });
    };

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setIsLoading(false);
        });

        // Check for login success param
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('login') === 'success') {
                showAlert('로그인 되었습니다.', 'success');
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.delete('login');
                window.history.replaceState({}, '', newUrl.toString());
            }
        }

        return () => subscription.unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            });
            if (error) throw error;
        } catch (error) {
            console.error('Error signing in with Google:', error);
            showAlert('로그인 중 오류가 발생했습니다.', 'error');
        }
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            showAlert('로그아웃 되었습니다.', 'success');
            window.location.href = '/'; // Force refresh and go to home
        } catch (error) {
            console.error('Error signing out:', error);
            showAlert('로그아웃 중 오류가 발생했습니다.', 'error');
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, isLoading, alert, signInWithGoogle, signOut, showAlert, hideAlert }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
