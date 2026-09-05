import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { ReactFlow, Background, Controls, ControlButton, MiniMap, MarkerType, applyNodeChanges } from '@xyflow/react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { useApp } from '../app-context.js';
import { getJSON, postJSON, deleteJSON } from '../api.js';
import { buildGraph, flowNodeClass, partitionFlowTasks, timelineOrder } from '../task-graph.js';
import { TaskDrawer } from '../components/task-drawer.js';
import { StatusMultiSelect, normalizeStatusSelection } from '../components/status-multiselect.js';
import { SessionScopeSelect, useSessionScope } from '../components/session-select.js';

const h = React.createElement;
const elk = new ELK();
const NODE_WIDTH = 340;
const NODE_HEIGHT = 120;
const SESSION_GAP = 280;
const ELK_OPTIONS = {
  'elk.algorithm': 'layered', 'elk.direction': 'RIGHT', 'elk.edgeRouting': 'ORTHOGONAL',
  'elk.spacing.nodeNode': '180', 'elk.layered.spacing.nodeNodeBetweenLayers': '320',
  'elk.layered.spacing.edgeNodeBetweenLayers': '120', 'elk.layered.spacing.edgeEdgeBetweenLayers': '80',
  'elk.spacing.componentComponent': '220', 'elk.separateConnectedComponents': 'true',
  'elk.layered.considerModelOrder.components': 'MODEL_ORDER', 'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
  'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP', 'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
};

