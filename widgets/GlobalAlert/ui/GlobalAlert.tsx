'use client';


import { useAuth } from '@/entities/user';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui';
import { CheckCircle2, XCircle } from 'lucide-react';

export const GlobalAlert = () => {
    const { alert, hideAlert } = useAuth();

    if (!alert.message) return null;

    const isSuccess = alert.type === 'success';

    return (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in fade-in slide-in-from-top-4 duration-300">
            <Alert
                variant={isSuccess ? 'default' : 'destructive'}
                className={`${isSuccess ? 'border-green-500/50 text-green-500 bg-green-500/10' : ''} shadow-lg backdrop-blur-sm`}
            >
                {isSuccess ? (
                    <CheckCircle2 className="h-4 w-4" color={isSuccess ? '#22c55e' : undefined} />
                ) : (
                    <XCircle className="h-4 w-4" />
                )}
                <AlertTitle>{isSuccess ? '성공' : '오류'}</AlertTitle>
                <AlertDescription>
                    {alert.message}
                </AlertDescription>
            </Alert>
        </div>
    );
};

