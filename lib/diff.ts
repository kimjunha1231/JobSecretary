export type DiffType = 'same' | 'added' | 'removed';

export interface DiffPart {
    type: DiffType;
    value: string;
}

export function computeDiff(original: string, refined: string): DiffPart[] {
    // Split into words, keeping whitespace/punctuation attached or separate?
    // A simple approach is to split by whitespace but keep the delimiters if possible,
    // or just split by spaces for now.
    // Better approach for natural language: split by word boundaries.

    // Using a regex to split but keep delimiters (whitespace, punctuation)
    const tokenize = (text: string) => {
        return text.split(/(\s+|[.,!?;:()])/).filter(token => token.length > 0);
    };

    const originalTokens = tokenize(original);
    const refinedTokens = tokenize(refined);

    const m = originalTokens.length;
    const n = refinedTokens.length;

    // LCS DP table
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (originalTokens[i - 1] === refinedTokens[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
            }
        }
    }

    // Backtrack to find the diff
    const diffs: DiffPart[] = [];
    let i = m;
    let j = n;

    const parts: DiffPart[] = [];

    while (i > 0 || j > 0) {
        if (i > 0 && j > 0 && originalTokens[i - 1] === refinedTokens[j - 1]) {
            parts.unshift({ type: 'same', value: originalTokens[i - 1] });
            i--;
            j--;
        } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
            parts.unshift({ type: 'added', value: refinedTokens[j - 1] });
            j--;
        } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
            parts.unshift({ type: 'removed', value: originalTokens[i - 1] });
            i--;
        }
    }

    // Merge adjacent parts of the same type
    if (parts.length === 0) return [];

    const merged: DiffPart[] = [];
    let current = parts[0];

    for (let k = 1; k < parts.length; k++) {
        if (parts[k].type === current.type) {
            current.value += parts[k].value;
        } else {
            merged.push(current);
            current = parts[k];
        }
    }
    merged.push(current);

    return merged;
}
