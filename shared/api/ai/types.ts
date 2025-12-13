export interface InsightResult {
    text: string;
    relatedDocIds: string[];
}

export interface RefineResult {
    original: string;
    corrected: string;
    changes: string[];
}
