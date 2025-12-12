import { useState } from 'react';

export const useConsentForm = () => {
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    const allAccepted = termsAccepted && privacyAccepted;

    const handleSubmit = async (onConsent: (termsAccepted: boolean, privacyAccepted: boolean) => Promise<void>) => {
        if (allAccepted) {
            await onConsent(termsAccepted, privacyAccepted);
        }
    };

    return {
        termsAccepted,
        setTermsAccepted,
        privacyAccepted,
        setPrivacyAccepted,
        allAccepted,
        handleSubmit
    };
};

export const useDeleteAccountForm = () => {
    const [confirmText, setConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const isConfirmValid = confirmText === '회원탈퇴';

    const handleDelete = async (onConfirm: () => Promise<void>) => {
        if (!isConfirmValid) return;

        setIsDeleting(true);
        try {
            await onConfirm();
        } catch (error) {
            console.error('Delete error:', error);
            setIsDeleting(false);
        }
    };

    return {
        confirmText,
        setConfirmText,
        isDeleting,
        isConfirmValid,
        handleDelete
    };
};

export const useInAppBrowserDetection = () => {
    const [isInApp, setIsInApp] = useState(false);

    const checkAndRedirect = () => {
        const userAgent = navigator.userAgent.toLowerCase();
        const inAppBrowsers = ['kakaotalk', 'instagram', 'naver', 'facebook', 'line'];

        const isInAppBrowser = inAppBrowsers.some(browser => userAgent.includes(browser));

        if (!isInAppBrowser) return;

        const isAndroid = /android/i.test(userAgent);
        const currentUrl = window.location.href;

        if (isAndroid) {
            const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
            window.location.href = intentUrl;
        } else {
            setIsInApp(true);
        }
    };

    const dismiss = () => setIsInApp(false);

    return {
        isInApp,
        checkAndRedirect,
        dismiss
    };
};
