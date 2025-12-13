import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "@/shared/ui";
import { GlobalAlert } from "@/widgets";
import { AuthInitializer, InAppBrowserGuard } from "@/features/auth/ui";
import { Analytics } from "@vercel/analytics/next";
import { QueryProvider } from "./providers";
import { MainLayout } from "./main-layout";

const pretendard = localFont({
    src: "./fonts/PretendardVariable.woff2",
    display: "swap",
    weight: "45 920", // Variable font weight range
    variable: "--font-pretendard",
});

export const metadata: Metadata = {
    metadataBase: new URL("https://jobsecretary.lat"),
    title: {
        default: "JobSecretary - AI 통합 채용 관리 플랫폼",
        template: "%s | JobSecretary",
    },
    description: "자소서 관리, AI 첨삭, 면접 준비를 한 번에. JobSecretary는 당신의 취업 성공을 위한 가장 완벽한 AI 채용 관리 비서입니다.",
    keywords: [
        "JobSecretary", "잡세크리터리",
        "AI 자소서", "자기소개서 관리", "AI 자기소개서", "AI 자기소개서 첨삭",
        "채용 관리 플랫폼", "취업 준비", "이력서", "면접 준비", "AI 면접",
        "자소서 작성", "자소서 예시", "합격 자소서", "취업 비서", "채용 공고 관리"
    ],
    authors: [{ name: "JobSecretary Team" }],
    creator: "JobSecretary",
    publisher: "JobSecretary",
    formatDetection: {
        email: false,
        address: false,
        telephone: false,
    },
    verification: {
        google: "google26279c742f669463",
        other: {
            "naver-site-verification": "YOUR_NAVER_VERIFICATION_CODE",
        },
    },
    alternates: {
        canonical: "/",
    },
    openGraph: {
        title: "JobSecretary - AI 통합 채용 관리 플랫폼",
        description: "자소서 관리, AI 첨삭, 면접 준비를 한 번에. JobSecretary는 당신의 취업 성공을 위한 가장 완벽한 AI 채용 관리 비서입니다.",
        url: "https://jobsecretary.lat",
        siteName: "JobSecretary",
        locale: "ko_KR",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "JobSecretary - AI 통합 채용 관리 플랫폼",
        description: "자소서 관리, AI 첨삭, 면접 준비를 한 번에. JobSecretary는 당신의 취업 성공을 위한 가장 완벽한 AI 채용 관리 비서입니다.",
        creator: "@JobSecretary",
    },
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            "max-video-preview": -1,
            "max-image-preview": "large",
            "max-snippet": -1,
        },
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className="dark" suppressHydrationWarning>
            <body className={`${pretendard.className} ${pretendard.variable} font-sans`} suppressHydrationWarning={true}>
                <InAppBrowserGuard />
                <QueryProvider>
                    <AuthInitializer />
                    <MainLayout>
                        {children}
                    </MainLayout>
                    <GlobalAlert />
                    <Toaster />
                </QueryProvider>
                <Analytics />
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{
                        __html: JSON.stringify({
                            "@context": "https://schema.org",
                            "@type": "SoftwareApplication",
                            "name": "JobSecretary",
                            "applicationCategory": "BusinessApplication",
                            "operatingSystem": "Web",
                            "offers": {
                                "@type": "Offer",
                                "price": "0",
                                "priceCurrency": "KRW"
                            },
                            "description": "AI 기반 자기소개서 관리 및 면접 준비 도구",
                            "aggregateRating": {
                                "@type": "AggregateRating",
                                "ratingValue": "4.8",
                                "ratingCount": "150"
                            }
                        })
                    }}
                />
            </body>
        </html>
    );
}
