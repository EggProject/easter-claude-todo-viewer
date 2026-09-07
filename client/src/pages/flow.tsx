import React, { ReactElement, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import {
  ReactFlow,
  Background,
  Controls,
  ControlButton,
  MiniMap,
  MarkerType,
  applyNodeChanges,
  Node,
  Edge,
  NodeChange,
  ReactFlowInstance,
  Viewport,
} from '@xyflow/react';
import ELK, { ElkNode, ElkExtendedEdge } from 'elkjs/lib/elk.bundled.js';
import { useApp } from '../app-context.js';
import { getJSON, postJSON, deleteJSON } from '../api.js';
import {
  buildGraph,
  flowNodeClass,
  partitionFlowTasks,
  timelineOrder,
  TaskGraph,
} from '../task-graph.js';
import { TaskDrawer } from '../components/task-drawer.js';
import { StatusMultiSelect, normalizeStatusSelection } from '../components/status-multiselect.js';
import { SessionScopeSelect, useSessionScope } from '../components/session-select.js';
import { TaskLanguageBadge } from '../components/language-badge.js';
import {
  semanticGraphRevision,
  reconcileSemanticNodes,
  SavedLayoutsMap,
  SavedSessionLayout,
} from '../flow-state.js';
import { packDisconnectedNodes, FlowLayoutNode } from '../flow-layout.js';
import { usePersistentPageFilters } from '../filter-state.js';
import { AppStateData, Session, Task, TaskSessionInfo, isRecord, errorMessage } from '../types.js';

const elk = new ELK();
const NODE_WIDTH = 340;
const NODE_HEIGHT = 120;
const SESSION_GAP = 280;
const ELK_OPTIONS: Record<string, string> = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.edgeRouting': 'ORTHOGONAL',
  'elk.spacing.nodeNode': '180',
  'elk.layered.spacing.nodeNodeBetweenLayers': '320',
  'elk.layered.spacing.edgeNodeBetweenLayers': '120',
  'elk.layered.spacing.edgeEdgeBetweenLayers': '80',
  'elk.spacing.componentComponent': '220',
  'elk.separateConnectedComponents': 'true',
  'elk.layered.considerModelOrder.components': 'MODEL_ORDER',
  'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
  'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
};

interface VisibleGroupEntry {
  tasks: Task[];
  graph: TaskGraph;
  session: Session | TaskSessionInfo;
}

function isSingleSession(ids: string[]): ids is [string] {
  return ids.length === 1;
}

