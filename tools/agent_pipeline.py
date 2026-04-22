#!/usr/bin/env python3
import argparse
from datetime import datetime
import json
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

# 兼容从项目根目录或 tools 目录执行
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from frame_expander import expand_long_frames
from frame_style_policy import optimize_frame_styles
from json_sanitize import sanitize_json_file
from quality_check import analyze_frames, auto_fix_frames


def with_timestamp_suffix(path_str: str) -> str:
    p = Path(path_str).expanduser().resolve()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    return str(p.with_name(f"{p.stem}_{ts}{p.suffix}"))


def _emit_result(result: dict, result_file: str = "") -> None:
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if result_file:
        Path(result_file).expanduser().resolve().write_text(text + "\n", encoding="utf-8")
    print(text)


def _post_json(url: str, payload: dict, timeout_s: int) -> tuple[int, dict]:
    req = urllib.request.Request(
        url,
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        try:
            return e.code, json.loads(detail) if detail.strip() else {}
        except json.JSONDecodeError:
            return e.code, {"raw_error": detail}
    except urllib.error.URLError as e:
        return 0, {"network_error": str(e)}


def _get_json(url: str, timeout_s: int) -> tuple[int, dict]:
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body.strip() else {}
    except urllib.error.HTTPError as e:
        detail = e.read().decode("utf-8", errors="ignore")
        try:
            return e.code, json.loads(detail) if detail.strip() else {}
        except json.JSONDecodeError:
            return e.code, {"raw_error": detail}
    except urllib.error.URLError as e:
        return 0, {"network_error": str(e)}


def _validate(frames_path: Path) -> dict:
    from validate_frames import run_validation

    # 先清洗可能的双 JSON 拼接
    try:
        sanitize_stats = sanitize_json_file(str(frames_path))
        if sanitize_stats.get("had_extra_text"):
            print("[agent_pipeline] 检测到附加 JSON/文本，已自动清洗为首个合法对象")
    except Exception as e:
        return {
            "ok": False,
            "validation_errors": [f"JSON 清洗失败: {e}"],
            "error_message": "输入文件不是合法 JSON，或包含无法解析的内容",
        }

    # 先做一次自动拆页，减少单页停留过久（不改语速）
    try:
        raw = json.loads(frames_path.read_text(encoding="utf-8"))
        # 小白讲清楚优先：放宽自动拆页阈值，减少仅因时长被硬拆。
        expanded, stats = expand_long_frames(raw, target_script_len=170, max_frames=12)
        optimized = optimize_frame_styles(expanded)
        if stats.get("expanded_count", 0) > 0:
            frames_path.write_text(
                json.dumps(optimized, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(
                f"[agent_pipeline] 已自动拆页: {stats['expanded_count']} 帧 "
                f"({stats['before_count']} -> {stats['after_count']})"
            )
        elif optimized != raw:
            frames_path.write_text(
                json.dumps(optimized, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print("[agent_pipeline] 已自动优化样式策略（收尾 hook 优先 spotlight）")
    except Exception as e:
        print(f"[agent_pipeline] 自动拆页跳过: {e}")

    text = frames_path.read_text(encoding="utf-8")
    result = run_validation(text)
    if result.get("is_valid"):
        return {"ok": True, "validation_errors": []}
    return {
        "ok": False,
        "validation_errors": result.get("errors", []),
        "error_message": result.get("error_summary", "校验失败"),
    }


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Agent 统一渲染入口：校验 -> 提交渲染 -> 轮询状态"
    )
    parser.add_argument("--frames", required=True, help="frames.json 文件路径")
    parser.add_argument("--server", default="http://localhost:8765", help="渲染服务地址")
    parser.add_argument("--poll-interval", type=float, default=1.5, help="轮询间隔（秒）")
    parser.add_argument("--timeout", type=int, default=900, help="总超时（秒）")
    parser.add_argument("--result-file", default="", help="可选：将结果 JSON 写入文件")
    parser.add_argument(
        "--no-timestamp-suffix",
        action="store_true",
        help="关闭 result-file 时间戳后缀（默认开启，避免覆盖旧文件）",
    )
    parser.add_argument(
        "--skip-quality-check",
        action="store_true",
        help="跳过质量评分（默认会执行）",
    )
    parser.add_argument(
        "--quality-min-total",
        type=float,
        default=0.0,
        help="质量总分阈值（0 表示仅报告不拦截）",
    )
    parser.add_argument(
        "--auto-fix-quality",
        action="store_true",
        help="质量不达标时自动改写后再评分，并继续后续流程",
    )
    parser.add_argument(
        "--no-wait",
        action="store_true",
        help="只提交任务不轮询，立即返回 job_id/watch_url",
    )
    args = parser.parse_args()
    if (not args.no_timestamp_suffix) and args.result_file:
        args.result_file = with_timestamp_suffix(args.result_file)

    frames_path = Path(args.frames).expanduser().resolve()
    result = {
        "ok": False,
        "stage": "",
        "frames_path": str(frames_path),
        "job_id": "",
        "watch_url": "",
        "download_url": "",
        "error_code": "",
        "error_message": "",
        "validation_errors": [],
        "quality_report": {},
        "quality_fixes": [],
    }

    if not frames_path.exists():
        result.update(
            stage="validate",
            error_code="FILE_NOT_FOUND",
            error_message=f"找不到文件: {frames_path}",
        )
        _emit_result(result, args.result_file)
        return 2

    result["stage"] = "validate"
    validation = _validate(frames_path)
    if not validation["ok"]:
        result.update(
            error_code="VALIDATION_FAILED",
            error_message=validation.get("error_message", "校验失败"),
            validation_errors=validation.get("validation_errors", []),
        )
        _emit_result(result, args.result_file)
        return 1

    try:
        payload = json.loads(frames_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        result.update(
            error_code="JSON_PARSE_FAILED",
            error_message=f"JSON 解析失败: {e}",
        )
        _emit_result(result, args.result_file)
        return 2

    if not args.skip_quality_check:
        quality = analyze_frames(payload)
        result["quality_report"] = quality
        if args.quality_min_total > 0 and quality.get("total_score", 0) < args.quality_min_total:
            if args.auto_fix_quality:
                fixed = auto_fix_frames(payload)
                if fixed.get("ok"):
                    fixed_payload = fixed.get("fixed_data", payload)
                    fixed_quality = analyze_frames(fixed_payload)
                    result["quality_fixes"] = fixed.get("fixes", [])
                    result["quality_report"] = {
                        "before": quality,
                        "after": fixed_quality,
                        "auto_fix_applied": True,
                    }
                    if fixed_quality.get("total_score", 0) >= args.quality_min_total:
                        payload = fixed_payload
                        frames_path.write_text(
                            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8",
                        )
                    else:
                        result.update(
                            stage="quality",
                            error_code="QUALITY_SCORE_TOO_LOW",
                            error_message=(
                                f"自动修复后质量总分 {fixed_quality.get('total_score', 0)} "
                                f"仍低于阈值 {args.quality_min_total}"
                            ),
                        )
                        _emit_result(result, args.result_file)
                        return 1
                else:
                    result.update(
                        stage="quality",
                        error_code="QUALITY_AUTO_FIX_FAILED",
                        error_message=fixed.get("error", "自动修复失败"),
                    )
                    _emit_result(result, args.result_file)
                    return 1
            else:
                result.update(
                    stage="quality",
                    error_code="QUALITY_SCORE_TOO_LOW",
                    error_message=(
                        f"质量总分 {quality.get('total_score', 0)} "
                        f"低于阈值 {args.quality_min_total}"
                    ),
                )
                _emit_result(result, args.result_file)
                return 1

    result["stage"] = "submit"
    server = args.server.rstrip("/")
    root_status, root_data = _get_json(f"{server}/", timeout_s=10)
    if root_status == 0:
        result.update(
            error_code="SERVICE_UNAVAILABLE",
            error_message=f"渲染服务不可用（可能未启动）: {root_data.get('network_error', 'unknown')}",
        )
        _emit_result(result, args.result_file)
        return 1
    status, submit_data = _post_json(f"{server}/render", payload, timeout_s=30)
    if status >= 400:
        detail = submit_data.get("detail", submit_data)
        result.update(
            error_code="SUBMIT_FAILED",
            error_message="提交渲染失败",
            validation_errors=detail.get("errors", [])
            if isinstance(detail, dict)
            else [],
        )
        _emit_result(result, args.result_file)
        return 1
    if status == 0:
        result.update(
            error_code="SERVICE_UNAVAILABLE",
            error_message=f"渲染服务不可用（网络异常）: {submit_data.get('network_error', 'unknown')}",
        )
        _emit_result(result, args.result_file)
        return 1

    job_id = str(submit_data.get("job_id", "")).strip()
    if not job_id:
        result.update(
            error_code="SUBMIT_INVALID_RESPONSE",
            error_message="提交成功但响应缺少 job_id",
        )
        _emit_result(result, args.result_file)
        return 1

    result["job_id"] = job_id
    result["watch_url"] = f"{server}/watch/{job_id}" if job_id else ""
    result["download_url"] = f"{server}/download/{job_id}" if job_id else ""
    result["last_status"] = {}

    if args.no_wait:
        result.update(ok=True, stage="submitted", error_code="", error_message="")
        _emit_result(result, args.result_file)
        return 0

    deadline = time.time() + args.timeout
    result["stage"] = "poll"
    while time.time() < deadline:
        status_code, data = _get_json(f"{server}/status/{job_id}", timeout_s=20)
        if status_code >= 400:
            result.update(
                error_code="STATUS_FAILED",
                error_message=f"查询状态失败: HTTP {status_code}",
            )
            _emit_result(result, args.result_file)
            return 1
        if status_code == 0:
            result.update(
                error_code="SERVICE_UNAVAILABLE",
                error_message=f"渲染服务不可用（轮询异常）: {data.get('network_error', 'unknown')}",
            )
            _emit_result(result, args.result_file)
            return 1

        result["last_status"] = {
            "status": data.get("status", ""),
            "stage": data.get("stage", ""),
            "stage_label": data.get("stage_label", ""),
            "progress": data.get("progress", 0),
        }
        job_status = data.get("status", "")
        if job_status == "done":
            result.update(ok=True, stage="done", error_code="", error_message="")
            _emit_result(result, args.result_file)
            return 0
        if job_status == "error":
            result.update(
                stage="error",
                error_code="RENDER_FAILED",
                error_message=data.get("error", "渲染失败"),
            )
            _emit_result(result, args.result_file)
            return 1
        time.sleep(args.poll_interval)

    result.update(
        stage="timeout",
        error_code="TIMEOUT",
        error_message=f"渲染超时（>{args.timeout}s）",
    )
    _emit_result(result, args.result_file)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
