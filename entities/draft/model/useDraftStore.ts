import { create } from 'zustand';
import { DraftState } from './types';

export const useDraftStore = create<DraftState>()((set) => ({
    // UI State
    searchTags: [],
    searchResults: [],
    isSearching: false,

    // Actions
    setSearchTags: (tags) => set({ searchTags: tags }),
    setSearchResults: (docs) => set({ searchResults: docs }),
    setIsSearching: (isSearching) => set({ isSearching }),
}));
