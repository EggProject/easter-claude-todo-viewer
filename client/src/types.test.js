import { describe, it, expect } from 'vitest';
import {
  isRecord,
  isString,
  isNumber,
  isTask,
  isSession,
  isTranslationJob,
  isPrompt,
  errorMessage,
} from './types.js';

describe('types typeguards', () => {
  describe('isRecord', () => {
    it('returns true for plain objects and records', () => {
      expect(isRecord({})).toBe(true);
      expect(isRecord({ key: 'val' })).toBe(true);
    });

    it('returns false for non-records, arrays, and null/undefined', () => {
      expect(isRecord(null)).toBe(false);
      expect(isRecord(undefined)).toBe(false);
      expect(isRecord([])).toBe(false);
      expect(isRecord('string')).toBe(false);
      expect(isRecord(123)).toBe(false);
      expect(isRecord(true)).toBe(false);
    });
  });

  describe('isString', () => {
    it('returns true for string values', () => {
      expect(isString('hello')).toBe(true);
      expect(isString('')).toBe(true);
    });

    it('returns false for non-string values', () => {
      expect(isString(null)).toBe(false);
      expect(isString(undefined)).toBe(false);
      expect(isString(123)).toBe(false);
      expect(isString({})).toBe(false);
      expect(isString(true)).toBe(false);
    });
  });

  describe('isNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isNumber(0)).toBe(true);
      expect(isNumber(42)).toBe(true);
      expect(isNumber(-3.14)).toBe(true);
    });

    it('returns false for non-numbers, NaN, and infinities', () => {
      expect(isNumber(NaN)).toBe(false);
      expect(isNumber(Infinity)).toBe(false);
      expect(isNumber(-Infinity)).toBe(false);
      expect(isNumber('42')).toBe(false);
      expect(isNumber(null)).toBe(false);
      expect(isNumber(undefined)).toBe(false);
      expect(isNumber({})).toBe(false);
    });
  });

  describe('isTask', () => {
    const validTask = {
      uid: 'task-uid',
      id: 'task-1',
      sessionId: 'sess-1',
      status: 'pending',
      subject: 'Task subject',
    };

    it('returns true for valid task object', () => {
      expect(isTask(validTask)).toBe(true);
    });

    it('returns false for non-records', () => {
      expect(isTask(null)).toBe(false);
      expect(isTask(undefined)).toBe(false);
      expect(isTask('not-a-task')).toBe(false);
      expect(isTask(123)).toBe(false);
    });

    it('returns false when required task fields are missing or wrong type', () => {
      expect(isTask({ ...validTask, uid: 123 })).toBe(false);
      expect(isTask({ ...validTask, id: null })).toBe(false);
      expect(isTask({ ...validTask, sessionId: undefined })).toBe(false);
      expect(isTask({ ...validTask, status: false })).toBe(false);
      expect(isTask({ ...validTask, subject: {} })).toBe(false);
    });
  });

  describe('isSession', () => {
    const validSession = {
      id: 'sess-1',
      label: 'Main Session',
    };

    it('returns true for valid session object', () => {
      expect(isSession(validSession)).toBe(true);
    });

    it('returns false for non-records', () => {
      expect(isSession(null)).toBe(false);
      expect(isSession(undefined)).toBe(false);
      expect(isSession('sess-1')).toBe(false);
      expect(isSession(123)).toBe(false);
    });

    it('returns false when id is missing or not a string', () => {
      expect(isSession({})).toBe(false);
      expect(isSession({ id: 123 })).toBe(false);
      expect(isSession({ id: null })).toBe(false);
    });
  });

  describe('isTranslationJob', () => {
    const validJob = {
      id: 'job-1',
      sessionId: 'sess-1',
      status: 'completed',
    };

    it('returns true for valid translation job object', () => {
      expect(isTranslationJob(validJob)).toBe(true);
    });

    it('returns false for non-records', () => {
      expect(isTranslationJob(null)).toBe(false);
      expect(isTranslationJob(undefined)).toBe(false);
      expect(isTranslationJob('job-1')).toBe(false);
      expect(isTranslationJob(123)).toBe(false);
    });

    it('returns false when required job fields are missing or wrong type', () => {
      expect(isTranslationJob({ ...validJob, id: 123 })).toBe(false);
      expect(isTranslationJob({ ...validJob, sessionId: null })).toBe(false);
      expect(isTranslationJob({ ...validJob, status: undefined })).toBe(false);
    });
  });

  describe('isPrompt', () => {
    const validPrompt = {
      id: 'prompt-1',
      body: 'Hello prompt',
    };

    it('returns true for valid prompt object', () => {
      expect(isPrompt(validPrompt)).toBe(true);
    });

    it('returns false for non-records', () => {
      expect(isPrompt(null)).toBe(false);
      expect(isPrompt(undefined)).toBe(false);
      expect(isPrompt('prompt-1')).toBe(false);
      expect(isPrompt(123)).toBe(false);
    });

    it('returns false when id is missing or not a string', () => {
      expect(isPrompt({})).toBe(false);
      expect(isPrompt({ id: 123 })).toBe(false);
      expect(isPrompt({ id: null })).toBe(false);
    });
  });

  describe('errorMessage', () => {
    it('extracts message from Error instances and formats non-Error values as string', () => {
      expect(errorMessage(new Error('test error'))).toBe('test error');
      expect(errorMessage('string error')).toBe('string error');
    });
  });
});
