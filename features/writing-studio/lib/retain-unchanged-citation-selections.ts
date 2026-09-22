export type CitationSelectionsBySentence = Record<number, string[]>;

function splitSentences(value: string): string[] {
    return (value.match(/[^.!?。！？\n]+[.!?。！？]?/g) ?? [])
        .map(sentence => sentence.trim())
        .filter(Boolean);
}

export function retainUnchangedCitationSelections(
    previousContent: string,
    nextContent: string,
    selections: CitationSelectionsBySentence,
): CitationSelectionsBySentence {
    const previousSentences = splitSentences(previousContent);
    const nextSentences = splitSentences(nextContent);

    return Object.fromEntries(Object.entries(selections).filter(([index, evidenceRecordIds]) => (
        evidenceRecordIds.length > 0 && previousSentences[Number(index)] === nextSentences[Number(index)]
    ))) as CitationSelectionsBySentence;
}
