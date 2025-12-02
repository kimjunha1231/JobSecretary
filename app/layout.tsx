import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DocumentProvider } from "@/context/DocumentContext";
import { AuthProvider } from "@/context/AuthContext";
import { Layout } from "@/components/Layout";
import { Toaster } from "@/components/ui/sonner";
import { GlobalAlert } from "@/components/GlobalAlert";
import InAppBrowserGuard from "@/components/InAppBrowserGuard";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: {
        default: "JobSecretary - AI 통합 채용 관리 플랫폼",
        template: "%s | JobSecretary",
    },
    description: "자기소개서 관리, AI 자기소개서, AI 자기소개서 첨삭 등 취업 준비의 모든 것을 해결하는 AI 통합 채용 관리 플랫폼 JobSecretary입니다.",
    keywords: ["JobSecretary", "잡세크리터리", "AI 자소서", "자기소개서 관리", "AI 자기소개서", "AI 자기소개서 첨삭", "채용 관리 플랫폼", "취업 준비", "이력서", "면접 준비", "AI 면접", "채용 공고"],
    openGraph: {
        title: "JobSecretary - AI 통합 채용 관리 플랫폼",
        description: "자기소개서 관리, AI 자기소개서, AI 자기소개서 첨삭 등 취업 준비의 모든 것을 해결하는 AI 통합 채용 관리 플랫폼 JobSecretary입니다.",
        type: "website",
        locale: "ko_KR",
        siteName: "JobSecretary",
    },
    robots: {
        index: true,
        follow: true,
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className="dark" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning={true}>
                <InAppBrowserGuard />
                <AuthProvider>
                    <DocumentProvider>
                        <Layout>
                            {children}
                        </Layout>
                        <GlobalAlert />
                        <Toaster />
                    </DocumentProvider>
                </AuthProvider>
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
