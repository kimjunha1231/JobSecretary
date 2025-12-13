'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';

interface SidebarItemProps {
    to: string;
    icon: React.ReactNode;
    label: string;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({ to, icon, label }) => {
    const pathname = usePathname();
    const isActive = pathname === to;

    return (
        <Link
            href={to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative ${isActive
                ? 'text-white bg-white/5 shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/5'
                } `}
        >
            <span className={`${isActive ? 'text-primary' : 'text-zinc-500 group-hover:text-zinc-300'} `}>
                {icon}
            </span>
            <span className="whitespace-nowrap overflow-hidden">{label}</span>
            {isActive && (
                <motion.div
                    layoutId="activeTab"
                    className="absolute left-0 w-1 h-5 bg-primary rounded-r-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                />
            )}
        </Link>
    );
};
