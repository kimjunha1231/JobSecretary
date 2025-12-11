import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "default" | "secondary" | "destructive" | "outline" | "success" | "pending" | "fail"
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
    const variants = {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success: "border-transparent bg-green-500/15 text-green-500 hover:bg-green-500/25 border-green-500/20",
        pending: "border-transparent bg-yellow-500/15 text-yellow-500 hover:bg-yellow-500/25 border-yellow-500/20",
        fail: "border-transparent bg-red-500/15 text-red-500 hover:bg-red-500/25 border-red-500/20",
    }

    const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    const variantStyles = variants[variant] || variants.default

    return (
        <div className={`${baseStyles} ${variantStyles} ${className}`} {...props} />
    )
}

export { Badge }
