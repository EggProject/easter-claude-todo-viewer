import { describe, it, expect } from 'vitest';
import {
  buildGraph,
  lifecycleTime,
  timelineOrder,
  flowNodeClass,
  partitionFlowTasks,
} from './task-graph.js';

describe('task-graph module', () => {
  describe('buildGraph', () => {
    it('handles empty tasks list', () => {
      const graph = buildGraph();
      expect(graph.topo).toEqual([]);
      expect(graph.orderIndex.size).toBe(0);
    });

    it('builds DAG with parents, children, and topological order', () => {
      const tasks = [
        { uid: 's:2', id: '2', storeId: 's', blockedBy: ['1'], status: 'pending' },
        { uid: 's:1', id: '1', storeId: 's', blocks: ['2'], status: 'completed' },
        { uid: 's:3', id: '3', storeId: 's', blockedBy: ['2'], status: 'pending' },
      ];

      const graph = buildGraph(tasks);
      expect(graph.topo.map(t => t.id)).toEqual(['1', '2', '3']);
      expect(graph.parents.get('s:2').has('s:1')).toBe(true);
      expect(graph.children.get('s:1').has('s:2')).toBe(true);
      expect(graph.ready(tasks[0])).toBe(true); // task 2 has completed parent task 1
      expect(graph.ready(tasks[2])).toBe(false); // task 3 has pending parent task 2
    });

    it('ignores self-referencing and missing target dependency edges', () => {
      const tasks = [
        { uid: 's:1', id: '1', storeId: 's', blockedBy: ['1', '999'], blocks: ['1'] },
      ];
      const graph = buildGraph(tasks);
      expect(graph.parents.get('s:1').size).toBe(0);
      expect(graph.children.get('s:1').size).toBe(0);
    });

    it('handles cyclical dependencies gracefully in topological sort', () => {
      const tasks = [
        { uid: 's:0', id: '0', storeId: 's', status: 'completed' },
        { uid: 's:1', id: '1', storeId: 's', blockedBy: ['2'], status: 'pending' },
        { uid: 's:2', id: '2', storeId: 's', blockedBy: ['1'], status: 'pending' },
      ];
      const graph = buildGraph(tasks);
      expect(graph.topo).toHaveLength(3);
      expect(graph.topo.map(t => t.id)).toEqual(['0', '1', '2']);
    });

    it('evaluates ready state with deleted parent tasks and missing parents', () => {
      const tasks = [
        { uid: 's:1', id: '1', storeId: 's', status: 'deleted', lastKnownStatus: 'completed' },
        { uid: 's:2', id: '2', storeId: 's', status: 'deleted', lastKnownStatus: 'pending' },
        { uid: 's:3', id: '3', storeId: 's', blockedBy: ['1'], status: 'pending' },
        { uid: 's:4', id: '4', storeId: 's', blockedBy: ['2'], status: 'pending' },
        { uid: 's:5', id: '5', storeId: 's', status: 'in_progress' },
        { uid: 's:6', id: '6', storeId: 's', blockedBy: ['nonexistent'], status: 'pending' },
      ];
      const graph = buildGraph(tasks);
      expect(graph.ready(tasks[2])).toBe(true); // parent 1 completed before deletion
      expect(graph.ready(tasks[3])).toBe(false); // parent 2 pending before deletion
      expect(graph.ready(tasks[4])).toBe(false); // task not pending
      expect(graph.ready(tasks[5])).toBe(true); // nonexistent parent filtered out of graph edges
    });
  });

  describe('lifecycleTime', () => {
    it('returns startedAt if present', () => {
      expect(lifecycleTime({ lifecycle: { startedAt: '2026-01-01' } })).toBe('2026-01-01');
    });

    it('falls back through completedAt, createdAt, firstSeenAt, lastChangedAt', () => {
      expect(lifecycleTime({ lifecycle: { completedAt: '2026-01-02' } })).toBe('2026-01-02');
      expect(lifecycleTime({ lifecycle: { createdAt: '2026-01-03' } })).toBe('2026-01-03');
      expect(lifecycleTime({ lifecycle: { firstSeenAt: '2026-01-04' } })).toBe('2026-01-04');
      expect(lifecycleTime({ lifecycle: { lastChangedAt: '2026-01-05' } })).toBe('2026-01-05');
    });

    it('returns empty string if lifecycle or timestamps missing', () => {
      expect(lifecycleTime({})).toBe('');
      expect(lifecycleTime(null)).toBe('');
    });
  });

  describe('timelineOrder', () => {
    it('sorts tasks based on execution time and observed time', () => {
      const t1 = { id: '1', lifecycle: { startedAt: '2026-01-01T10:00:00Z' } };
      const t2 = { id: '2', lifecycle: { startedAt: '2026-01-01T12:00:00Z' } };
      const t3 = { id: '3', lifecycle: { createdAt: '2026-01-01T08:00:00Z' } };
      const t4 = { id: '4', lifecycle: { createdAt: '2026-01-01T09:00:00Z' } };
      const t5 = { id: '5' };
      const t6 = { id: '6' };

      const ordered = timelineOrder([t6, t5, t4, t3, t2, t1]);
      // executed tasks come first (t1, t2), then observed tasks (t3, t4), then unexecuted/unobserved (t5, t6)
      expect(ordered.map(t => t.id)).toEqual(['1', '2', '3', '4', '5', '6']);
    });

    it('compares execution times when both exist', () => {
      const a = { id: 'a', lifecycle: { startedAt: '2026-02-01' } };
      const b = { id: 'b', lifecycle: { startedAt: '2026-01-01' } };
      expect(timelineOrder([a, b]).map(t => t.id)).toEqual(['b', 'a']);
    });

    it('orders unexecuted after executed tasks (!ea && eb branch)', () => {
      const unexecuted = { id: '1' };
      const executed = { id: '2', lifecycle: { startedAt: '2026-01-01' } };
      expect(timelineOrder([unexecuted, executed]).map(t => t.id)).toEqual(['2', '1']);
    });

    it('handles identical execution times falling through to observed time', () => {
      const a = { id: '1', lifecycle: { startedAt: '2026-01-01', createdAt: '2026-01-01T01:00:00Z' } };
      const b = { id: '2', lifecycle: { startedAt: '2026-01-01', createdAt: '2026-01-01T02:00:00Z' } };
      expect(timelineOrder([b, a]).map(t => t.id)).toEqual(['1', '2']);
    });

    it('handles one observed time vs none and stable compare fallback', () => {
      const a = { id: 'a', lifecycle: { createdAt: '2026-01-01' } };
      const b = { id: 'b' };
      expect(timelineOrder([b, a]).map(t => t.id)).toEqual(['a', 'b']);
      expect(timelineOrder([a, b]).map(t => t.id)).toEqual(['a', 'b']);

      // Non-numeric IDs with identical times
      const nonNumA = { id: 'task-z', lifecycle: { createdAt: '2026-01-01' } };
      const nonNumB = { id: 'task-a', lifecycle: { createdAt: '2026-01-01' } };
      expect(timelineOrder([nonNumA, nonNumB]).map(t => t.id)).toEqual(['task-a', 'task-z']);

      // Null task ID fallback
      const nullIdA = { id: null };
      const nullIdB = { id: '1' };
      expect(timelineOrder([nullIdA, nullIdB]).map(t => t.id)).toEqual([null, '1']);
    });

    it('falls back to stableTaskCompare when times are identical', () => {
      const a = { id: '2', lifecycle: { createdAt: '2026-01-01' } };
      const b = { id: '1', lifecycle: { createdAt: '2026-01-01' } };
      expect(timelineOrder([a, b]).map(t => t.id)).toEqual(['1', '2']);
    });
  });

  describe('flowNodeClass', () => {
    it('returns deleted, done, active, ready, or blocked based on status and ready flag', () => {
      expect(flowNodeClass({ status: 'deleted' })).toBe('deleted');
      expect(flowNodeClass({ status: 'completed' })).toBe('done');
      expect(flowNodeClass({ status: 'in_progress' })).toBe('active');
      expect(flowNodeClass({ status: 'pending' }, true)).toBe('ready');
      expect(flowNodeClass({ status: 'pending' }, false)).toBe('blocked');
      expect(flowNodeClass(null, false)).toBe('blocked');
      expect(flowNodeClass(null, true)).toBe('ready');
    });
  });

  describe('partitionFlowTasks', () => {
    it('separates connected from disconnected tasks', () => {
      const tasks = [
        { uid: 's:1', id: '1' },
        { uid: 's:2', id: '2' },
        { uid: 's:3', id: '3' },
      ];
      const graph = {
        parents: new Map([
          ['s:1', new Set(['s:2'])],
          ['s:2', new Set()],
          ['s:3', new Set()],
        ]),
        children: new Map([
          ['s:1', new Set()],
          ['s:2', new Set(['s:1'])],
          ['s:3', new Set()],
        ]),
      };

      const result = partitionFlowTasks(tasks, graph);
      expect(result.connected.map(t => t.id)).toEqual(['1', '2']);
      expect(result.disconnected.map(t => t.id)).toEqual(['3']);
    });

    it('handles empty graph or missing maps', () => {
      const tasks = [{ uid: '1', id: '1' }];
      const result = partitionFlowTasks(tasks, null);
      expect(result.connected).toEqual([]);
      expect(result.disconnected.map(t => t.id)).toEqual(['1']);
    });
  });

  describe('additional branch edge cases', () => {
    it('covers stableTaskCompare null/undefined id fallbacks', () => {
      const tUndefinedA = { id: undefined };
      const tUndefinedB = { id: undefined };
      const tNonNumeric = { id: 'abc' };
      timelineOrder([tUndefinedA, tNonNumeric]);
      timelineOrder([tNonNumeric, tUndefinedB]);
      timelineOrder([tUndefinedA, tUndefinedB]);
    });

    it('covers multiple parents and false branch of indegree === 0', () => {
      const tasks = [
        { uid: 's:1', id: '1', storeId: 's', status: 'completed' },
        { uid: 's:2', id: '2', storeId: 's', status: 'completed' },
        { uid: 's:3', id: '3', storeId: 's', blockedBy: ['1', '2'], status: 'pending' },
      ];
      const graph = buildGraph(tasks);
      expect(graph.topo.map(t => t.id)).toEqual(['1', '2', '3']);
    });

    it('covers dynamic uid for children.get || [] fallback', () => {
      let callCount = 0;
      const weirdTask = {
        get uid() {
          callCount++;
          return callCount > 3 ? 'dynamic-missing' : 's:1';
        },
        id: '1',
        storeId: 's',
        status: 'pending',
      };
      const graph = buildGraph([weirdTask]);
      expect(graph.topo).toHaveLength(1);
    });

    it('covers missing indegree in child traversal', () => {
      let count = 0;
      const child = {
        get uid() {
          count++;
          // Returns s:2 during parent/edge setup, but different during indegree map setup
          if (count === 4) return 's:2-different';
          return 's:2';
        },
        id: '2',
        storeId: 's',
        status: 'pending',
      };
      const parent = {
        uid: 's:1',
        id: '1',
        storeId: 's',
        blocks: ['2'],
        status: 'completed',
      };
      const graph = buildGraph([parent, child]);
      expect(graph.topo).toHaveLength(2);
    });

    it('covers ready() with unknown task not in parents map', () => {
      const graph = buildGraph([]);
      expect(graph.ready({ uid: 'unknown-task', status: 'pending' })).toBe(true);
      expect(graph.ready({ uid: 'unknown-task', status: 'done' })).toBe(false);
    });

    it('covers !ea && eb in timelineOrder', () => {
      const tasks = [
        { id: 'e1', lifecycle: { startedAt: '2026-01-01T00:00:00Z' } },
        { id: 'u1' },
      ];
      const ordered = timelineOrder(tasks);
      expect(ordered[0].id).toBe('e1');
      expect(ordered[1].id).toBe('u1');
    });
  });
});
