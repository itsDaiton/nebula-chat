import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { FavoriteModelsState } from '@/modules/chat/types/types';
import { safeStorage } from '@/shared/utils/safeStorage';

export const FAVORITE_MODELS_STORAGE_KEY = 'nebula-favorite-models';

export const useFavoriteModelsStore = create<FavoriteModelsState>()(
  persist(
    (set) => ({
      favorites: [],
      toggleFavorite: (modelId) =>
        set((state) => ({
          favorites: state.favorites.includes(modelId)
            ? state.favorites.filter((id) => id !== modelId)
            : [...state.favorites, modelId],
        })),
    }),
    { name: FAVORITE_MODELS_STORAGE_KEY, storage: createJSONStorage(() => safeStorage) },
  ),
);
