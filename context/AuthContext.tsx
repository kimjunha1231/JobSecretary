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
        // Mock user for video recording
        const mockUser: any = {
            id: 'mock-user-id',
            aud: 'authenticated',
            role: 'authenticated',
            email: 'demo@jobsecretary.lat',
            email_confirmed_at: new Date().toISOString(),
            phone: '',
            confirmed_at: new Date().toISOString(),
            last_sign_in_at: new Date().toISOString(),
            app_metadata: { provider: 'google', providers: ['google'] },
            user_metadata: {
                full_name: 'Demo User',
                avatar_url: 'https://ui-avatars.com/api/?name=Demo+User&background=random'
            },
            identities: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const mockSession: any = {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh-token',
            user: mockUser,
            expires_at: Math.floor(Date.now() / 1000) + 3600
        };

        setSession(mockSession);
        setUser(mockUser);
        setIsLoading(false);

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
    }, []);

    const signInWithGoogle = async () => {
        try {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const redirectTo = isLocal
                ? 'http://localhost:3000/auth/callback'
                : `${window.location.origin}/auth/callback`;

            console.log('Google Login Debug:', {
                isLocal,
                hostname: window.location.hostname,
                origin: window.location.origin,
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
