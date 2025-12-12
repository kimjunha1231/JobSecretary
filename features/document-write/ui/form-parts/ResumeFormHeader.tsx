import { SmartTagInput } from '@/shared/ui';
import { useDraftStore } from '@/entities/draft';

interface ResumeFormHeaderProps {
    formData: {
        company: string;
        role: string;
        deadline?: string;
        jobPostUrl?: string;
        tags: string[];
    };
    setFormData: (data: Partial<ResumeFormHeaderProps['formData']>) => void;
    setSearchTags: (tags: string[]) => void;
}

export function ResumeFormHeader({ formData, setFormData, setSearchTags }: ResumeFormHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
                    <label className="text-sm text-zinc-400">회사명</label>
                    <input
                        type="text"
                        value={formData.company}
                        onChange={e => setFormData({ company: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="지원 회사"
                    />
                </div>
                <div className="flex flex-col gap-2 flex-1 min-w-[220px]">
                    <label className="text-sm text-zinc-400">직무</label>
                    <input
                        type="text"
                        value={formData.role}
                        onChange={e => setFormData({ role: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="지원 직무"
                    />
                </div>
                <div className="flex flex-col gap-2 flex-[1.4] min-w-[260px]">
                    <label className="text-sm text-zinc-400">마감일 (선택)</label>
                    <input
                        type="date"
                        value={formData.deadline || ''}
                        onChange={e => setFormData({ deadline: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors [color-scheme:dark]"
                    />
                </div>
                <div className="flex flex-col gap-2 flex-[1.4] min-w-[260px]">
                    <label className="text-sm text-zinc-400">채용 공고 링크 (선택)</label>
                    <input
                        type="url"
                        value={formData.jobPostUrl}
                        onChange={e => setFormData({ jobPostUrl: e.target.value })}
                        className="w-full bg-surface border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        placeholder="https://..."
                    />
                </div>
            </div>

            <div>
                <label className="text-sm text-zinc-400 mb-2 block">태그</label>
                <SmartTagInput
                    tags={formData.tags}
                    onChange={tags => {
                        setFormData({ tags });
                        setSearchTags(tags);
                    }}
                    placeholder="태그를 입력하거나 선택하세요 (예: 취미, 성장과정)"
                    className="bg-surface border-white/10"
                />
            </div>
        </div>
    );
}