export default function FlowPage() {
  const app = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedSessionIds, setSelectedSessionIds } = useSessionScope();
  const [scopedState, setScopedState] = useState(null);
  const tasks = scopedState?.tasks || [];
  const [query, setQuery] = useState('');
  const [statuses, setStatuses] = useState(() => normalizeStatusSelection('all'));
  const [sortOverride, setSort] = useState(null);
  const sort = sortOverride ?? scopedState?.initialSort ?? 'dependency';
  const [nodes, setNodes] = useState([]);
  const [layouts, setLayouts] = useState({});
  const [layoutReady, setLayoutReady] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [fallbackFullscreen, setFallbackFullscreen] = useState(false);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const rf = useRef(null);
  const flowContainer = useRef(null);

  useEffect(() => {
    let alive = true;
    app.loadState(selectedSessionIds).then(value => { if (alive) setScopedState(value); }).catch(error => app.showModal({ kind: 'error', title: 'Flow could not be loaded', message: error.message }));
    return () => { alive = false; };
  }, [selectedSessionIds.join(','), app.revision]);

  const grouped = useMemo(() => groupTasksBySession(tasks), [tasks]);
  const visibleGroups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const result = new Map();
    for (const sessionId of selectedSessionIds) {
      const group = grouped.get(sessionId) || [];
      const graph = buildGraph(group);
      const filtered = group.filter(task => statuses.has(task.status) && (!needle || `${task.id} ${task.subject || ''} ${task.description || ''} ${task.owner || ''} ${task.status || ''} ${task.session?.label || ''}`.toLowerCase().includes(needle)));
      result.set(sessionId, { tasks: sortTasks(filtered, sort, graph), graph, session: group[0]?.session || app.sessionsState.sessions.find(item => item.id === sessionId) || { id: sessionId, label: sessionId } });
    }
    return result;
  }, [grouped, selectedSessionIds.join(','), query, statuses, sort, app.sessionsState.sessions]);

  const automatic = useMemo(() => buildMultiSessionFlow(visibleGroups, selectedSessionIds), [visibleGroups, selectedSessionIds.join(',')]);

  useEffect(() => {
    let alive = true;
    setLayoutReady(false);
    Promise.all(selectedSessionIds.map(async sessionId => {
      const value = await getJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`);
      return [sessionId, value || { nodes: {}, viewport: null }];
    })).then(entries => {
      if (!alive) return;
      setLayouts(Object.fromEntries(entries));
      setLayoutReady(true);
    }).catch(() => { if (alive) setLayoutReady(true); });
    return () => { alive = false; };
  }, [selectedSessionIds.join(',')]);

  useEffect(() => {
    setNodes(previous => {
      const previousPositions = new Map(previous.map(node => [node.id, node.position]));
      return automatic.nodes.map(node => {
        if (!node.data?.uid) return node;
        const saved = layouts[node.data.sessionId]?.nodes?.[node.data.uid];
        const savedPosition = saved ? { x: Number(saved.x), y: Number(saved.y) + Number(node.data.laneOffset || 0) } : null;
        return { ...node, position: savedPosition || previousPositions.get(node.id) || node.position };
      });
    });
  }, [automatic.nodes, layouts]);

  useEffect(() => {
    if (!layoutReady || !rf.current) return;
    if (selectedSessionIds.length === 1) {
      const viewport = layouts[selectedSessionIds[0]]?.viewport;
      if (viewport) rf.current.setViewport(viewport, { duration: 0 });
      else if (nodes.length) rf.current.fitView({ padding: 0.18, duration: 0 });
    } else if (nodes.length) rf.current.fitView({ padding: 0.18, duration: 0 });
  }, [layoutReady, selectedSessionIds.join(',')]);

  const onNodesChange = useCallback(changes => setNodes(current => applyNodeChanges(changes, current)), []);
  const persistNode = useCallback((_, node) => {
    if (!node.data?.uid || !node.data?.sessionId) return;
    const sessionId = node.data.sessionId;
    const position = { x: Number(node.position.x), y: Number(node.position.y) - Number(node.data.laneOffset || 0) };
    setLayouts(current => ({ ...current, [sessionId]: { ...(current[sessionId] || {}), nodes: { ...(current[sessionId]?.nodes || {}), [node.data.uid]: position } } }));
    postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`, { nodes: { [node.data.uid]: position } }).catch(() => {});
  }, []);
  const persistViewport = useCallback((_, viewport) => {
    if (!viewport || selectedSessionIds.length !== 1) return;
    const sessionId = selectedSessionIds[0];
    const clean = { x: Number(viewport.x), y: Number(viewport.y), zoom: Number(viewport.zoom) };
    setLayouts(current => ({ ...current, [sessionId]: { ...(current[sessionId] || {}), viewport: clean } }));
    postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`, { viewport: clean }).catch(() => {});
  }, [selectedSessionIds.join(',')]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === flowContainer.current;
      setNativeFullscreen(active);
      if (!active) requestAnimationFrame(() => rf.current?.fitView({ padding: 0.18, duration: 220 }));
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);
  useEffect(() => {
    if (!fallbackFullscreen) return undefined;
    const onKeyDown = event => { if (event.key === 'Escape') setFallbackFullscreen(false); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fallbackFullscreen]);
  useEffect(() => { if (fallbackFullscreen) requestAnimationFrame(() => rf.current?.fitView({ padding: 0.18, duration: 220 })); }, [fallbackFullscreen]);

  const toggleFullscreen = useCallback(async () => {
    const element = flowContainer.current;
    if (!element) return;
    if (document.fullscreenElement === element) { await document.exitFullscreen?.(); return; }
    if (fallbackFullscreen) { setFallbackFullscreen(false); return; }
    if (element.requestFullscreen) {
      try { await element.requestFullscreen(); return; } catch { /* fallback below */ }
    }
    setFallbackFullscreen(true);
  }, [fallbackFullscreen]);

  const autoArrange = useCallback(async () => {
    if (!nodes.some(node => node.data?.uid) || arranging) return;
    setArranging(true);
    try {
      let offsetY = 0;
      const arranged = [];
      const persistence = [];
      for (const sessionId of selectedSessionIds) {
        const sessionNodes = nodes.filter(node => node.data?.sessionId === sessionId && node.data?.uid).map(node => ({ ...node, position: { x: 0, y: 0 } }));
        const sessionEdges = automatic.edges.filter(edge => edge.data?.sessionId === sessionId);
        const layouted = await layoutWithElk(sessionNodes, sessionEdges);
        const maxY = layouted.length ? Math.max(...layouted.map(node => Number(node.position.y || 0) + NODE_HEIGHT)) : NODE_HEIGHT;
        const laneOffset = offsetY + 80;
        arranged.push(sessionHeaderNode(sessionId, visibleGroups.get(sessionId)?.session, offsetY));
        const positions = {};
        for (const node of layouted) {
          positions[node.data.uid] = { x: Number(node.position.x), y: Number(node.position.y) };
          arranged.push({ ...node, data: { ...node.data, laneOffset }, position: { x: node.position.x, y: node.position.y + laneOffset } });
        }
        persistence.push(postJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`, { nodes: positions }));
        offsetY += Math.max(maxY + SESSION_GAP, 420);
      }
      setNodes(arranged);
      await Promise.all(persistence);
      requestAnimationFrame(() => rf.current?.fitView({ padding: 0.2, duration: 350 }));
    } finally { setArranging(false); }
  }, [nodes, automatic.edges, arranging, selectedSessionIds.join(','), visibleGroups]);

  const resetLayout = useCallback(async () => {
    await Promise.all(selectedSessionIds.map(sessionId => deleteJSON(`/api/sessions/${encodeURIComponent(sessionId)}/flow-layout`)));
    setLayouts({});
    setNodes(automatic.nodes);
    requestAnimationFrame(() => rf.current?.fitView({ padding: 0.18, duration: 250 }));
  }, [automatic.nodes, selectedSessionIds.join(',')]);

  const openTask = node => node.data?.uid && navigate({ pathname: `/flow/${encodeURIComponent(node.data.sessionId)}/${encodeURIComponent(node.data.uid)}`, search: location.search });

  return h('div', { className: 'page flow-page' },
    h('div', { className: 'page-heading compact' },
      h('div', null, h('div', { className: 'eyebrow' }, '🔀 MULTI-SESSION TASK FLOW'), h('h1', null, 'Task graph'), h('p', { className: 'muted' }, 'Each selected session is a separate lane. Dependency edges never cross sessions.')),
      h('div', { className: 'flow-actions' }, h('button', { className: 'mini', disabled: arranging || !nodes.some(node => node.data?.uid), onClick: autoArrange }, arranging ? '⟳ Arranging…' : '✨ Auto arrange'), h('button', { className: 'mini', onClick: resetLayout }, '↺ Reset layout'))),
    h('div', { className: 'flow-toolbar page-controls' },
      h('input', { className: 'search-input', value: query, onChange: event => setQuery(event.target.value), placeholder: 'Search task id, title, description, owner, session…' }),
      h(SessionScopeSelect, { selectedSessionIds, setSelectedSessionIds }),
      h(StatusMultiSelect, { value: statuses, onChange: setStatuses }),
      h('select', { value: sort, onChange: event => setSort(event.target.value) }, ...[['dependency', 'Dependency'], ['id', 'ID'], ['subject', 'Title'], ['status', 'Status']].map(([value, label]) => h('option', { value, key: value }, `Sort: ${label}`)))),
    h('div', { ref: flowContainer, className: `flow-wrap${fallbackFullscreen ? ' flow-maximized' : ''}` }, h(ReactFlow, {
      nodes, edges: automatic.edges, nodesDraggable: true, nodesConnectable: false, elementsSelectable: true,
      onNodesChange, onNodeDragStop: persistNode, onMoveEnd: persistViewport,
      onInit: instance => { rf.current = instance; if (layoutReady && nodes.length) instance.fitView({ padding: 0.18 }); },
      onNodeClick: (_, node) => openTask(node), minZoom: 0.05, maxZoom: 1.8,
    }, h(Background, { gap: 28, size: 1 }), h(Controls, null, h(ControlButton, { onClick: toggleFullscreen, title: nativeFullscreen || fallbackFullscreen ? 'Exit full screen' : 'Full screen', 'aria-label': nativeFullscreen || fallbackFullscreen ? 'Exit full screen' : 'Full screen' }, nativeFullscreen || fallbackFullscreen ? '🗗' : '⛶')), h(MiniMap, { pannable: true, zoomable: true }))),
    h(TaskDrawer, { base: 'flow', tasks }));
}

