import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { DocumentProvider } from "@/context/DocumentContext";
import { Layout } from "@/components/Layout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "CareerVault AI",
    description: "AI-powered cover letter management",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ko" className="dark">
            <body className={inter.className}>
                <DocumentProvider>
                    <Layout>
                        {children}
                    </Layout>
                </DocumentProvider>
            </body>
        </html>
    );
}
