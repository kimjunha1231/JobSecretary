import React from 'react';
import path from 'node:path';
import { Document, Font, Link, Page, StyleSheet, Text, View, renderToBuffer } from '@react-pdf/renderer';
import { PdfExportPayloadSchema, type PdfExportPayload } from '../model';

const FONT_FAMILY = 'JobSecretaryPretendard';

Font.register({
    family: FONT_FAMILY,
    fonts: [
        { src: path.join(process.cwd(), 'public/fonts/Pretendard-Regular.ttf'), fontWeight: 400 },
        { src: path.join(process.cwd(), 'public/fonts/Pretendard-Bold.ttf'), fontWeight: 700 },
    ],
});

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
    page: {
        paddingTop: 46,
        paddingBottom: 50,
        paddingHorizontal: 48,
        fontFamily: FONT_FAMILY,
        color: '#111827',
        backgroundColor: '#ffffff',
    },
    header: {
        paddingBottom: 18,
        marginBottom: 24,
        borderBottomWidth: 1.5,
        borderBottomColor: '#1d4ed8',
    },
    eyebrow: {
        fontSize: 8,
        fontWeight: 700,
        color: '#2563eb',
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    title: {
        fontSize: 22,
        fontWeight: 700,
        lineHeight: 1.25,
        marginBottom: 7,
    },
    subtitle: {
        fontSize: 10,
        color: '#4b5563',
        lineHeight: 1.5,
    },
    contact: {
        marginTop: 8,
        fontSize: 8,
        color: '#4b5563',
        lineHeight: 1.5,
    },
    links: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 5,
    },
    link: {
        marginRight: 10,
        fontSize: 8,
        color: '#1d4ed8',
        textDecoration: 'underline',
    },
    section: {
        marginBottom: 22,
        paddingBottom: 16,
        borderBottomWidth: 0.7,
        borderBottomColor: '#d1d5db',
    },
    sectionHeading: {
        fontSize: 12,
        fontWeight: 700,
        color: '#1e3a8a',
        lineHeight: 1.4,
        marginBottom: 8,
    },
    sectionMeta: {
        fontSize: 8,
        color: '#6b7280',
        marginBottom: 8,
    },
    body: {
        fontSize: 10.5,
        lineHeight: 1.75,
        color: '#1f2937',
        whiteSpace: 'pre-wrap',
    },
    resumeSection: {
        marginBottom: 12,
        paddingBottom: 9,
        borderBottomWidth: 0.7,
        borderBottomColor: '#d1d5db',
    },
    resumeSectionHeading: {
        fontSize: 11,
        fontWeight: 700,
        color: '#1e3a8a',
        lineHeight: 1.3,
        marginBottom: 4,
    },
    resumeSectionMeta: {
        fontSize: 8,
        color: '#6b7280',
        marginBottom: 5,
    },
    resumeBody: {
        fontSize: 9,
        lineHeight: 1.45,
        color: '#1f2937',
        whiteSpace: 'pre-wrap',
    },
    footer: {
        position: 'absolute',
        left: 48,
        right: 48,
        bottom: 24,
        paddingTop: 8,
        borderTopWidth: 0.7,
        borderTopColor: '#d1d5db',
        fontSize: 8,
        color: '#6b7280',
        textAlign: 'right',
    },
});

export function createPdfDocument(input: PdfExportPayload): React.ReactElement<React.ComponentProps<typeof Document>> {
    const payload = PdfExportPayloadSchema.parse(input);
    const subtitle = [payload.company, payload.role, payload.subtitle].filter(Boolean).join(' · ');
    const isResume = payload.profileKind === 'resume';
    const candidate = payload.candidateProfile;
    const candidateLinks = [
        candidate?.websiteUrl && { label: 'Portfolio', url: candidate.websiteUrl },
        candidate?.githubUrl && { label: 'GitHub', url: candidate.githubUrl },
        candidate?.linkedinUrl && { label: 'LinkedIn', url: candidate.linkedinUrl },
    ].filter((link): link is { label: string; url: string } => Boolean(link));
    const contact = [candidate?.email, candidate?.phone, candidate?.location].filter(Boolean).join(' · ');

    return (
        <Document title={payload.title} author="JobSecretary" subject="제출용 문서">
            <Page size="A4" style={styles.page} wrap>
                <View style={styles.header}>
                    <Text style={styles.eyebrow}>{candidate ? payload.title : 'JOBSECRETARY · APPLICATION DOCUMENT'}</Text>
                    <Text style={styles.title}>{candidate?.fullName || payload.title}</Text>
                    {candidate?.headline
                        ? <Text style={styles.subtitle}>{candidate.headline}</Text>
                        : !candidate && subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    {contact && <Text style={styles.contact}>{contact}</Text>}
                    {candidateLinks.length > 0 && (
                        <View style={styles.links}>
                            {candidateLinks.map(link => <Link key={link.label} src={link.url} style={styles.link}>{link.label}</Link>)}
                        </View>
                    )}
                </View>

                {payload.sections.map((section, index) => (
                    <View key={`${section.heading}-${index}`} style={isResume ? styles.resumeSection : styles.section} wrap>
                        <Text style={isResume ? styles.resumeSectionHeading : styles.sectionHeading}>
                            {isResume ? section.heading : `${index + 1}. ${section.heading}`}
                        </Text>
                        {section.meta && <Text style={isResume ? styles.resumeSectionMeta : styles.sectionMeta}>{section.meta}</Text>}
                        {!isResume && <Text style={styles.sectionMeta}>{section.charCount.toLocaleString('ko-KR')}자</Text>}
                        <Text style={isResume ? styles.resumeBody : styles.body}>{section.body}</Text>
                    </View>
                ))}

                <Text
                    fixed
                    style={styles.footer}
                    render={({ pageNumber, totalPages }) => `JobSecretary · ${pageNumber} / ${totalPages}`}
                />
            </Page>
        </Document>
    );
}

export async function renderPdfDocument(input: PdfExportPayload): Promise<Buffer> {
    return renderToBuffer(createPdfDocument(input));
}