export function groupTasksBySession(tasks = []) {
  const groups = new Map();
  for (const task of tasks) {
    const sessionId = task.sessionId || 'unknown';
    if (!groups.has(sessionId)) groups.set(sessionId, []);
    groups.get(sessionId).push(task);
  }
  return groups;
}
export function nodeId(task) { return `${task.sessionId || 'session'}::${task.uid}`; }

function buildMultiSessionFlow(groups, sessionOrder) {
  const nodes = [], edges = [];
  let offsetY = 0;
  for (const sessionId of sessionOrder) {
    const entry = groups.get(sessionId) || { tasks: [], graph: buildGraph([]), session: { id: sessionId, label: sessionId } };
    const local = buildFlow(entry.tasks, entry.graph, sessionId, entry.session);
    const maxY = local.nodes.length ? Math.max(...local.nodes.map(node => Number(node.position.y || 0) + NODE_HEIGHT)) : NODE_HEIGHT;
    const laneOffset = offsetY + 80;
    nodes.push(sessionHeaderNode(sessionId, entry.session, offsetY));
    nodes.push(...local.nodes.map(node => ({ ...node, data: { ...node.data, laneOffset }, position: { x: node.position.x, y: node.position.y + laneOffset } })));
    edges.push(...local.edges);
    offsetY += Math.max(maxY + SESSION_GAP, 420);
  }
  return { nodes, edges };
}

