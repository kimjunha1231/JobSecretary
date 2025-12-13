'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * 수정 페이지 이탈 시 경고 메시지를 표시하는 훅
 * 수정 중인 내용(isDirty)이 있을 때만 경고를 표시합니다.
 * - 브라우저 새로고침/닫기: beforeunload 이벤트
 * - 브라우저 뒤로가기: popstate 이벤트 + history 조작
 * - 뒤로가기/취소 버튼 클릭: handleBack 함수
 */
export function useEditPageLeaveWarning(isDirty: boolean) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isBlocking, setIsBlocking] = useState(false);



    // 뒤로가기 방지를 위한 히스토리 상태 초기화
    useEffect(() => {
        if (!isDirty) {
            setIsBlocking(false);
            return;
        }

        // history state가 없는 경우에만 push
        if (!window.history.state?.isEditPage) {
            window.history.pushState({ isEditPage: true }, '', window.location.href);
        }
        setIsBlocking(true);

        return () => {
            setIsBlocking(false);
        };
    }, [isDirty]);

    // popstate 이벤트 핸들러 (뒤로가기/앞으로가기)
    const handlePopState = useCallback(() => {
        if (!isBlocking) return;

        const confirmLeave = window.confirm(
            '수정 중인 내용이 사라집니다.\n정말 나가시겠습니까?'
        );

        if (confirmLeave) {
            setIsBlocking(false);
            window.history.go(-1);
        } else {
            window.history.pushState({ isEditPage: true }, '', window.location.href);
        }
    }, [isBlocking]);

    useEffect(() => {
        if (!isDirty) return;

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            e.preventDefault();
            e.returnValue = '수정 중인 내용이 사라집니다. 페이지를 나가시겠습니까?';
            return e.returnValue;
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            window.removeEventListener('popstate', handlePopState);
        };
    }, [isDirty, handlePopState]);

    // 뒤로가기(취소) 버튼 클릭 핸들러
    const handleBack = useCallback((targetPath: string) => {
        if (isDirty) {
            const confirmLeave = window.confirm(
                '수정 중인 내용이 사라집니다.\n정말 나가시겠습니까?'
            );
            if (!confirmLeave) return;
        }

        router.push(targetPath);
    }, [isDirty, router]);

    return { handleBack };
}
