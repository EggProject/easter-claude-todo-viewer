#!/usr/bin/env bash
set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "================================================================================"
echo "Running Frontend Tests"
echo "================================================================================"
FRONTEND_TEST_EXIT=0
(cd "$ROOT/client" && mise exec -- pnpm run test:coverage) || FRONTEND_TEST_EXIT=$?

echo ""
echo "================================================================================"
echo "Running Backend Tests"
echo "================================================================================"
cd "$ROOT"
BACKEND_TEST_EXIT=0
mise exec -- python3 -m coverage run --rcfile=.coveragerc -m unittest discover tests || BACKEND_TEST_EXIT=$?

echo ""
echo "================================================================================"
echo "Generating Backend Coverage Report"
echo "================================================================================"
mise exec -- python3 -m coverage report -m || true
mise exec -- python3 -m coverage json -o coverage_backend.json || true

SUMMARY_EXIT=0
mise exec -- python3 - "$ROOT" "$BACKEND_TEST_EXIT" "$FRONTEND_TEST_EXIT" << 'EOF' || SUMMARY_EXIT=$?
import json
import os
import sys

root_dir = sys.argv[1]
backend_test_exit = int(sys.argv[2])
frontend_test_exit = int(sys.argv[3])

backend_json_path = os.path.join(root_dir, "coverage_backend.json")
backend_json_loaded = False
be_stmts = 0.0
be_branches = 0.0
be_overall = 0.0

if os.path.isfile(backend_json_path):
    try:
        with open(backend_json_path, "r", encoding="utf-8") as f:
            be_data = json.load(f)
        totals = be_data.get("totals", {})
        be_stmts = float(totals.get("percent_statements_covered", 0.0))
        be_branches = float(totals.get("percent_branches_covered", 0.0))
        be_overall = float(totals.get("percent_covered", 0.0))
        backend_json_loaded = True
    except Exception as e:
        print(f"Warning: Failed to parse {backend_json_path}: {e}", file=sys.stderr)

frontend_json_path = os.path.join(root_dir, "client", "coverage", "coverage-summary.json")
frontend_json_loaded = False
fe_stmts = 0.0
fe_branches = 0.0
fe_funcs = 0.0
fe_lines = 0.0
fe_overall = 0.0

if os.path.isfile(frontend_json_path):
    try:
        with open(frontend_json_path, "r", encoding="utf-8") as f:
            fe_data = json.load(f)
        total = fe_data.get("total", {})
        fe_stmts = float(total.get("statements", {}).get("pct", 0.0))
        fe_branches = float(total.get("branches", {}).get("pct", 0.0))
        fe_funcs = float(total.get("functions", {}).get("pct", 0.0))
        fe_lines = float(total.get("lines", {}).get("pct", 0.0))
        fe_overall = (fe_stmts + fe_branches + fe_funcs + fe_lines) / 4.0
        frontend_json_loaded = True
    except Exception as e:
        print(f"Warning: Failed to parse {frontend_json_path}: {e}", file=sys.stderr)

THRESHOLD = 100.0

def status_str(val, loaded):
    if not loaded:
        return "FAIL"
    return "PASS" if val >= THRESHOLD else "FAIL"

be_tests_ok = (backend_test_exit == 0)
fe_tests_ok = (frontend_test_exit == 0)

be_cov_ok = backend_json_loaded and (be_stmts >= THRESHOLD) and (be_branches >= THRESHOLD) and (be_overall >= THRESHOLD)
fe_cov_ok = frontend_json_loaded and (fe_stmts >= THRESHOLD) and (fe_branches >= THRESHOLD) and (fe_funcs >= THRESHOLD) and (fe_lines >= THRESHOLD) and (fe_overall >= THRESHOLD)

all_passed = be_tests_ok and fe_tests_ok and be_cov_ok and fe_cov_ok

sep_double = "=" * 78
sep_single = "-" * 78

print("")
print(sep_double)
print("                           TEST AND COVERAGE SUMMARY")
print(sep_double)
print(f"{'Component':<12} {'Metric':<14} {'Coverage':>10} {'Required':>10}   {'Status':<6}")
print(sep_single)
print(f"{'Backend':<12} {'Statements':<14} {be_stmts:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(be_stmts, backend_json_loaded):<6}")
print(f"{'Backend':<12} {'Branches':<14} {be_branches:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(be_branches, backend_json_loaded):<6}")
print(f"{'Backend':<12} {'Overall':<14} {be_overall:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(be_overall, backend_json_loaded):<6}")
print(sep_single)
print(f"{'Frontend':<12} {'Statements':<14} {fe_stmts:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(fe_stmts, frontend_json_loaded):<6}")
print(f"{'Frontend':<12} {'Branches':<14} {fe_branches:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(fe_branches, frontend_json_loaded):<6}")
print(f"{'Frontend':<12} {'Functions':<14} {fe_funcs:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(fe_funcs, frontend_json_loaded):<6}")
print(f"{'Frontend':<12} {'Lines':<14} {fe_lines:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(fe_lines, frontend_json_loaded):<6}")
print(f"{'Frontend':<12} {'Overall':<14} {fe_overall:>9.2f}% {THRESHOLD:>9.2f}%   {status_str(fe_overall, frontend_json_loaded):<6}")
print(sep_double)
print("Suite Execution:")
print(f"  Backend Tests  : {'PASS' if be_tests_ok else 'FAIL'}")
print(f"  Frontend Tests : {'PASS' if fe_tests_ok else 'FAIL'}")
print(f"Overall Status   : {'PASS' if all_passed else 'FAIL'}")
print(sep_double)

sys.exit(0 if all_passed else 1)
EOF

if [ "$SUMMARY_EXIT" -ne 0 ]; then
    exit 1
fi

exit 0
