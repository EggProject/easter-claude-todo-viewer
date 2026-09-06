import { describe, it, expect } from 'vitest';
import {
  numericNodeId,
  disconnectedColumnCount,
  packDisconnectedNodes,
} from './flow-layout.js';

describe('flow-layout module', () => {
  describe('numericNodeId', () => {
    it('returns numeric taskId when finite number or numeric string', () => {
      expect(numericNodeId({ data: { taskId: 42 } })).toBe(42);
      expect(numericNodeId({ data: { taskId: '123' } })).toBe(123);
    });

    it('returns Number.MAX_SAFE_INTEGER when taskId is missing, NaN or invalid', () => {
      expect(numericNodeId({ data: { taskId: 'abc' } })).toBe(Number.MAX_SAFE_INTEGER);
      expect(numericNodeId({ data: {} })).toBe(Number.MAX_SAFE_INTEGER);
      expect(numericNodeId(null)).toBe(Number.MAX_SAFE_INTEGER);
      expect(numericNodeId(undefined)).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  describe('disconnectedColumnCount', () => {
    it('returns 0 when count is 0 or falsy', () => {
      expect(disconnectedColumnCount(1600, 0)).toBe(0);
      expect(disconnectedColumnCount(1600, null)).toBe(0);
    });

    it('uses fallback canvas width when canvasWidth is falsy', () => {
      const cols = disconnectedColumnCount(0, 5);
      expect(cols).toBeGreaterThanOrEqual(1);
    });

    it('uses nodeWidth when canvasWidth is smaller than nodeWidth', () => {
      const cols = disconnectedColumnCount(100, 6, 340, 100);
      expect(cols).toBe(4);
    });

    it('clamps column count between 1 and 8', () => {
      expect(disconnectedColumnCount(2000, 1)).toBe(1);
      expect(disconnectedColumnCount(10000, 20)).toBe(8);
      expect(disconnectedColumnCount(1600, 6)).toBe(4);
    });

    it('uses default nodeWidth and columnGap when omitted', () => {
      expect(disconnectedColumnCount(2000, 5)).toBe(4);
    });
  });

  describe('packDisconnectedNodes', () => {
    it('returns copy of connectedNodes when disconnectedNodes is empty', () => {
      const connected = [{ id: '1', position: { x: 0, y: 0 } }];
      const result = packDisconnectedNodes(connected, []);
      expect(result).toEqual(connected);
      expect(result).not.toBe(connected);
    });

    it('packs disconnected nodes when connectedNodes is empty', () => {
      const disconnected = [
        { id: 'b', data: { taskId: 2 } },
        { id: 'a', data: { taskId: 1 } },
      ];
      const result = packDisconnectedNodes([], disconnected, 1600);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
      expect(result[0].position).toEqual({ x: 0, y: 0 });
      expect(result[1].id).toBe('b');
      expect(result[1].position.x).toBeGreaterThan(0);
    });

    it('sorts disconnected nodes by taskId and falls back to string id', () => {
      const disconnected = [
        { id: 'node-z', data: { taskId: 'same' } },
        { id: 'node-a', data: { taskId: 'same' } },
        { id: 'node-1', data: { taskId: 1 } },
      ];
      const result = packDisconnectedNodes([], disconnected);
      expect(result[0].id).toBe('node-1');
      expect(result[1].id).toBe('node-a');
      expect(result[2].id).toBe('node-z');
    });

    it('positions disconnected nodes to the right of existing connected nodes', () => {
      const connected = [
        { id: 'c1', position: { x: 100, y: 50 } },
        { id: 'c2', position: { x: 300, y: 20 } },
      ];
      const disconnected = [
        { id: 'd1', data: { taskId: 10 } },
        { id: 'd2', data: { taskId: 20 } },
      ];
      const options = {
        nodeWidth: 200,
        nodeHeight: 100,
        columnGap: 50,
        rowGap: 50,
      };
      const result = packDisconnectedNodes(connected, disconnected, 1600, options);
      expect(result).toHaveLength(4);
      // rightEdge = 300 + 200 = 500, startX = 500 + 260 = 760
      const d1 = result.find(n => n.id === 'd1');
      expect(d1.position.x).toBe(760);
      expect(d1.position.y).toBe(20);
    });

    it('handles connected nodes with missing position coordinates', () => {
      const connected = [{ id: 'c1', position: null }, { id: 'c2' }];
      const disconnected = [{ id: 'd1', data: { taskId: 1 } }];
      const result = packDisconnectedNodes(connected, disconnected);
      expect(result).toHaveLength(3);
      expect(result[2].position.x).toBe(600); // rightEdge = 0 + 340 = 340; startX = 340 + 260 = 600
    });
  });
});
