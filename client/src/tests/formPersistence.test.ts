/**
 * Tests for client/src/utils/formPersistence.ts
 *
 * These are pure sessionStorage read/write helpers — no React involved,
 * no window.api calls, no mocking required beyond what jsdom already gives us.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveFormState,
  loadFormState,
  clearFormState,
} from '../utils/formPersistence';

beforeEach(() => {
  sessionStorage.clear();
});

describe('saveFormState', () => {
  it('serialises the value and writes it to sessionStorage with the correct key', () => {
    saveFormState('myForm', { name: 'Alice', age: 30 });
    expect(sessionStorage.getItem('formData_myForm')).toBe(
      JSON.stringify({ name: 'Alice', age: 30 })
    );
  });

  it('handles string values', () => {
    saveFormState('test', 'hello');
    expect(sessionStorage.getItem('formData_test')).toBe('"hello"');
  });

  it('handles number values', () => {
    saveFormState('num', 42);
    expect(sessionStorage.getItem('formData_num')).toBe('42');
  });

  it('handles array values', () => {
    saveFormState('arr', [1, 2, 3]);
    expect(sessionStorage.getItem('formData_arr')).toBe('[1,2,3]');
  });

  it('does not throw when sessionStorage is unavailable', () => {
    // Simulate a broken sessionStorage by spying on setItem to throw
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveFormState('key', { x: 1 })).not.toThrow();
    spy.mockRestore();
  });
});

describe('loadFormState', () => {
  it('returns the parsed object from sessionStorage', () => {
    sessionStorage.setItem('formData_form1', JSON.stringify({ foo: 'bar' }));
    expect(loadFormState('form1')).toEqual({ foo: 'bar' });
  });

  it('returns null when the key does not exist', () => {
    expect(loadFormState('nonexistent')).toBeNull();
  });

  it('returns null when the stored value is malformed JSON', () => {
    sessionStorage.setItem('formData_bad', 'not-json{{{{');
    expect(loadFormState('bad')).toBeNull();
  });

  it('infers the generic type correctly', () => {
    sessionStorage.setItem('formData_typed', JSON.stringify({ count: 5 }));
    const result = loadFormState<{ count: number }>('typed');
    expect(result?.count).toBe(5);
  });
});

describe('clearFormState', () => {
  it('removes the key from sessionStorage', () => {
    sessionStorage.setItem('formData_toClear', 'data');
    clearFormState('toClear');
    expect(sessionStorage.getItem('formData_toClear')).toBeNull();
  });

  it('does not throw when the key does not exist', () => {
    expect(() => clearFormState('neverSet')).not.toThrow();
  });

  it('does not throw when sessionStorage.removeItem throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    expect(() => clearFormState('key')).not.toThrow();
    spy.mockRestore();
  });
});
