'use client';

import dynamic from 'next/dynamic';
import { DashboardSkeleton } from './dashboard-skeleton';

const DashboardBoard = dynamic(() => import('@/widgets').then(mod => mod.DashboardBoard), {
    loading: () => <DashboardSkeleton />,
    ssr: false
});

export function DashboardBoardLazy() {
    return <DashboardBoard />;
}
