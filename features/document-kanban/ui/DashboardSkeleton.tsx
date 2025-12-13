export function DashboardSkeleton() {
    return (
        <div className="flex h-full gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {Array.from({ length: 5 }).map((_, index) => (
                <div
                    key={index}
                    className="flex-shrink-0 w-80 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 flex flex-col h-full animate-pulse"
                >
                    {/* Column Header Skeleton */}
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-zinc-700" />
                            <div className="h-4 w-24 bg-zinc-700 rounded" />
                        </div>
                        <div className="h-5 w-8 bg-zinc-800 rounded" />
                    </div>

                    {/* Column Body - Card Skeletons */}
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, cardIndex) => (
                            <div
                                key={cardIndex}
                                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 h-[100px]"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-lg bg-zinc-800" />
                                    <div className="flex-1 space-y-2">
                                        <div className="h-3 w-3/4 bg-zinc-800 rounded" />
                                        <div className="h-2 w-1/2 bg-zinc-800/50 rounded" />
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-4">
                                    <div className="h-5 w-12 bg-zinc-800 rounded" />
                                    <div className="h-3 w-16 bg-zinc-800 rounded" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Add Button Skeleton */}
                    <div className="mt-3 w-full py-2 bg-zinc-800/30 rounded-lg border border-dashed border-zinc-800" />
                </div>
            ))}
        </div>
    );
}
