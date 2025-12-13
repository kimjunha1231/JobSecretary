import { useAuth } from '@/entities/user';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export const useLoginBoardLogic = () => {
    const { user, signInWithGoogle, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (user && !isLoading) {
            router.push('/archive');
        }
    }, [user, isLoading, router]);

    return {
        user,
        isLoading,
        signInWithGoogle
    };
};
