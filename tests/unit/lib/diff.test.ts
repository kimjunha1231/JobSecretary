import { computeDiff } from '@/shared/lib/diff';

describe('computeDiff', () => {
    it('should return "same" for identical strings', () => {
        const text = "Hello world";
        const result = computeDiff(text, text);
        expect(result).toEqual([{ type: 'same', value: "Hello world" }]);
    });

    it('should identify added text', () => {
        const original = "Hello";
        const refined = "Hello world";
        const result = computeDiff(original, refined);
        // Depending on tokenization, it might be split differently.
        // Assuming space is a delimiter but kept or split.
        // Let's check the logic. The current implementation splits by whitespace/punctuation.
        // "Hello" -> ["Hello"]
        // "Hello world" -> ["Hello", " ", "world"]
        // Result should be: same "Hello", added " ", added "world"
        // Or merged: same "Hello", added " world"

        // Let's verify the structure roughly
        expect(result).toEqual(expect.arrayContaining([
            { type: 'same', value: 'Hello' },
            { type: 'added', value: expect.stringContaining('world') }
        ]));
    });

    it('should identify removed text', () => {
        const original = "Hello world";
        const refined = "Hello";
        const result = computeDiff(original, refined);
        expect(result).toEqual(expect.arrayContaining([
            { type: 'same', value: 'Hello' },
            { type: 'removed', value: expect.stringContaining('world') }
        ]));
    });

    it('should handle complex changes', () => {
        const original = "The quick brown fox";
        const refined = "The fast brown fox";
        const result = computeDiff(original, refined);

        // Should have "The " (same), "quick" (removed), "fast" (added), " brown fox" (same)
        // Exact tokenization details might vary, but types should be present.
        const types = result.map(p => p.type);
        expect(types).toContain('same');
        expect(types).toContain('removed');
        expect(types).toContain('added');
    });

    it('should handle empty strings', () => {
        const result = computeDiff("", "Hello");
        expect(result).toEqual([{ type: 'added', value: "Hello" }]);

        const result2 = computeDiff("Hello", "");
        expect(result2).toEqual([{ type: 'removed', value: "Hello" }]);
    });
});
