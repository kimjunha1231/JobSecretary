'use client';

import { useEffect } from 'react';
import { supabase } from '@/shared/api';
import { useAuthStore } from '@/entities/user';

export function AuthInitializer() {
    const { setSession, setIsLoading, showAlert } = useAuthStore();

    useEffect(() => {
        // Check active session on mount
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setIsLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
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
    }, [setSession, setIsLoading, showAlert]);

    return null; // This component doesn't render anything
}

