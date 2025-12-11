'use client';

import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';

export default function InAppBrowserGuard() {
    const [isInApp, setIsInApp] = useState(false);

    useEffect(() => {
        const userAgent = navigator.userAgent.toLowerCase();
        const inAppBrowsers = ['kakaotalk', 'instagram', 'naver', 'facebook', 'line'];

        // Check if user is in an in-app browser
        const isInAppBrowser = inAppBrowsers.some(browser => userAgent.includes(browser));

        if (!isInAppBrowser) return;

        // Detect platform
        const isAndroid = /android/i.test(userAgent);
        const currentUrl = window.location.href;

        if (isAndroid) {
            // Android: Redirect to Chrome using intent scheme
            const intentUrl = `intent://${currentUrl.replace(/^https?:\/\//, '')}#Intent;scheme=https;package=com.android.chrome;end`;
            window.location.href = intentUrl;
        } else {
            // iOS/Others: Show modal
            setIsInApp(true);
        }
    }, []);

    if (!isInApp) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4">
            <div className="max-w-md w-full bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 p-8">
                {/* Icon */}
                <div className="flex justify-center mb-6">
                    <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <ExternalLink className="w-8 h-8 text-purple-400" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-white text-center mb-4">
                    외부 브라우저에서 열어주세요!
                </h2>

                {/* Description */}
                <p className="text-gray-300 text-center mb-8">
                    구글 보안 정책으로 인해 카카오톡 내부에서는 로그인이 안 됩니다.
                </p>

                {/* Guide Steps */}
                <div className="bg-gray-800/50 rounded-xl p-6 mb-6 space-y-4">
                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            1
                        </div>
                        <p className="text-gray-200 text-sm">
                            우측 상단(또는 하단)의 <span className="font-bold text-white">점 3개 메뉴(···)</span>를 클릭하세요
                        </p>
                    </div>

                    <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center text-white text-sm font-bold">
                            2
                        </div>
                        <p className="text-gray-200 text-sm">
                            <span className="font-bold text-white">다른 브라우저로 열기</span> (Safari / Chrome)를 선택하세요
                        </p>
                    </div>
                </div>

                {/* Close Button */}
                <button
                    onClick={() => setIsInApp(false)}
                    className="w-full py-3 px-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors text-sm"
                >
                    그냥 닫기 (로그인 불가능)
                </button>
            </div>
        </div>
    );
}
