/**
 * Tests for client/src/hooks/useAutoSave.ts
 *
 * Uses renderHook + act from @testing-library/react.
 * sessionStorage is cleared before each test.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAutoSave } from '../hooks/useAutoSave';
import { loadFormState } from '../utils/formPersistence';

beforeEach(() => {
  sessionStorage.clear();
});

describe('useAutoSave', () => {
  it('does NOT write to sessionStorage on the very first render', () => {
    renderHook(() => useAutoSave('firstRender', { name: 'Alice' }));
    expect(sessionStorage.getItem('formData_firstRender')).toBeNull();
  });

  it('saves to sessionStorage after the data changes on subsequent renders', () => {
    const { rerender } = renderHook(
      ({ data }: { data: unknown }) => useAutoSave('myKey', data),
      { initialProps: { data: { name: 'Alice' } } }
    );

    // First render — nothing saved yet
    expect(loadFormState('myKey')).toBeNull();

    // Trigger a state update → should now save
    act(() => {
      rerender({ data: { name: 'Bob' } });
    });

    expect(loadFormState('myKey')).toEqual({ name: 'Bob' });
  });

  it('updates sessionStorage each time data changes', () => {
    const { rerender } = renderHook(
      ({ data }: { data: unknown }) => useAutoSave('counter', data),
      { initialProps: { data: { count: 0 } } }
    );

    act(() => { rerender({ data: { count: 1 } }); });
    expect(loadFormState<{ count: number }>('counter')?.count).toBe(1);

    act(() => { rerender({ data: { count: 2 } }); });
    expect(loadFormState<{ count: number }>('counter')?.count).toBe(2);
  });

  it('does nothing when key is null', () => {
    const { rerender } = renderHook(
      ({ data }: { data: unknown }) => useAutoSave(null, data),
      { initialProps: { data: { name: 'Alice' } } }
    );
    act(() => { rerender({ data: { name: 'Bob' } }); });
    // sessionStorage should remain untouched
    expect(sessionStorage.length).toBe(0);
  });

  it('clear() removes the saved state from sessionStorage', () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: unknown }) => useAutoSave('toClear', data),
      { initialProps: { data: { step: 1 } } }
    );

    act(() => { rerender({ data: { step: 2 } }); });
    expect(loadFormState('toClear')).not.toBeNull();

    act(() => { result.current.clear(); });
    expect(loadFormState('toClear')).toBeNull();
  });

  it('clear() resets the first-render guard so next save is skipped again', () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: unknown }) => useAutoSave('guardReset', data),
      { initialProps: { data: { v: 1 } } }
    );

    // Trigger one save so data is stored
    act(() => { rerender({ data: { v: 2 } }); });
    expect(loadFormState('guardReset')).toEqual({ v: 2 });

    // Clear — wipes storage AND resets first-render guard
    act(() => { result.current.clear(); });
    expect(loadFormState('guardReset')).toBeNull();

    // The next rerender should behave like a "first render" again — no save
    act(() => { rerender({ data: { v: 3 } }); });
    // Still null because guard prevents saving on the first render post-clear
    expect(loadFormState('guardReset')).toBeNull();
  });
});