function sessionHeaderNode(sessionId, session, y) {
  const label = session?.label || session?.summary || sessionId;
  return { id: `__session__:${sessionId}`, position: { x: -470, y: y + 80 }, draggable: false, selectable: false, connectable: false, data: { sessionId, label: h('div', { className: 'flow-session-header' }, h('strong', null, `🧵 ${label}`), h('span', { className: 'mono' }, shortId(sessionId))) }, style: { width: 400, padding: 0, border: 'none', background: 'transparent' } };
}

function sortTasks(tasks, sort, graph) {
  const list = [...tasks];
  if (sort === 'dependency') list.sort((a, b) => (graph.orderIndex.get(a.uid) ?? Number.MAX_SAFE_INTEGER) - (graph.orderIndex.get(b.uid) ?? Number.MAX_SAFE_INTEGER));
  else if (sort === 'subject') list.sort((a, b) => String(a.subject || '').localeCompare(String(b.subject || '')));
  else if (sort === 'status') list.sort((a, b) => String(a.status || '').localeCompare(String(b.status || '')) || numericId(a) - numericId(b));
  else list.sort((a, b) => numericId(a) - numericId(b) || String(a.id || '').localeCompare(String(b.id || '')));
  return list;
}
function numericId(task) { const n = Number(task?.id); return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER; }

async function layoutWithElk(nodes, edges) {
  const connectedTaskIds = new Set();
  edges.forEach(edge => { connectedTaskIds.add(edge.source); connectedTaskIds.add(edge.target); });
  const connected = nodes.filter(node => connectedTaskIds.has(node.id));
  const disconnected = nodes.filter(node => !connectedTaskIds.has(node.id)).sort((a, b) => numericNodeId(a) - numericNodeId(b) || String(a.id).localeCompare(String(b.id)));
  let connectedLayout = connected;
  if (connected.length) {
    const connectedIds = new Set(connected.map(node => node.id));
    const graph = { id: 'root', layoutOptions: ELK_OPTIONS, children: connected.map(node => ({ id: node.id, width: NODE_WIDTH, height: NODE_HEIGHT })), edges: edges.filter(edge => connectedIds.has(edge.source) && connectedIds.has(edge.target)).map(edge => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })) };
    const result = await elk.layout(graph);
    const positions = new Map((result.children || []).map(node => [node.id, { x: Number(node.x || 0), y: Number(node.y || 0) }]));
    connectedLayout = connected.map(node => ({ ...node, position: positions.get(node.id) || node.position }));
  }
  return placeDisconnectedNodes(connectedLayout, disconnected);
}
function placeDisconnectedNodes(connectedNodes, disconnectedNodes) {
  if (!disconnectedNodes.length) return connectedNodes;
  const rightEdge = connectedNodes.length ? Math.max(...connectedNodes.map(node => Number(node.position?.x || 0) + NODE_WIDTH)) : -440;
  const startX = rightEdge + 260;
  const baseY = connectedNodes.length ? Math.min(...connectedNodes.map(node => Number(node.position?.y || 0))) : 0;
  return [...connectedNodes, ...disconnectedNodes.map((node, index) => ({ ...node, position: { x: startX + index * 440, y: baseY } }))];
}
function numericNodeId(node) { const n = Number(node?.data?.taskId); return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER; }
function timelineGroupKey(task, index) { const lifecycle = task?.lifecycle || {}; const raw = lifecycle.startedAt || lifecycle.completedAt || lifecycle.deletedAt || ''; if (!raw) return `unstarted:${index}`; const parsed = Date.parse(raw); if (!Number.isFinite(parsed)) return `activity:${raw}`; return `activity:${new Date(Math.floor(parsed / 1000) * 1000).toISOString()}`; }