export default function FlowPage(): ReactElement {
  const app = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSessionIds, setSelectedSessionIds } = useSessionScope();
  const sessionScopeKey = selectedSessionIds.join(',');
  const memoizedSelectedSessionIds = selectedSessionIds;
  const [scopedState, setScopedState] = useState<AppStateData | null>(null);
  const scopedTasks = scopedState?.tasks;
  const tasks = useMemo(() => scopedTasks || [], [scopedTasks]);
  const [filters, setFilter] = usePersistentPageFilters('flow', {
    q: '',
    status: 'all',
    sort: scopedState?.initialSort ?? 'dependency',
  });
  const query = filters['q'] || '';
  const statuses = useMemo(() => normalizeStatusSelection(filters['status']), [filters]);
  const setStatuses = (next: Set<string>): void =>
    setFilter('status', next.size === 4 || next.size === 0 ? 'all' : [...next].join(','));
  const sort = filters['sort'] || scopedState?.initialSort || 'dependency';

  const [nodes, setNodes] = useState<Node[]>([]);
  const savedLayouts = useRef<SavedLayoutsMap>({});
  const [layoutRevision, setLayoutRevision] = useState(0);
  const [layoutReady, setLayoutReady] = useState(false);
  const restoringViewport = useRef(false);
  const [arranging, setArranging] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const rf = useRef<ReactFlowInstance | null>(null);
  const flowContainer = useRef<HTMLDivElement>(null);

  const { loadState, showModal, revision: appRevision } = app;
  useEffect(() => {
    let alive = true;
    loadState(memoizedSelectedSessionIds)
      .then((value) => {
        if (alive) setScopedState(value);
      })
      .catch((error: unknown) => {
        const message = errorMessage(error);
        showModal({ kind: 'error', title: 'Flow could not be loaded', message });
      });
    return () => {
      alive = false;
    };
  }, [loadState, showModal, memoizedSelectedSessionIds, appRevision]);

  const grouped = useMemo(() => groupTasksBySession(tasks), [tasks]);
  const visibleGroups = useMemo<Map<string, VisibleGroupEntry>>(() => {
    const needle = query.trim().toLowerCase();
    const result = new Map<string, VisibleGroupEntry>();
    for (const sessionId of memoizedSelectedSessionIds) {
      const group = grouped.get(sessionId) || [];
      const graph = buildGraph(group);
      const filtered = group.filter(
        (task) =>
          statuses.has(task.status) &&
          (!needle ||
            `${task.id} ${task.subject} ${task.description || ''} ${task.owner || ''} ${task.status} ${task.session?.label || ''}`
              .toLowerCase()
              .includes(needle)),
      );
      result.set(sessionId, {
        tasks: sortTasks(filtered, sort, graph),
        graph,
        session: group[0]?.session ||
          app.sessionsState.sessions.find((item) => item.id === sessionId) || {
            id: sessionId,
            label: sessionId,
          },
      });
    }
    return result;
  }, [grouped, memoizedSelectedSessionIds, query, statuses, sort, app.sessionsState.sessions]);

  const automatic = useMemo(
    () => buildMultiSessionFlow(visibleGroups, memoizedSelectedSessionIds),
    [visibleGroups, memoizedSelectedSessionIds],
  );
  const graphRevision = useMemo(
    () => semanticGraphRevision(visibleGroups, memoizedSelectedSessionIds, sort),
    [visibleGroups, memoizedSelectedSessionIds, sort],
  );

  useEffect(() => {
    let alive = true;
    setLayoutReady(false);
    Promise.all(
      memoizedSelectedSessionIds.map(async (sessionId) => {
        const value: unknown = await getJSON(
          `/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`,
        );
        const layout: SavedSessionLayout = isRecord(value) ? value : { nodes: {}, viewport: null };
        return [sessionId, layout] as const;
      }),
    )
      .then((entries) => {
        if (!alive) return;
        savedLayouts.current = Object.fromEntries(entries);
        setLayoutRevision((value) => value + 1);
        setLayoutReady(true);
      })
      .catch(() => {
        if (alive) setLayoutReady(true);
      });
    return () => {
      alive = false;
    };
  }, [memoizedSelectedSessionIds]);

  useEffect(() => {
    if (!layoutReady) return;
    setNodes((previous) => reconcileSemanticNodes(previous, automatic.nodes, savedLayouts.current));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphRevision, layoutRevision, layoutReady]);

  const restoreViewport = useCallback(
    (instance = rf.current) => {
      if (!layoutReady || !instance) return;
      restoringViewport.current = true;
      if (memoizedSelectedSessionIds.length === 1) {
        const firstSessionId = memoizedSelectedSessionIds[0];
        const viewport = firstSessionId
          ? savedLayouts.current[firstSessionId]?.viewport
          : undefined;
        if (viewport) void instance.setViewport(viewport, { duration: 0 });
        else if (automatic.nodes.length) void instance.fitView({ padding: 0.18, duration: 0 });
      } else if (automatic.nodes.length) void instance.fitView({ padding: 0.18, duration: 0 });
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          restoringViewport.current = false;
        });
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layoutReady, sessionScopeKey, graphRevision],
  );

  useEffect(() => {
    restoreViewport();
  }, [layoutRevision, sessionScopeKey, restoreViewport]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((current) => applyNodeChanges(changes, current)),
    [],
  );

  const persistNode = useCallback((_: unknown, node: Node): void => {
    const data = node.data;
    const uid = typeof data?.['uid'] === 'string' ? data['uid'] : undefined;
    const sessionId = typeof data?.['sessionId'] === 'string' ? data['sessionId'] : undefined;
    if (!uid || !sessionId) return;
    const laneOffset = Number(data?.['laneOffset'] || 0);
    const position = {
      x: Number(node.position.x),
      y: Number(node.position.y) - laneOffset,
    };
    const current = savedLayouts.current[sessionId] || { nodes: {}, viewport: null };
    savedLayouts.current = {
      ...savedLayouts.current,
      [sessionId]: { ...current, nodes: { ...(current.nodes || {}), [uid]: position } },
    };
    postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`, {
      nodes: { [uid]: position },
    }).catch(() => {});
  }, []);

  const persistViewport = useCallback(
    (_: unknown, viewport: Viewport): void => {
      if (!viewport || !isSingleSession(memoizedSelectedSessionIds) || restoringViewport.current) {
        return;
      }
      const sessionId = memoizedSelectedSessionIds[0];
      const clean = { x: Number(viewport.x), y: Number(viewport.y), zoom: Number(viewport.zoom) };
      const current = savedLayouts.current[sessionId] || { nodes: {}, viewport: null };
      savedLayouts.current = {
        ...savedLayouts.current,
        [sessionId]: { ...current, viewport: clean },
      };
      postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`, {
        viewport: clean,
      }).catch(() => {});
    },
    [memoizedSelectedSessionIds],
  );

  useEffect(() => {
    const onFullscreenChange = (): void => {
      const active = document.fullscreenElement === flowContainer.current;
      setNativeFullscreen(active);
      if (!active) {
        requestAnimationFrame(() => void rf.current?.fitView({ padding: 0.18, duration: 220 }));
      }
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!fallbackFullscreen) return undefined;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setFallbackFullscreen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fallbackFullscreen]);

  useEffect(() => {
    if (fallbackFullscreen) {
      requestAnimationFrame(() => void rf.current?.fitView({ padding: 0.18, duration: 220 }));
    }
  }, [fallbackFullscreen]);

  const toggleFullscreen = useCallback(async (): Promise<void> => {
    const element = flowContainer.current;
    if (!element) return;
    if (document.fullscreenElement === element) {
      await document.exitFullscreen?.();
      return;
    }
    if (fallbackFullscreen) {
      setFallbackFullscreen(false);
      return;
    }
    if (element.requestFullscreen) {
      try {
        await element.requestFullscreen();
        return;
      } catch {
        /* fallback below */
      }
    }
    setFallbackFullscreen(true);
  }, [fallbackFullscreen]);

  const autoArrange = useCallback(async (): Promise<void> => {
    if (!nodes.some((node) => isRecord(node.data) && Boolean(node.data['uid'])) || arranging)
      return;
    setArranging(true);
    try {
      let offsetY = 0;
      const arranged: Node[] = [];
      const persistence: Promise<unknown>[] = [];
      const canvasWidth =
        flowContainer.current?.clientWidth ||
        (typeof window !== 'undefined' ? window.innerWidth : 1600) ||
        1600;

      for (const sessionId of memoizedSelectedSessionIds) {
        const sessionNodes = nodes
          .filter(
            (node) =>
              isRecord(node.data) &&
              node.data['sessionId'] === sessionId &&
              Boolean(node.data['uid']),
          )
          .map((node) => ({ ...node, position: { x: 0, y: 0 } }));
        const sessionEdges = automatic.edges.filter(
          (edge) => isRecord(edge.data) && edge.data['sessionId'] === sessionId,
        );

        const layouted = await layoutWithElk(sessionNodes, sessionEdges, canvasWidth);
        const maxY =
          layouted.length > 0
            ? Math.max(...layouted.map((node) => Number(node.position.y || 0) + NODE_HEIGHT))
            : NODE_HEIGHT;
        const laneOffset = offsetY + 80;
        arranged.push(sessionHeaderNode(sessionId, visibleGroups.get(sessionId)?.session, offsetY));
        const positions: Record<string, { x: number; y: number }> = {};
        for (const node of layouted) {
          const uid = String(node.data?.['uid']);
          positions[uid] = { x: Number(node.position.x), y: Number(node.position.y) };
          arranged.push({
            ...node,
            data: { ...node.data, laneOffset },
            position: { x: node.position.x, y: node.position.y + laneOffset },
          });
        }
        const currentLayout = savedLayouts.current[sessionId] || { nodes: {}, viewport: null };
        savedLayouts.current = {
          ...savedLayouts.current,
          [sessionId]: { ...currentLayout, nodes: positions },
        };
        persistence.push(
          postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`, {
            nodes: positions,
          }),
        );
        offsetY += Math.max(maxY + SESSION_GAP, 420);
      }
      setNodes(arranged);
      await Promise.all(persistence);
      requestAnimationFrame(() => void rf.current?.fitView({ padding: 0.2, duration: 350 }));
    } finally {
      setArranging(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, automatic.edges, arranging, sessionScopeKey, visibleGroups]);

  const resetLayout = useCallback(async (): Promise<void> => {
    await Promise.all(
      memoizedSelectedSessionIds.map((sessionId) =>
        deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`),
      ),
    );
    savedLayouts.current = {};
    setLayoutRevision((value) => value + 1);
    setNodes(automatic.nodes);
    requestAnimationFrame(() => void rf.current?.fitView({ padding: 0.18, duration: 250 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [automatic.nodes, sessionScopeKey]);

  const openTask = (node: Node): void => {
    const data = node.data;
    if (
      isRecord(data) &&
      typeof data['uid'] === 'string' &&
      typeof data['sessionId'] === 'string'
    ) {
      void navigate({
        pathname: `/flow/${encodeURIComponent(data['sessionId'])}/${encodeURIComponent(data['uid'])}`,
        search: location.search,
      });
    }
  };

  return (
    <div className="page flow-page">
      <div className="page-heading compact">
        <div>
          <div className="eyebrow">🔀 MULTI-SESSION TASK FLOW</div>
          <h1>Task graph</h1>
          <p className="muted">
            Each selected session is a separate lane. Dependency edges never cross sessions.
          </p>
        </div>
        <div className="flow-actions">
          <button
            className="mini"
            disabled={
              arranging || !nodes.some((node) => isRecord(node.data) && Boolean(node.data['uid']))
            }
            onClick={() => void autoArrange()}
          >
            {arranging ? '⟳ Arranging…' : '✨ Auto arrange'}
          </button>
          <button className="mini" onClick={() => void resetLayout()}>
            ↺ Reset layout
          </button>
        </div>
      </div>
      <div className="flow-toolbar page-controls">
        <input
          className="search-input"
          value={query}
          onChange={(event) => setFilter('q', event.target.value)}
          placeholder="Search task id, title, description, owner, session…"
        />
        <SessionScopeSelect
          selectedSessionIds={memoizedSelectedSessionIds}
          setSelectedSessionIds={setSelectedSessionIds}
        />
        <StatusMultiSelect value={statuses} onChange={setStatuses} />
        <select value={sort} onChange={(event) => setFilter('sort', event.target.value)}>
          <option value="dependency">Sort: Dependency</option>
          <option value="id">Sort: ID</option>
          <option value="subject">Sort: Title</option>
          <option value="status">Sort: Status</option>
        </select>
      </div>
      <div
        ref={flowContainer}
        className={`flow-wrap${fallbackFullscreen ? ' flow-maximized' : ''}`}
      >
        <ReactFlow
          nodes={nodes}
          edges={automatic.edges}
          nodesDraggable
          nodesConnectable={false}
          elementsSelectable
          onNodesChange={onNodesChange}
          onNodeDragStop={persistNode}
          onMoveEnd={persistViewport}
          onInit={(instance) => {
            rf.current = instance;
            restoreViewport(instance);
          }}
          onNodeClick={(_, node) => openTask(node)}
          minZoom={0.05}
          maxZoom={1.8}
        >
          <Background gap={28} size={1} />
          <Controls>
            <ControlButton
              onClick={() => void toggleFullscreen()}
              title={nativeFullscreen || fallbackFullscreen ? 'Exit full screen' : 'Full screen'}
              aria-label={
                nativeFullscreen || fallbackFullscreen ? 'Exit full screen' : 'Full screen'
              }
            >
              {nativeFullscreen || fallbackFullscreen ? '🗗' : '⛶'}
            </ControlButton>
          </Controls>
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <TaskDrawer base="flow" tasks={tasks} />
    </div>
  );
}

export function groupTasksBySession(tasks: Task[] = []): Map<string, Task[]> {
  const groups = new Map<string, Task[]>();
  for (const task of tasks) {
    const sessionId = task.sessionId || 'unknown';
    if (!groups.has(sessionId)) groups.set(sessionId, []);
    groups.get(sessionId)?.push(task);
  }
  return groups;
}

export function nodeId(task: Task | undefined): string {
  return `${task?.sessionId || 'session'}::${task?.uid || ''}`;
}

function buildMultiSessionFlow(
  groups: Map<string, VisibleGroupEntry>,
  sessionOrder: string[],
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let offsetY = 0;
  for (const sessionId of sessionOrder) {
    const entry = groups.get(sessionId) || {
      tasks: [],
      graph: buildGraph([]),
      session: { id: sessionId, label: sessionId },
    };
    const local = buildFlow(entry.tasks, entry.graph, sessionId, entry.session);
    const maxY =
      local.nodes.length > 0
        ? Math.max(...local.nodes.map((node) => Number(node.position.y || 0) + NODE_HEIGHT))
        : NODE_HEIGHT;
    const laneOffset = offsetY + 80;
    nodes.push(sessionHeaderNode(sessionId, entry.session, offsetY));
    nodes.push(
      ...local.nodes.map((node) => ({
        ...node,
        data: { ...node.data, laneOffset },
        position: { x: node.position.x, y: node.position.y + laneOffset },
      })),
    );
    edges.push(...local.edges);
    offsetY += Math.max(maxY + SESSION_GAP, 420);
  }
  return { nodes, edges };
}

function sessionHeaderNode(
  sessionId: string,
  session: Session | TaskSessionInfo | undefined,
  y: number,
): Node {
  const label = session?.label || session?.summary || sessionId;
  return {
    id: `__session__:${sessionId}`,
    position: { x: -470, y: y + 80 },
    draggable: false,
    selectable: false,
    connectable: false,
    data: {
      sessionId,
      label: (
        <div className="flow-session-header">
          <strong>{`🧵 ${label}`}</strong>
          <span className="mono">{shortId(sessionId)}</span>
        </div>
      ),
    },
    style: { width: 400, padding: 0, border: 'none', background: 'transparent' },
  };
}

function sortTasks(tasks: Task[], sort: string, graph: TaskGraph): Task[] {
  const list = [...tasks];
  if (sort === 'dependency') {
    list.sort(
      (a, b) =>
        (graph.orderIndex.get(a.uid) ?? Number.MAX_SAFE_INTEGER) -
        (graph.orderIndex.get(b.uid) ?? Number.MAX_SAFE_INTEGER),
    );
  } else if (sort === 'subject') {
    list.sort((a, b) => String(a.subject || '').localeCompare(String(b.subject || '')));
  } else if (sort === 'status') {
    list.sort(
      (a, b) =>
        String(a.status || '').localeCompare(String(b.status || '')) || numericId(a) - numericId(b),
    );
  } else {
    list.sort(
      (a, b) => numericId(a) - numericId(b) || String(a.id || '').localeCompare(String(b.id || '')),
    );
  }
  return list;
}

function numericId(task: Task | undefined): number {
  const n = Number(task?.id);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

function numericNodeId(node: FlowLayoutNode | undefined): number {
  const n = Number(node?.data?.taskId);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

async function layoutWithElk(
  nodes: Node[],
  edges: Edge[],
  canvasWidth: number | string = 1600,
): Promise<Node[]> {
  const connectedTaskIds = new Set<string>();
  edges.forEach((edge) => {
    connectedTaskIds.add(edge.source);
    connectedTaskIds.add(edge.target);
  });
  const connected = nodes.filter((node) => connectedTaskIds.has(node.id));
  const disconnected = nodes
    .filter((node) => !connectedTaskIds.has(node.id))
    .sort(
      (a, b) => numericNodeId(a) - numericNodeId(b) || String(a.id).localeCompare(String(b.id)),
    );

  let connectedLayout = connected;
  if (connected.length > 0) {
    const connectedIds = new Set(connected.map((node) => node.id));
    const elkChildren: ElkNode[] = connected.map((node) => ({
      id: node.id,
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    }));
    const elkEdges: ElkExtendedEdge[] = edges
      .filter((edge) => connectedIds.has(edge.source) && connectedIds.has(edge.target))
      .map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] }));

    const graph: ElkNode = {
      id: 'root',
      layoutOptions: ELK_OPTIONS,
      children: elkChildren,
      edges: elkEdges,
    };
    const result = await elk.layout(graph);
    const positions = new Map<string, { x: number; y: number }>(
      (result.children || []).map((node) => [
        node.id,
        { x: Number(node.x || 0), y: Number(node.y || 0) },
      ]),
    );
    connectedLayout = connected.map((node) => ({
      ...node,
      position: positions.get(node.id) || node.position,
    }));
  }

  return packDisconnectedNodes(connectedLayout, disconnected, canvasWidth, {
    nodeWidth: NODE_WIDTH,
    nodeHeight: NODE_HEIGHT,
    columnGap: 100,
    rowGap: 140,
  });
}

function timelineGroupKey(task: Task | undefined, index: number): string {
  const lifecycle = task?.lifecycle || {};
  const raw = lifecycle.startedAt || lifecycle.completedAt || lifecycle.deletedAt || '';
  if (!raw) return `unstarted:${index.toString()}`;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed)) return `activity:${raw}`;
  return `activity:${new Date(Math.floor(parsed / 1000) * 1000).toISOString()}`;
}

