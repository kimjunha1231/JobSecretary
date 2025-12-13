/**
 * Mock @react-pdf/renderer module for testing
 * Prevents ESM parsing issues
 * Uses plain JS createElement to avoid circular dependencies
 */

const React = {
    createElement: (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => ({
        type,
        props: { ...props, children }
    })
};

// Mock all PDF components as simple objects
export const Document = ({ children }: { children: unknown }) =>
    React.createElement('div', { 'data-testid': 'pdf-document' }, children);

export const Page = ({ children }: { children: unknown }) =>
    React.createElement('div', { 'data-testid': 'pdf-page' }, children);

export const View = ({ children }: { children: unknown }) =>
    React.createElement('div', { 'data-testid': 'pdf-view' }, children);

export const Text = ({ children }: { children: unknown }) =>
    React.createElement('span', { 'data-testid': 'pdf-text' }, children);

export const Image = () =>
    React.createElement('img', { 'data-testid': 'pdf-image', alt: 'PDF Image' });

export const Link = ({ children }: { children: unknown }) =>
    React.createElement('a', { 'data-testid': 'pdf-link' }, children);

export const Font = {
    register: jest.fn(),
    registerHyphenationCallback: jest.fn(),
};

export const StyleSheet = {
    create: <T extends Record<string, unknown>>(styles: T): T => styles,
};

export const PDFDownloadLink = ({ children }: { children: unknown }) =>
    React.createElement('div', { 'data-testid': 'pdf-download-link' }, children);

export const PDFViewer = ({ children }: { children: unknown }) =>
    React.createElement('div', { 'data-testid': 'pdf-viewer' }, children);

export const usePDF = () => [{}, jest.fn()];

export const pdf = jest.fn().mockReturnValue({
    toBlob: jest.fn().mockResolvedValue(new Blob()),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('')),
    toString: jest.fn().mockResolvedValue(''),
});
