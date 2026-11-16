import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useModel } from '@/modules/chat/hooks/useModel';
import { useModelStore } from '@/modules/chat/stores/useModelStore';
import { API_ROUTE, mockApiError } from '@/test/api';
import { server } from '@/test/msw';
import { renderHookWithQueryClient } from '@/test/render';

beforeEach(() => {
  useModelStore.setState({ selectedModel: 'gpt-4o-mini' });
});

describe('useModel', () => {
  it('exposes the selected model and its setter', () => {
    const { result } = renderHookWithQueryClient(() => useModel());

    expect(result.current.selectedModel).toBe('gpt-4o-mini');

    act(() => result.current.setSelectedModel('gpt-4o'));

    expect(result.current.selectedModel).toBe('gpt-4o');
  });

  it("falls back to the catalog's default when the pick is not in the catalog", async () => {
    useModelStore.setState({ selectedModel: 'retired-model' });

    const { result } = renderHookWithQueryClient(() => useModel());

    await waitFor(() => expect(result.current.selectedModel).toBe('gpt-4o-mini'));
  });

  it('keeps the pick while the catalog has not loaded or fails', async () => {
    server.use(mockApiError('get', API_ROUTE.models, 500));
    useModelStore.setState({ selectedModel: 'retired-model' });

    const { result, queryClient } = renderHookWithQueryClient(() => useModel());

    expect(result.current.selectedModel).toBe('retired-model');
    await waitFor(() => expect(queryClient.isFetching()).toBe(0));
    expect(result.current.selectedModel).toBe('retired-model');
  });
});
