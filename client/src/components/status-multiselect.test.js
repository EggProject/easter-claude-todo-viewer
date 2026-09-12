import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  STATUS_OPTIONS,
  normalizeStatusSelection,
  StatusMultiSelect,
} from './status-multiselect.js';

describe('status-multiselect module', () => {
  describe('normalizeStatusSelection', () => {
    it('returns all status options when value is empty or includes all', () => {
      expect(normalizeStatusSelection('')).toEqual(
        new Set(['in_progress', 'pending', 'completed', 'deleted']),
      );
      expect(normalizeStatusSelection(null)).toEqual(
        new Set(['in_progress', 'pending', 'completed', 'deleted']),
      );
      expect(normalizeStatusSelection('all')).toEqual(
        new Set(['in_progress', 'pending', 'completed', 'deleted']),
      );
    });

    it('returns filtered set for valid status list', () => {
      const result = normalizeStatusSelection('in_progress,completed');
      expect(result).toEqual(new Set(['in_progress', 'completed']));
    });

    it('falls back to in_progress if no valid status is selected', () => {
      const result = normalizeStatusSelection('invalid_status,another_bad');
      expect(result).toEqual(new Set(['in_progress']));
    });
  });

  describe('StatusMultiSelect component', () => {
    it('renders with all selected and toggles all checkbox off', () => {
      const onChange = vi.fn();
      render(React.createElement(StatusMultiSelect, { value: 'all', onChange }));

      const button = screen.getByRole('button', { name: /Status · All/ });
      expect(button).toBeDefined();

      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeDefined();

      const allCheckbox = screen.getByLabelText('All');
      expect(allCheckbox.checked).toBe(true);

      fireEvent.click(allCheckbox);
      expect(onChange).toHaveBeenCalledWith(new Set());
    });

    it('renders partial selection and toggles master checkbox on', () => {
      const onChange = vi.fn();
      const value = new Set(['pending']);
      render(React.createElement(StatusMultiSelect, { value, onChange }));

      const button = screen.getByRole('button', { name: /Status · 1 selected/ });
      fireEvent.click(button);

      const allCheckbox = screen.getByLabelText('All');
      expect(allCheckbox.checked).toBe(false);

      fireEvent.click(allCheckbox);
      expect(onChange).toHaveBeenCalledWith(
        new Set(['in_progress', 'pending', 'completed', 'deleted']),
      );
    });

    it('toggles individual status checkboxes on and off', () => {
      const onChange = vi.fn();
      const value = new Set(['pending']);
      render(React.createElement(StatusMultiSelect, { value, onChange }));

      fireEvent.click(screen.getByRole('button', { name: /Status · 1 selected/ }));

      // Add in_progress
      const inProgressLabel = screen.getByText('🚀 In progress');
      fireEvent.click(inProgressLabel);
      expect(onChange).toHaveBeenCalledWith(new Set(['pending', 'in_progress']));

      // Remove pending
      const pendingLabel = screen.getByText('⏳ Pending');
      fireEvent.click(pendingLabel);
      expect(onChange).toHaveBeenCalledWith(new Set());
    });

    it('closes menu on outside click and Escape key', () => {
      const onChange = vi.fn();
      const { unmount } = render(
        React.createElement(StatusMultiSelect, { value: 'all', onChange }),
      );

      const button = screen.getByRole('button', { name: /Status · All/ });
      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeDefined();

      // Non-escape key does not close menu
      fireEvent.keyDown(window, { key: 'Tab' });
      expect(screen.getByRole('menu')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();

      fireEvent.click(button);
      expect(screen.getByRole('menu')).toBeDefined();

      // Click inside root does not close menu
      fireEvent.mouseDown(screen.getByRole('menu'));
      expect(screen.getByRole('menu')).toBeDefined();

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu')).toBeNull();

      unmount();
    });
  });
});
