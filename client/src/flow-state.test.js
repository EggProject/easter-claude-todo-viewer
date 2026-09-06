import { describe, it, expect } from 'vitest';
import { semanticGraphRevision, reconcileSemanticNodes } from './flow-state.js';

describe('flow-state module', () => {
  describe('semanticGraphRevision', () => {
    it('generates deterministic JSON revision for tasks in sessions', () => {
      const groups = new Map([
        [
          'sess-1',
          {
            tasks: [
              {
                uid: 's1:1',
                id: '1',
                status: 'pending',
                subject: 'Task 1',
                description: 'Desc 1',
                owner: 'dev',
                blockedBy: ['2'],
                blocks: ['3'],
                viewLanguage: 'hu',
                effectiveLanguage: 'en',
                translationState: 'queued',
              },
            ],
          },
        ],
      ]);

      const rev = semanticGraphRevision(groups, ['sess-1'], 'topo');
      const parsed = JSON.parse(rev);
      expect(parsed.sort).toBe('topo');
      expect(parsed.payload).toHaveLength(1);
      expect(parsed.payload[0][0]).toBe('sess-1');
      expect(parsed.payload[0][1][0].uid).toBe('s1:1');
    });

    it('handles sessions with no tasks or undefined group safely', () => {
      const groups = new Map([
        ['sess-empty', { tasks: null }],
        ['sess-partial', { tasks: [{ uid: 'p:1', id: '1' }] }],
      ]);

      const rev = semanticGraphRevision(groups, ['sess-empty', 'sess-missing', 'sess-partial'], 'asc');
      const parsed = JSON.parse(rev);
      expect(parsed.payload[0][1]).toEqual([]);
      expect(parsed.payload[1][1]).toEqual([]);
      expect(parsed.payload[2][1][0].blockedBy).toEqual([]);
      expect(parsed.payload[2][1][0].blocks).toEqual([]);
    });
  });

  describe('reconcileSemanticNodes', () => {
    it('handles empty or null previous and incoming nodes', () => {
      expect(reconcileSemanticNodes(null, null, null)).toEqual([]);
      expect(reconcileSemanticNodes([], [], {})).toEqual([]);
    });

    it('preserves position of previously placed nodes', () => {
      const previous = [
        { id: 'node-1', position: { x: 100, y: 200 } },
      ];
      const incoming = [
        { id: 'node-1', position: { x: 0, y: 0 }, data: { uid: 'u1' } },
      ];

      const result = reconcileSemanticNodes(previous, incoming, {});
      expect(result[0].position).toEqual({ x: 100, y: 200 });
    });

    it('restores saved position from layouts when available with laneOffset', () => {
      const incoming = [
        {
          id: 'node-new',
          position: { x: 0, y: 0 },
          data: { uid: 'u2', sessionId: 'sess-1', laneOffset: 50 },
        },
      ];
      const layouts = {
        'sess-1': {
          nodes: {
            u2: { x: 300, y: 400 },
          },
        },
      };

      const result = reconcileSemanticNodes([], incoming, layouts);
      expect(result[0].position).toEqual({ x: 300, y: 450 });
    });

    it('restores saved position without laneOffset', () => {
      const incoming = [
        {
          id: 'node-no-offset',
          position: { x: 0, y: 0 },
          data: { uid: 'u3', sessionId: 'sess-1' },
        },
      ];
      const layouts = {
        'sess-1': {
          nodes: {
            u3: { x: 250, y: 350 },
          },
        },
      };

      const result = reconcileSemanticNodes([], incoming, layouts);
      expect(result[0].position).toEqual({ x: 250, y: 350 });
    });

    it('returns incoming node as is when not in previous and no layout matches', () => {
      const incoming = [
        { id: 'node-fresh', position: { x: 5, y: 10 }, data: { uid: 'u4', sessionId: 'sess-x' } },
        { id: 'node-no-data', position: { x: 1, y: 2 } },
      ];

      const result = reconcileSemanticNodes([], incoming, null);
      expect(result[0].position).toEqual({ x: 5, y: 10 });
      expect(result[1].position).toEqual({ x: 1, y: 2 });
    });
  });
});
