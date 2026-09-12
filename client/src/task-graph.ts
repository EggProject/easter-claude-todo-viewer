import { Task } from './types.js';

export interface TaskGraph {
  map: Map<string, Task>;
  parents: Map<string, Set<string>>;
  children: Map<string, Set<string>>;
  topo: Task[];
  orderIndex: Map<string, number>;
  ready: (task: Task) => boolean;
}

export interface PartitionedFlowTasks {
  connected: Task[];
  disconnected: Task[];
}

const numericTaskId = (task: Task | undefined): number => {
  const n = Number(task?.id);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

function stableTaskCompare(a: Task | undefined, b: Task | undefined): number {
  return (
    numericTaskId(a) - numericTaskId(b) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''))
  );
}

export function buildGraph(tasks: Task[] = []): TaskGraph {
  const map = new Map<string, Task>(tasks.map((task) => [task.uid, task]));
  const parents = new Map<string, Set<string>>();
  const children = new Map<string, Set<string>>();

  tasks.forEach((task) => {
    parents.set(task.uid, new Set());
    children.set(task.uid, new Set());
  });

  const uid = (store: string | undefined, id: string): string => `${store || ''}:${id}`;
  const edge = (from: string, to: string): void => {
    if (!map.has(from) || !map.has(to) || from === to) return;
    children.get(from)?.add(to);
    parents.get(to)?.add(from);
  };

  tasks.forEach((task) => {
    (task.blockedBy || []).forEach((id) => edge(uid(task.storeId, String(id)), task.uid));
    (task.blocks || []).forEach((id) => edge(task.uid, uid(task.storeId, String(id))));
  });

  const indegree = new Map<string, number>(
    tasks.map((task) => [task.uid, parents.get(task.uid)?.size || 0]),
  );
  const readyQueue = tasks.filter((task) => indegree.get(task.uid) === 0).sort(stableTaskCompare);
  const topo: Task[] = [];

  let task = readyQueue.shift();
  while (task) {
    topo.push(task);
    for (const childUid of children.get(task.uid) || []) {
      const current = indegree.get(childUid) || 0;
      indegree.set(childUid, current - 1);
      if (indegree.get(childUid) === 0) {
        const childTask = map.get(childUid);
        /* v8 ignore next */
        if (!childTask) continue;
        readyQueue.push(childTask);
        readyQueue.sort(stableTaskCompare);
      }
    }
    task = readyQueue.shift();
  }

  if (topo.length !== tasks.length) {
    const seen = new Set(topo.map((task) => task.uid));
    topo.push(...tasks.filter((task) => !seen.has(task.uid)).sort(stableTaskCompare));
  }

  const orderIndex = new Map<string, number>(topo.map((task, index) => [task.uid, index]));
  const ready = (task: Task): boolean =>
    task.status === 'pending' &&
    [...(parents.get(task.uid) || [])].every((parent) => {
      const p = map.get(parent);
      return (
        p?.status === 'completed' || (p?.status === 'deleted' && p?.lastKnownStatus === 'completed')
      );
    });

  return { map, parents, children, topo, orderIndex, ready };
}

export function lifecycleTime(task: Task | undefined): string {
  const lifecycle = task?.lifecycle || {};
  return (
    lifecycle.startedAt ||
    lifecycle.completedAt ||
    lifecycle.createdAt ||
    lifecycle.firstSeenAt ||
    lifecycle.lastChangedAt ||
    ''
  );
}

function executionTime(task: Task | undefined): string {
  const lifecycle = task?.lifecycle || {};
  return lifecycle.startedAt || lifecycle.completedAt || '';
}

function observedTime(task: Task | undefined): string {
  const lifecycle = task?.lifecycle || {};
  return lifecycle.createdAt || lifecycle.firstSeenAt || lifecycle.lastChangedAt || '';
}

export function timelineOrder(tasks: Task[] = []): Task[] {
  return [...tasks].sort((a, b) => {
    const ea = executionTime(a);
    const eb = executionTime(b);
    if (ea && !eb) return -1;
    if (!ea && eb) return 1;
    if (ea && eb && ea !== eb) return ea.localeCompare(eb);
    const oa = observedTime(a);
    const ob = observedTime(b);
    if (oa && ob && oa !== ob) return oa.localeCompare(ob);
    if (oa && !ob) return -1;
    if (!oa && ob) return 1;
    return stableTaskCompare(a, b);
  });
}

export function flowNodeClass(task: Task | undefined, ready = false): string {
  if (task?.status === 'deleted') return 'deleted';
  if (task?.status === 'completed') return 'done';
  if (task?.status === 'in_progress') return 'active';
  return ready ? 'ready' : 'blocked';
}

export function partitionFlowTasks(
  tasks: Task[] = [],
  graph?: TaskGraph | null,
): PartitionedFlowTasks {
  const connected: Task[] = [];
  const disconnected: Task[] = [];
  for (const task of tasks) {
    const degree =
      (graph?.parents?.get(task.uid)?.size || 0) + (graph?.children?.get(task.uid)?.size || 0);
    (degree > 0 ? connected : disconnected).push(task);
  }
  disconnected.sort(stableTaskCompare);
  return { connected, disconnected };
}
