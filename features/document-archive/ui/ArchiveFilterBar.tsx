import { DateRangeFilter } from '@/shared/ui';
import { ArchiveFilterBarProps } from '../types';
import { StatusFilterGroup } from './filters/StatusFilterGroup';
import { TagFilterGroup } from './filters/TagFilterGroup';
import { SearchFilter } from './filters/SearchFilter';

export const ArchiveFilterBar = (props: ArchiveFilterBarProps) => {
    const {
        statusFilter, setStatusFilter,
        screeningFilter, setScreeningFilter,
        favoriteFilter, setFavoriteFilter,
        allTags, selectedTags, toggleTag,
        searchTerm, setSearchTerm,
        startDate, setStartDate,
        endDate, setEndDate,
    } = props;

    return (
        <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <StatusFilterGroup
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                    screeningFilter={screeningFilter}
                    setScreeningFilter={setScreeningFilter}
                    favoriteFilter={favoriteFilter}
                    setFavoriteFilter={setFavoriteFilter}
                />

                <DateRangeFilter
                    startDate={startDate}
                    endDate={endDate}
                    onStartDateChange={setStartDate}
                    onEndDateChange={setEndDate}
                    onClear={() => {
                        setStartDate('');
                        setEndDate('');
                    }}
                />
            </div>
            <TagFilterGroup
                allTags={allTags}
                selectedTags={selectedTags}
                toggleTag={toggleTag}
            />
            <SearchFilter
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
        </div>
    );
};
