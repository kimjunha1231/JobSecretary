import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/shared/lib/utils';

interface TooltipButtonProps {
    icon: ReactNode;
    tooltip: string;
    onClick?: () => void;
    className?: string;
    disabled?: boolean;
}

export function TooltipButton({ icon, tooltip, onClick, className, disabled }: TooltipButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    onClick={onClick}
                    disabled={disabled}
                    className={cn(
                        "p-3 transition-all rounded-xl",
                        disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                >
                    {icon}
                </button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{tooltip}</p>
            </TooltipContent>
        </Tooltip>
    );
}
