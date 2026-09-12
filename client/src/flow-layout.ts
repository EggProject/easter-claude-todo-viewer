const DEFAULT_NODE_WIDTH = 340;
const DEFAULT_COLUMN_GAP = 100;
const DEFAULT_ROW_GAP = 140;

export interface FlowLayoutNode {
  id: string;
  position?: { x: number; y: number } | undefined;
  data?:
    | {
        taskId?: string | number | undefined;
        uid?: string | undefined;
        sessionId?: string | undefined;
        laneOffset?: number | undefined;
        [key: string]: unknown;
      }
    | undefined;
  [key: string]: unknown;
}

export interface PackOptions {
  nodeWidth?: number | undefined;
  nodeHeight?: number | undefined;
  columnGap?: number | undefined;
  rowGap?: number | undefined;
}

export function numericNodeId(node: FlowLayoutNode | undefined): number {
  const n = Number(node?.data?.taskId);
  return Number.isFinite(n) ? n : Number.MAX_SAFE_INTEGER;
}

export function disconnectedColumnCount(
  canvasWidth: number | string | undefined,
  count: number,
  nodeWidth = DEFAULT_NODE_WIDTH,
  columnGap = DEFAULT_COLUMN_GAP,
): number {
  if (!count) return 0;
  const width = Math.max(nodeWidth, Number(canvasWidth) || 1600);
  const stride = nodeWidth + columnGap;
  return Math.max(1, Math.min(8, count, Math.max(4, Math.floor(width / stride))));
}

export function packDisconnectedNodes<T extends FlowLayoutNode>(
  connectedNodes: T[] = [],
  disconnectedNodes: T[] = [],
  canvasWidth: number | string = 1600,
  options: PackOptions = {},
): T[] {
  if (!disconnectedNodes.length) return [...connectedNodes];
  const nodeWidth = Number(options.nodeWidth || DEFAULT_NODE_WIDTH);
  const nodeHeight = Number(options.nodeHeight || 120);
  const columnGap = Number(options.columnGap || DEFAULT_COLUMN_GAP);
  const rowGap = Number(options.rowGap || DEFAULT_ROW_GAP);
  const sorted = [...disconnectedNodes].sort(
    (a, b) => numericNodeId(a) - numericNodeId(b) || String(a.id).localeCompare(String(b.id)),
  );
  const rightEdge = connectedNodes.length
    ? Math.max(...connectedNodes.map((node) => Number(node.position?.x || 0) + nodeWidth))
    : -260;
  const startX = rightEdge + 260;
  const baseY = connectedNodes.length
    ? Math.min(...connectedNodes.map((node) => Number(node.position?.y || 0)))
    : 0;
  const columns = disconnectedColumnCount(canvasWidth, sorted.length, nodeWidth, columnGap);
  const strideX = nodeWidth + columnGap;
  const strideY = nodeHeight + rowGap;
  const packed: T[] = sorted.map((node, index) => ({
    ...node,
    position: {
      x: startX + (index % columns) * strideX,
      y: baseY + Math.floor(index / columns) * strideY,
    },
  }));
  return [...connectedNodes, ...packed];
}
