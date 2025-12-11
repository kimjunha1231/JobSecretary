'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ConsentModal } from '@/features/auth';
import { useAuth } from '@/store/useAuthStore';

function ConsentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, showAlert } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [isCheckingConsent, setIsCheckingConsent] = useState(true);

    // Check if user already has consent
    useEffect(() => {
        const checkExistingConsent = async () => {
            if (!user) {
                router.push('/');
                return;
            }

            try {
                const response = await fetch('/api/user-profile');
                const data = await response.json();

                if (data.hasConsent) {
                    // User already has consent, redirect to archive
                    router.push('/archive?login=success');
                } else {
                    setIsCheckingConsent(false);
                }
            } catch (error) {
                console.error('Error checking consent:', error);
                setIsCheckingConsent(false);
            }
        };

        checkExistingConsent();
    }, [user, router]);

    const handleConsent = async (termsAccepted: boolean, privacyAccepted: boolean) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/user-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    termsAccepted,
                    privacyAccepted,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save consent');
            }

            showAlert('환영합니다! 서비스를 시작합니다.', 'success');
            router.push('/archive?login=success');
        } catch (error) {
            console.error('Error saving consent:', error);
            showAlert('동의 처리 중 오류가 발생했습니다.', 'error');
            setIsLoading(false);
        }
    };

    if (isCheckingConsent) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-neutral-400 text-sm">확인 중...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neutral-950">
            <ConsentModal onConsent={handleConsent} isLoading={isLoading} />
        </div>
    );
}

export default function ConsentPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-neutral-400 text-sm">로딩 중...</p>
                </div>
            </div>
        }>
            <ConsentContent />
        </Suspense>
    );
}
