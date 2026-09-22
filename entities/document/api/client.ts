type DocumentApiResponse = {
    error?: string;
};

export async function requestDocumentApi<T>(
    input: RequestInfo | URL,
    init?: RequestInit,
): Promise<T> {
    const response = await fetch(input, {
        ...init,
        credentials: 'same-origin',
        headers: {
            ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
            ...init?.headers,
        },
    });

    let payload: unknown = null;
    try {
        payload = await response.json();
    } catch {
        // Keep a generic error when the server did not return JSON.
    }

    if (!response.ok) {
        const message = payload && typeof payload === 'object' && 'error' in payload
            ? (payload as DocumentApiResponse).error
            : undefined;
        throw new Error(message || '문서 요청에 실패했습니다.');
    }

    return payload as T;
}
