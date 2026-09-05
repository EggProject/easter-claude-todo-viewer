import json, pathlib, subprocess, unittest
ROOT=pathlib.Path(__file__).resolve().parents[1]

class FlowTests(unittest.TestCase):
    def test_topological_dependency_order_and_ready_state(self):
        tasks=[
            {"uid":"s:1","storeId":"s","id":"1","status":"completed","blockedBy":[],"blocks":["2","3"]},
            {"uid":"s:2","storeId":"s","id":"2","status":"in_progress","blockedBy":["1"],"blocks":["4"]},
            {"uid":"s:3","storeId":"s","id":"3","status":"pending","blockedBy":["1"],"blocks":["4"]},
            {"uid":"s:4","storeId":"s","id":"4","status":"pending","blockedBy":["2","3"],"blocks":[]},
        ]
        script=f"""import {{buildGraph}} from {json.dumps((ROOT/'client/src/task-graph.js').as_uri())};
const tasks={json.dumps(tasks)};const g=buildGraph(tasks);
console.log(JSON.stringify({{order:g.topo.map(x=>x.uid),ready3:g.ready(tasks[2]),ready4:g.ready(tasks[3])}}));"""
        out=subprocess.check_output(['node','--input-type=module','-e',script],text=True)
        result=json.loads(out)
        self.assertEqual('s:1',result['order'][0])
        self.assertEqual('s:4',result['order'][-1])
        self.assertTrue(result['ready3'])
        self.assertFalse(result['ready4'])

    def test_timeline_order_uses_actual_start_sequence_and_puts_unstarted_tasks_after_started_work(self):
        tasks=[
            {"uid":"s:1","id":"1","status":"completed","lifecycle":{"startedAt":"2026-09-05T10:00:00+00:00","completedAt":"2026-09-05T10:03:00+00:00"}},
            {"uid":"s:2","id":"2","status":"in_progress","lifecycle":{"startedAt":"2026-09-05T10:01:00+00:00"}},
            {"uid":"s:3","id":"3","status":"completed","lifecycle":{"startedAt":"2026-09-05T10:02:00+00:00","completedAt":"2026-09-05T10:04:00+00:00"}},
            {"uid":"s:4","id":"4","status":"pending","lifecycle":{"createdAt":"2026-09-05T09:00:00+00:00"}},
        ]
        script=f"""import {{timelineOrder}} from {json.dumps((ROOT/'client/src/task-graph.js').as_uri())};
const tasks={json.dumps(tasks)}; console.log(JSON.stringify(timelineOrder(tasks).map(x=>x.uid)));"""
        out=subprocess.check_output(['node','--input-type=module','-e',script],text=True)
        self.assertEqual(["s:1","s:2","s:3","s:4"], json.loads(out))

if __name__=='__main__':unittest.main()
