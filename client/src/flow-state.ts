import { Task } from './types.js';
import { FlowLayoutNode } from './flow-layout.js';

export interface SemanticGroupEntry {
  tasks: Task[];
}

export interface SavedNodePosition {
  x: number;
  y: number;
}

export interface SavedSessionLayout {
  nodes?: Record<string, SavedNodePosition> | undefined;
  viewport?: { x: number; y: number; zoom: number } | null | undefined;
}

export type SavedLayoutsMap = Record<string, SavedSessionLayout | undefined>;

export function semanticGraphRevision(
  groups: Map<string, SemanticGroupEntry>,
  sessionOrder: string[],
  sort: string,
): string {
  const payload = sessionOrder.map((sessionId) => [
    sessionId,
    (groups.get(sessionId)?.tasks || []).map((task) => ({
      uid: task.uid,
      id: task.id,
      status: task.status,
      subject: task.subject,
      description: task.description,
      owner: task.owner,
      blockedBy: task.blockedBy || [],
      blocks: task.blocks || [],
      viewLanguage: task.viewLanguage,
      effectiveLanguage: task.effectiveLanguage,
      translationState: task.translationState,
    })),
  ]);
  return JSON.stringify({ sort, payload });
}

export function reconcileSemanticNodes<T extends FlowLayoutNode>(
  previous: T[] | undefined,
  incoming: T[] | undefined,
  layouts: SavedLayoutsMap | undefined,
): T[] {
  const previousById = new Map<string, T>((previous || []).map((node) => [node.id, node]));
  return (incoming || []).map((node) => {
    const prior = previousById.get(node.id);
    if (prior) return { ...node, position: prior.position };
    const uid = node.data?.uid;
    const sessionId = node.data?.sessionId;
    if (uid && sessionId) {
      const saved = layouts?.[sessionId]?.nodes?.[uid];
      if (saved) {
        return {
          ...node,
          position: { x: Number(saved.x), y: Number(saved.y) + Number(node.data?.laneOffset || 0) },
        };
      }
    }
    return node;
  });
}
