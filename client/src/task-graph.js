const numericTaskId = task => {
  const n = Number(task?.id);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
};

function stableTaskCompare(a, b) {
  return numericTaskId(a) - numericTaskId(b) || String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

export function buildGraph(tasks = []) {
  const map = new Map(tasks.map(task => [task.uid, task]));
  const parents = new Map();
  const children = new Map();
  tasks.forEach(task => { parents.set(task.uid, new Set()); children.set(task.uid, new Set()); });
  const uid = (store, id) => `${store}:${id}`;
  const edge = (from, to) => {
    if (!map.has(from) || !map.has(to) || from === to) return;
    children.get(from).add(to);
    parents.get(to).add(from);
  };
  tasks.forEach(task => {
    (task.blockedBy || []).forEach(id => edge(uid(task.storeId, String(id)), task.uid));
    (task.blocks || []).forEach(id => edge(task.uid, uid(task.storeId, String(id))));
  });

  const indegree = new Map(tasks.map(task => [task.uid, parents.get(task.uid)?.size || 0]));
  const readyQueue = tasks.filter(task => indegree.get(task.uid) === 0).sort(stableTaskCompare);
  const topo = [];
  while (readyQueue.length) {
    const task = readyQueue.shift();
    topo.push(task);
    for (const childUid of children.get(task.uid) || []) {
      indegree.set(childUid, (indegree.get(childUid) || 0) - 1);
      if (indegree.get(childUid) === 0) {
        readyQueue.push(map.get(childUid));
        readyQueue.sort(stableTaskCompare);
      }
    }
  }
  if (topo.length !== tasks.length) {
    const seen = new Set(topo.map(task => task.uid));
    topo.push(...tasks.filter(task => !seen.has(task.uid)).sort(stableTaskCompare));
  }
  const orderIndex = new Map(topo.map((task, index) => [task.uid, index]));
  const ready = task => task.status === 'pending' && [...(parents.get(task.uid) || [])].every(parent => { const p = map.get(parent); return p?.status === 'completed' || (p?.status === 'deleted' && p?.lastKnownStatus === 'completed'); });
  return { map, parents, children, topo, orderIndex, ready };
}

export function lifecycleTime(task) {
  const lifecycle = task?.lifecycle || {};
  return lifecycle.startedAt || lifecycle.completedAt || lifecycle.createdAt || lifecycle.firstSeenAt || lifecycle.lastChangedAt || '';
}

function executionTime(task) {
  const lifecycle = task?.lifecycle || {};
  return lifecycle.startedAt || lifecycle.completedAt || '';
}

function observedTime(task) {
  const lifecycle = task?.lifecycle || {};
  return lifecycle.createdAt || lifecycle.firstSeenAt || lifecycle.lastChangedAt || '';
}

export function timelineOrder(tasks = []) {
  return [...tasks].sort((a, b) => {
    const ea = executionTime(a), eb = executionTime(b);
    // Tasks that actually started are ordered by their observed execution time.
    // Tasks that have never started are placed after executed/in-progress work.
    if (ea && !eb) return -1;
    if (!ea && eb) return 1;
    if (ea && eb && ea !== eb) return ea.localeCompare(eb);
    const oa = observedTime(a), ob = observedTime(b);
    if (oa && ob && oa !== ob) return oa.localeCompare(ob);
    if (oa && !ob) return -1;
    if (!oa && ob) return 1;
    return stableTaskCompare(a, b);
  });
}

export function flowNodeClass(task, ready = false) {
  if (task?.status === 'deleted') return 'deleted';
  if (task?.status === 'completed') return 'done';
  if (task?.status === 'in_progress') return 'active';
  return ready ? 'ready' : 'blocked';
}

export function partitionFlowTasks(tasks = [], graph) {
  const connected = [];
  const disconnected = [];
  for (const task of tasks) {
    const degree = (graph?.parents?.get(task.uid)?.size || 0) + (graph?.children?.get(task.uid)?.size || 0);
    (degree > 0 ? connected : disconnected).push(task);
  }
  disconnected.sort(stableTaskCompare);
  return { connected, disconnected };
}
