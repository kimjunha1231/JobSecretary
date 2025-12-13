'use client';

import React from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { ResumeFormData } from '../types';

interface CharacterCounterProps {
    sectionIndex: number;
}

/**
 * 실시간 글자수 계산 컴포넌트
 * useWatch를 사용하여 해당 섹션의 content가 변경될 때만 리렌더링됩니다.
 * 상위 컴포넌트(에디터 전체)의 리렌더링을 방지하여 타이핑 성능을 최적화합니다.
 */
export function CharacterCounter({ sectionIndex }: CharacterCounterProps) {
    const { control } = useFormContext<ResumeFormData>();

    // 특정 필드만 구독하여 리렌더링 범위 제한
    const content = useWatch({
        control,
        name: `sections.${sectionIndex}.content`,
        defaultValue: ''
    });

    const limit = useWatch({
        control,
        name: `sections.${sectionIndex}.limit`,
        defaultValue: 500
    });

    const count = content?.length || 0;
    const isOverLimit = count > limit;

    return (
        <span className={`text-xs ${isOverLimit ? 'text-red-400 font-medium' : 'text-zinc-500'}`}>
            {count.toLocaleString()} / {limit.toLocaleString()}자
        </span>
    );
}
