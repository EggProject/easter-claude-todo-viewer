export function semanticGraphRevision(groups, sessionOrder, sort) {
  const payload = sessionOrder.map(sessionId => [sessionId, (groups.get(sessionId)?.tasks || []).map(task => ({
    uid: task.uid, id: task.id, status: task.status, subject: task.subject, description: task.description,
    owner: task.owner, blockedBy: task.blockedBy || [], blocks: task.blocks || [], viewLanguage: task.viewLanguage,
    effectiveLanguage: task.effectiveLanguage, translationState: task.translationState,
  }))]);
  return JSON.stringify({ sort, payload });
}

export function reconcileSemanticNodes(previous, incoming, layouts) {
  const previousById = new Map((previous || []).map(node => [node.id, node]));
  return (incoming || []).map(node => {
    const prior = previousById.get(node.id);
    if (prior) return { ...node, position: prior.position };
    if (node.data?.uid && node.data?.sessionId) {
      const saved = layouts?.[node.data.sessionId]?.nodes?.[node.data.uid];
      if (saved) return { ...node, position: { x: Number(saved.x), y: Number(saved.y) + Number(node.data.laneOffset || 0) } };
    }
    return node;
  });
}
