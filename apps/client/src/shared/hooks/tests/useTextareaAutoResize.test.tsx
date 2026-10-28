import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTextareaAutoResize } from '@/shared/hooks/useTextareaAutoResize';
import { useSearchStore } from '@/shared/stores/useSearchStore';

beforeEach(() => {
  vi.clearAllMocks();
  useSearchStore.setState({ isSearchOpen: false });
});

describe('useTextareaAutoResize', () => {
  it('sets an explicit height on mount', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);

    renderHook(() => useTextareaAutoResize({ current: textarea }));

    expect(textarea.style.height).toMatch(/px$/);
    textarea.remove();
  });

  it('tolerates a null ref', () => {
    expect(() => renderHook(() => useTextareaAutoResize({ current: null } as never))).not.toThrow();
  });

  it('recomputes on input', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    renderHook(() => useTextareaAutoResize({ current: textarea }));

    act(() => {
      textarea.dispatchEvent(new Event('input'));
    });

    expect(textarea.style.height).toMatch(/px$/);
    textarea.remove();
  });
});
