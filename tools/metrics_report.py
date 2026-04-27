#!/usr/bin/env python3
import argparse
import json
import math
from collections import Counter
from pathlib import Path


DEFAULT_METRICS_FILE = Path(__file__).resolve().parent.parent / "metrics" / "runs.jsonl"


def _p95(values: list[int]) -> int:
    if not values:
        return 0
    sorted_values = sorted(values)
    idx = max(0, min(len(sorted_values) - 1, math.ceil(len(sorted_values) * 0.95) - 1))
    return sorted_values[idx]


def main() -> int:
    parser = argparse.ArgumentParser(description="汇总 agent_pipeline 运行指标")
    parser.add_argument(
        "--metrics-file",
        default=str(DEFAULT_METRICS_FILE),
        help="metrics JSONL 文件路径",
    )
    parser.add_argument(
        "--top-errors",
        type=int,
        default=5,
        help="失败码 TopN（默认 5）",
    )
    args = parser.parse_args()

    metrics_path = Path(args.metrics_file).expanduser().resolve()
    if not metrics_path.exists():
        print(f"未找到指标文件: {metrics_path}")
        return 1

    records = []
    for line in metrics_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(data, dict):
            records.append(data)

    if not records:
        print(f"指标文件为空或无有效记录: {metrics_path}")
        return 1

    total = len(records)
    success = sum(1 for r in records if r.get("ok") is True)
    failed = total - success
    success_rate = (success / total) * 100 if total else 0.0

    elapsed = [int(r.get("elapsed_ms", 0)) for r in records if isinstance(r.get("elapsed_ms"), int)]
    avg_elapsed = int(sum(elapsed) / len(elapsed)) if elapsed else 0
    p95_elapsed = _p95(elapsed)

    error_counter = Counter()
    for r in records:
        code = str(r.get("error_code", "")).strip()
        if code:
            error_counter[code] += 1

    print(f"样本数: {total}")
    print(f"成功数: {success}")
    print(f"失败数: {failed}")
    print(f"成功率: {success_rate:.2f}%")
    print(f"平均耗时: {avg_elapsed} ms")
    print(f"P95 耗时: {p95_elapsed} ms")
    print("")
    print(f"失败码 Top {args.top_errors}:")
    if not error_counter:
        print("- 无失败码记录")
    else:
        for code, cnt in error_counter.most_common(max(1, args.top_errors)):
            print(f"- {code}: {cnt}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