function buildFlow(
  tasks: Task[],
  graph: TaskGraph,
  sessionId: string,
  session: Session | TaskSessionInfo | undefined,
): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visible = new Set(tasks.map((task) => task.uid));
  const { connected, disconnected } = partitionFlowTasks(tasks, graph);
  const positionByUid = new Map<string, { x: number; y: number }>();
  const orderedConnected = timelineOrder(connected);
  const groups: Task[][] = [];
  const groupMap = new Map<string, Task[]>();

  orderedConnected.forEach((task, index) => {
    const key = timelineGroupKey(task, index);
    if (!groupMap.has(key)) {
      const group: Task[] = [];
      groupMap.set(key, group);
      groups.push(group);
    }
    groupMap.get(key)?.push(task);
  });

  groups.forEach((items, column) =>
    items.forEach((task, row) => positionByUid.set(task.uid, { x: column * 620, y: row * 290 })),
  );

  const disconnectedStart = groups.length > 0 ? groups.length * 620 : 0;
  const disconnectedColumns = Math.max(1, Math.min(5, disconnected.length));
  disconnected.forEach((task, index) =>
    positionByUid.set(task.uid, {
      x: disconnectedStart + (index % disconnectedColumns) * 500,
      y: Math.floor(index / disconnectedColumns) * 260,
    }),
  );

  for (const task of [...connected, ...disconnected]) {
    const ready = graph.ready(task);
    const cls = flowNodeClass(task, ready);
    const lifecycle = task.lifecycle || {};
    const statusText =
      task.status === 'deleted'
        ? '🗑️ deleted'
        : task.status === 'pending' && !ready
          ? '🔒 blocked'
          : task.status === 'in_progress'
            ? '🚀 in progress'
            : task.status === 'completed'
              ? '✅ completed'
              : '▶ ready';

    nodes.push({
      id: nodeId(task),
      position: positionByUid.get(task.uid) || { x: 0, y: 0 },
      data: {
        uid: task.uid,
        taskId: task.id,
        sessionId,
        session,
        label: (
          <div className={`flow-node ${cls}`}>
            <div className="flow-node-top">
              <span className="mono">{`#${task.id}`}</span>
              <span className="session-badge flow-session-badge" title={sessionId}>
                {`🧵 ${compactLabel(session?.label || sessionId)}`}
              </span>
              {lifecycle.startedAt ? (
                <span className="timeline-time" title={lifecycle.startedAt}>
                  {shortTime(lifecycle.startedAt)}
                </span>
              ) : null}
            </div>
            <strong>{task.subject}</strong>
            <TaskLanguageBadge task={task} compact />
            <small>{statusText}</small>
            {task.status === 'deleted' && task.deletedAt ? (
              <span className="deleted-at" title={task.deletedAt}>
                {`removed ${shortTime(task.deletedAt)}`}
              </span>
            ) : null}
          </div>
        ),
      },
      style: { width: NODE_WIDTH, padding: 0, border: 'none', background: 'transparent' },
    });
  }

  for (const [source, targets] of graph.children) {
    if (!visible.has(source)) continue;
    for (const target of targets) {
      if (!visible.has(target)) continue;
      const sourceTask = graph.map.get(source);
      const targetTask = graph.map.get(target);
      edges.push({
        id: `${sessionId}:${source}->${target}`,
        source: nodeId(sourceTask),
        target: nodeId(targetTask),
        data: { sessionId },
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: sourceTask?.status === 'in_progress',
        style: { stroke: '#7f849c', strokeWidth: 2 },
      });
    }
  }

  return { nodes, edges };
}

function shortTime(iso: unknown): string {
  try {
    return iso
      ? new Date(String(iso)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : '';
  } catch {
    return '';
  }
}

function shortId(id: unknown): string {
  const value = String(id || '');
  return value.length > 14 ? `${value.slice(0, 12)}…` : value;
}

function compactLabel(value: unknown): string {
  const text = String(value || '');
  return text.length > 24 ? `${text.slice(0, 22)}…` : text;
}
