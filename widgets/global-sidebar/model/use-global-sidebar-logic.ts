import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/entities/user'; // AuthStore will be moved later, but for now referencing existing one

export const useGlobalSidebarLogic = (onClose: () => void) => {
    const router = useRouter();
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const { user, isLoading, signInWithGoogle, signOut, showAlert } = useAuth();

    const handleDeleteAccount = async () => {
        try {
            const response = await fetch('/api/account/delete', {
                method: 'DELETE',
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to delete account');
            }

            showAlert('회원 탈퇴가 완료되었습니다. 모든 데이터가 삭제되었습니다.', 'success');
            setIsDeleteModalOpen(false);
            router.refresh();

            setTimeout(() => {
                router.push('/');
            }, 1500);
        } catch (error) {

            showAlert('회원 탈퇴 중 오류가 발생했습니다.', 'error');
            setIsDeleteModalOpen(false);
        }
    };

    return {
        router,
        isDeleteModalOpen,
        setIsDeleteModalOpen,
        user,
        isLoading,
        signInWithGoogle,
        signOut,
        handleDeleteAccount,
        handleOverlayClick: () => onClose()
    };
};
