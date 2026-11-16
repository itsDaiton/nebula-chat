import { beforeEach, describe, expect, it } from 'vitest';
import {
  FAVORITE_MODELS_STORAGE_KEY,
  useFavoriteModelsStore,
} from '@/modules/chat/stores/useFavoriteModelsStore';

describe('useFavoriteModelsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoriteModelsStore.setState({ favorites: [] });
  });

  it('starts with no favorites', () => {
    expect(useFavoriteModelsStore.getState().favorites).toEqual([]);
  });

  it('toggles a Model on, keeping the order it was favorited in', () => {
    const { toggleFavorite } = useFavoriteModelsStore.getState();

    toggleFavorite('gpt-5');
    toggleFavorite('gpt-4o');

    expect(useFavoriteModelsStore.getState().favorites).toEqual(['gpt-5', 'gpt-4o']);
  });

  it('toggles a favorite off without disturbing the others', () => {
    useFavoriteModelsStore.setState({ favorites: ['gpt-5', 'gpt-4o', 'gpt-4.1'] });

    useFavoriteModelsStore.getState().toggleFavorite('gpt-4o');

    expect(useFavoriteModelsStore.getState().favorites).toEqual(['gpt-5', 'gpt-4.1']);
  });

  it('remembers favorites in localStorage', () => {
    useFavoriteModelsStore.getState().toggleFavorite('gpt-5');

    const stored = JSON.parse(localStorage.getItem(FAVORITE_MODELS_STORAGE_KEY) ?? '{}');
    expect(stored.state.favorites).toEqual(['gpt-5']);
  });
});
