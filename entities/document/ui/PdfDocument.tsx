import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';
import { Document as DocumentType } from '@/shared/types';

// Register a font that supports Korean characters
Font.register({
    family: 'NotoSansKR',
    fonts: [
        {
            src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/alternative/Pretendard-Regular.ttf',
            fontWeight: 400,
        },
        {
            src: 'https://cdn.jsdelivr.net/gh/orioncactus/pretendard/packages/pretendard/dist/public/static/alternative/Pretendard-Bold.ttf',
            fontWeight: 700,
        },
    ],
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'NotoSansKR',
        backgroundColor: '#ffffff',
    },
    header: {
        marginBottom: 30,
        borderBottomWidth: 2,
        borderBottomColor: '#111827',
        paddingBottom: 10,
    },
    company: {
        fontSize: 14,
        color: '#6b7280',
        marginBottom: 4,
    },
    role: {
        fontSize: 24,
        fontWeight: 700,
        color: '#111827',
        marginBottom: 8,
    },
    meta: {
        flexDirection: 'row',
        gap: 10,
        fontSize: 10,
        color: '#9ca3af',
    },
    section: {
        marginBottom: 20,
    },
    question: {
        fontSize: 12,
        fontWeight: 700,
        color: '#374151',
        backgroundColor: '#f3f4f6',
        padding: 8,
        marginBottom: 8,
        borderRadius: 4,
    },
    answer: {
        fontSize: 11,
        color: '#1f2937',
        lineHeight: 1.6,
        paddingLeft: 8,
        paddingRight: 8,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 9,
        color: '#9ca3af',
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        paddingTop: 10,
    },
});

interface PdfDocumentProps {
    doc: DocumentType;
}

export const PdfDocument = ({ doc }: PdfDocumentProps) => {
    // Parse content into sections
    const sections = doc.content
        ? doc.content.split('### ').filter((s) => s.trim().length > 0).map((s) => {
            const lines = s.split('\n');
            const title = lines[0].trim();
            const content = lines.slice(1).join('\n').trim();
            return { title, content };
        })
        : [];

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                <View style={styles.header}>
                    <Text style={styles.company}>{doc.company}</Text>
                    <Text style={styles.role}>자기소개서</Text>
                </View>

                {sections.map((section, index) => (
                    <View key={index} style={styles.section}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, backgroundColor: '#f3f4f6', padding: 8, borderRadius: 4 }}>
                            <Text style={{ ...styles.question, marginBottom: 0, padding: 0, backgroundColor: 'transparent', flex: 1 }}>Q. {section.title}</Text>
                            <Text style={{ fontSize: 10, color: '#6b7280', marginLeft: 8 }}>{section.content.length.toLocaleString()}자</Text>
                        </View>
                        <Text style={styles.answer}>{section.content}</Text>
                    </View>
                ))}

                <Text
                    style={styles.footer}
                    render={({ pageNumber, totalPages }) =>
                        `${pageNumber} / ${totalPages}`
                    }
                />
            </Page>
        </Document>
    );
};
