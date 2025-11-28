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
    title: "JobSecretary",
    description: "AI-powered cover letter management",
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
            </body>
        </html>
    );
}
