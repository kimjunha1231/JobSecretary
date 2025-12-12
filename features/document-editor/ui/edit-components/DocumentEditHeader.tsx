import { Building2, Calendar, Save, X } from 'lucide-react';
import { SmartTagInput, TooltipButton, TooltipProvider } from '@/shared/ui';
import { Status } from '@/shared/types';
import { DocumentFormState, DocumentEditHeaderProps } from '@/features/document-editor';

const STATUS_LABELS: Record<Status, string> = {
    writing: '작성 중',
    applied: '지원 완료',
    interview: '면접 진행 중',
    pass: '합격',
    fail: '불합격'
};

const STATUS_BADGE_CLASSES: Record<Status, string> = {
    writing: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    applied: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    interview: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    pass: 'bg-green-500/10 text-green-400 border-green-500/20',
    fail: 'bg-red-500/10 text-red-400 border-red-500/20'
};

export function DocumentEditHeader({
    form,
    onUpdateField,
    onCancel,
    onSave
}: DocumentEditHeaderProps) {
    return (
        <div className="flex items-start justify-between">
            <div className="flex-1 mr-8">
                <div className="space-y-4">
                    <div className="flex flex-col gap-1 w-full">
                        <div className="flex items-center gap-2 text-zinc-400">
                            <Building2 size={18} />
                            <input
                                type="text"
                                value={form.company}
                                onChange={e => onUpdateField('company', e.target.value)}
                                className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none w-full max-w-xs"
                                placeholder="회사명"
                            />
                            <span className={`text-xs px-2 py-1 rounded-full border ${STATUS_BADGE_CLASSES[form.status]}`}>
                                {STATUS_LABELS[form.status]}
                            </span>
                        </div>
                        <p className="text-xs text-zinc-500 pl-6">
                            상태는 지원 현황 칸반에서만 변경할 수 있습니다.
                        </p>
                    </div>
                    <input
                        type="text"
                        value={form.role}
                        onChange={e => onUpdateField('role', e.target.value)}
                        className="text-4xl font-bold text-white bg-zinc-900 border border-zinc-700 rounded px-2 py-1 focus:border-primary focus:outline-none w-full"
                        placeholder="지원 직무"
                    />
                    <input
                        type="url"
                        value={form.jobPostUrl}
                        onChange={e => onUpdateField('jobPostUrl', e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none text-sm"
                        placeholder="채용 공고 링크 (선택)"
                    />
                    <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-zinc-400" />
                        <input
                            type="date"
                            value={form.deadline}
                            onChange={e => onUpdateField('deadline', e.target.value)}
                            className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-white focus:border-primary focus:outline-none text-sm [color-scheme:dark]"
                        />
                    </div>
                    <SmartTagInput
                        tags={form.tags}
                        onChange={tags => onUpdateField('tags', tags)}
                        placeholder="태그 입력..."
                        className="bg-zinc-900 border-zinc-700"
                    />
                </div>
            </div>

            <div className="flex gap-2">
                <TooltipProvider>
                    <TooltipButton
                        icon={<X size={20} />}
                        tooltip="취소"
                        onClick={onCancel}
                        className="text-zinc-400 hover:text-white hover:bg-white/10"
                    />
                    <TooltipButton
                        icon={<Save size={20} />}
                        tooltip="저장"
                        onClick={onSave}
                        className="bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20"
                    />
                </TooltipProvider>
            </div>
        </div>
    );
}
