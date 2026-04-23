'use client';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-10 h-10 border-3'
};

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
    return (
        <div
            className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin ${className}`}
        />
    );
}