function buildFlow(tasks, graph, sessionId, session) {
  const nodes = [], edges = [];
  const visible = new Set(tasks.map(task => task.uid));
  const { connected, disconnected } = partitionFlowTasks(tasks, graph);
  const positionByUid = new Map();
  const orderedConnected = timelineOrder(connected);
  const groups = [], groupMap = new Map();
  orderedConnected.forEach((task, index) => { const key = timelineGroupKey(task, index); if (!groupMap.has(key)) { groupMap.set(key, []); groups.push(groupMap.get(key)); } groupMap.get(key).push(task); });
  groups.forEach((items, column) => items.forEach((task, row) => positionByUid.set(task.uid, { x: column * 620, y: row * 290 })));
  const disconnectedStart = groups.length ? groups.length * 620 : 0;
  disconnected.forEach((task, index) => positionByUid.set(task.uid, { x: disconnectedStart + index * 500, y: 0 }));
  for (const task of [...connected, ...disconnected]) {
    const ready = graph.ready(task), cls = flowNodeClass(task, ready), lifecycle = task.lifecycle || {};
    const statusText = task.status === 'deleted' ? '🗑️ deleted' : task.status === 'pending' && !ready ? '🔒 blocked' : task.status === 'in_progress' ? '🚀 in progress' : task.status === 'completed' ? '✅ completed' : '▶ ready';
    nodes.push({ id: nodeId(task), position: positionByUid.get(task.uid) || { x: 0, y: 0 }, data: { uid: task.uid, taskId: task.id, sessionId, session, label: h('div', { className: `flow-node ${cls}` }, h('div', { className: 'flow-node-top' }, h('span', { className: 'mono' }, `#${task.id}`), h('span', { className: 'session-badge flow-session-badge', title: sessionId }, `🧵 ${compactLabel(session?.label || sessionId)}`), lifecycle.startedAt && h('span', { className: 'timeline-time', title: lifecycle.startedAt }, shortTime(lifecycle.startedAt))), h('strong', null, task.subject), h('small', null, statusText), task.status === 'deleted' && task.deletedAt ? h('span', { className: 'deleted-at', title: task.deletedAt }, `removed ${shortTime(task.deletedAt)}`) : null) }, style: { width: NODE_WIDTH, padding: 0, border: 'none', background: 'transparent' } });
  }
  for (const [source, targets] of graph.children.entries()) {
    if (!visible.has(source)) continue;
    for (const target of targets) {
      if (!visible.has(target)) continue;
      const sourceTask = graph.map.get(source), targetTask = graph.map.get(target);
      edges.push({ id: `${sessionId}:${source}->${target}`, source: nodeId(sourceTask), target: nodeId(targetTask), data: { sessionId }, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed }, animated: sourceTask?.status === 'in_progress', style: { stroke: '#7f849c', strokeWidth: 2 } });
    }
  }
  return { nodes, edges };
}
function shortTime(value) { try { return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } }
function shortId(id) { const value = String(id || ''); return value.length > 14 ? `${value.slice(0, 12)}…` : value; }
function compactLabel(value) { const text = String(value || ''); return text.length > 24 ? `${text.slice(0, 22)}…` : text; }
