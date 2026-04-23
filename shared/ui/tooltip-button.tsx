import { ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { cn } from '@/shared/lib/utils';

interface TooltipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    tooltip: string;
}

export function TooltipButton({ icon, tooltip, className, ...props }: TooltipButtonProps) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    className={cn(
                        "p-3 transition-all rounded-xl",
                        props.disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                    {...props}
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
