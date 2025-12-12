import React from 'react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
    itemsPerPage: number;
    setItemsPerPage: (items: number) => void;
}

export const PaginationControls = ({
    currentPage,
    totalPages,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage
}: PaginationControlsProps) => {
    if (totalPages <= 1) return null;

    return (
        <div className="flex flex-col items-center gap-4 mt-8">
            <div className="flex justify-center items-center gap-2">
                <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors text-xs"
                >
                    {'<<'}
                </button>
                <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                >
                    이전
                </button>
                <div className="flex gap-1">
                    {(() => {
                        const maxVisible = 5;
                        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

                        if (endPage - startPage + 1 < maxVisible) {
                            startPage = Math.max(1, endPage - maxVisible + 1);
                        }

                        return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i).map(page => (
                            <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded flex items-center justify-center text-sm transition-colors ${currentPage === page
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                            >
                                {page}
                            </button>
                        ));
                    })()}
                </div>
                <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors"
                >
                    다음
                </button>
                <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="px-2 py-1 rounded bg-zinc-800 text-zinc-400 disabled:opacity-50 hover:bg-zinc-700 transition-colors text-xs"
                >
                    {'>>'}
                </button>
            </div>

            <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">페이지당 보기:</span>
                <input
                    type="number"
                    min="1"
                    value={itemsPerPage}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val > 0) {
                            setItemsPerPage(val);
                        }
                    }}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs rounded px-2 py-1 w-16 text-center focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-zinc-500">개</span>
            </div>
        </div>
    );
};
