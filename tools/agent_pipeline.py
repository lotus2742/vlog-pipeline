#!/usr/bin/env python3
import argparse
from datetime import datetime, timezone
import hashlib
import json
import re
import select
import shlex
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid
from pathlib import Path

# 兼容从项目根目录或 tools 目录执行
PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from frame_expander import expand_long_frames
from frame_style_policy import optimize_frame_styles
from json_sanitize import sanitize_json_file
from quality_check import analyze_frames, auto_fix_frames

METRICS_FILE_PATH = PROJECT_ROOT / "metrics" / "runs.jsonl"
PIPELINE_STARTED_AT = 0.0


def with_timestamp_suffix(path_str: str) -> str:
    p = Path(path_str).expanduser().resolve()
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    token = uuid.uuid4().hex[:6]
    return str(p.with_name(f"{p.stem}_{ts}_{token}{p.suffix}"))


def build_run_frames_path(source_path: Path) -> Path:
    ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    token = uuid.uuid4().hex[:6]
    return source_path.with_name(f"{source_path.stem}_{ts}_{token}{source_path.suffix}")


def _generate_fresh_frames(generate_cmd_template: str, output_path: Path) -> tuple[bool, str]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    cmd = generate_cmd_template.format(output=shlex.quote(str(output_path)))
    proc = subprocess.run(cmd, shell=True, text=True, capture_output=True)
    if proc.stdout.strip():
        print(proc.stdout.rstrip())
    if proc.returncode != 0:
        err_text = proc.stderr.strip() or "生成命令执行失败"
        return False, err_text
    return True, ""


def _looks_like_copy_cmd(cmd: str) -> bool:
    """
    检测“复制 JSON 伪装生成”的命令形态。
    典型示例: cp tmp/foo.json {output}
    """
    s = (cmd or "").strip().lower()
    if not s:
        return False
    # 允许空白变体，统一压缩后匹配。
    s = re.sub(r"\s+", " ", s)
    return (" cp " in f" {s} " or s.startswith("cp ")) and "{output}" in s


def _validate_source_doc_guard(source_doc: str, generate_cmd: str) -> tuple[bool, str]:
    """
    来源一致性硬校验：
    - 提供了 source_doc 时，generate_cmd 必须显式引用该文档路径。
    - 禁止使用 cp tmp/*.json {output} 之类旧样例复制命令。
    """
    source_doc = (source_doc or "").strip()
    if not source_doc:
        return True, ""

    doc_path = Path(source_doc).expanduser().resolve()
    if not doc_path.exists():
        return False, f"source_doc 不存在: {doc_path}"
    if doc_path.suffix.lower() not in {".md", ".docx", ".pdf"}:
        return False, f"source_doc 扩展名不支持: {doc_path.suffix}（仅支持 .md/.docx/.pdf）"

    cmd = (generate_cmd or "").strip()
    if not cmd:
        return False, "缺少 generate_cmd"
    if _looks_like_copy_cmd(cmd):
        return False, (
            "检测到复制命令（cp ... {output}）。"
            "禁止用复制 JSON 伪装生成，请改为基于 source_doc 的真实生成命令。"
        )
    # 要求命令中显式包含 source_doc 路径，避免“只传 output”的黑盒误用。
    if str(doc_path) not in cmd:
        return False, (
            "generate_cmd 未显式引用 source_doc。"
            "请将源文档路径作为输入参数传入生成命令。"
        )
    return True, str(doc_path)


def _sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def _emit_result(result: dict, result_file: str = "") -> None:
    text = json.dumps(result, ensure_ascii=False, indent=2)
    if result_file:
        Path(result_file).expanduser().resolve().write_text(text + "\n", encoding="utf-8")
    elapsed_ms = int((time.time() - PIPELINE_STARTED_AT) * 1000) if PIPELINE_STARTED_AT else 0
    metrics_record = {
        "ts": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "elapsed_ms": elapsed_ms,
        "ok": result.get("ok"),
        "stage": result.get("stage", ""),
        "error_code": result.get("error_code", ""),
        "job_id": result.get("job_id", ""),
        "source_frames_path": result.get("source_frames_path", ""),
        "frames_path": result.get("frames_path", ""),
        "watch_url": result.get("watch_url", ""),
        "download_url": result.get("download_url", ""),
    }
    last_status = result.get("last_status")
    if isinstance(last_status, dict):
        metrics_record["last_status"] = {
            "status": last_status.get("status", ""),
            "stage": last_status.get("stage", ""),
            "stage_label": last_status.get("stage_label", ""),
            "progress": last_status.get("progress", 0),
        }
    try:
        METRICS_FILE_PATH.parent.mkdir(parents=True, exist_ok=True)
        with METRICS_FILE_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(metrics_record, ensure_ascii=False) + "\n")
    except Exception as e:
        print(f"[agent_pipeline] metrics write failed: {e}", file=sys.stderr)
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
    global METRICS_FILE_PATH, PIPELINE_STARTED_AT
    PIPELINE_STARTED_AT = time.time()
    parser = argparse.ArgumentParser(
        description="Agent 统一渲染入口：校验 -> 提交渲染 -> 轮询状态"
    )
    parser.add_argument(
        "--frames",
        default="",
        help="兼容参数：等价于 --output（建议改用 --output）",
    )
    parser.add_argument(
        "--output",
        default="",
        help="新建 frames.json 的输出路径模板（默认: ./tmp/generated_frames.json）",
    )
    parser.add_argument(
        "--generate-cmd",
        required=True,
        help="用于生成新 frames JSON 的命令，使用 {output} 占位输出文件路径",
    )
    parser.add_argument(
        "--source-doc",
        default="",
        help="可选：源文档路径（.md/.docx/.pdf）。提供后将启用来源一致性硬校验。",
    )
    parser.add_argument("--server", default="http://localhost:8765", help="渲染服务地址")
    parser.add_argument(
        "--engine",
        default="remotion",
        choices=["auto", "legacy", "remotion"],
        help="渲染引擎选择：auto/legacy/remotion（默认 remotion；仅在明确要求时使用 legacy）",
    )
    parser.add_argument(
        "--theme",
        default="",
        help="可选：强制指定主题（purple/ocean/dark/light），会写入 meta.theme",
    )
    parser.add_argument(
        "--theme-timeout-seconds",
        type=int,
        default=30,
        help="缺少主题时交互等待秒数，超时后自动使用默认 purple（默认 30）",
    )
    parser.add_argument(
        "--require-theme",
        action="store_true",
        help="强制要求必须明确指定主题；缺失时直接失败（默认关闭）",
    )
    parser.add_argument("--poll-interval", type=float, default=1.5, help="轮询间隔（秒）")
    parser.add_argument("--timeout", type=int, default=900, help="总超时（秒）")
    parser.add_argument(
        "--metrics-file",
        default=str(PROJECT_ROOT / "metrics" / "runs.jsonl"),
        help="指标输出文件路径（JSONL）",
    )
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
    METRICS_FILE_PATH = Path(args.metrics_file).expanduser().resolve()
    if (not args.no_timestamp_suffix) and args.result_file:
        args.result_file = with_timestamp_suffix(args.result_file)

    output_arg = (args.output or args.frames or "").strip()
    if not output_arg:
        output_arg = "./tmp/generated_frames.json"
    requested_frames_path = Path(output_arg).expanduser().resolve()
    frames_path = build_run_frames_path(requested_frames_path)
    result = {
        "ok": False,
        "stage": "",
        "source_doc": "",
        "source_frames_path": str(requested_frames_path),
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

    guard_ok, guard_detail = _validate_source_doc_guard(args.source_doc, args.generate_cmd)
    if not guard_ok:
        result.update(
            stage="generate",
            error_code="SOURCE_DOC_MISMATCH",
            error_message=guard_detail,
        )
        _emit_result(result, args.result_file)
        return 1
    if _looks_like_copy_cmd(args.generate_cmd):
        result.update(
            stage="generate",
            error_code="GENERATE_CMD_COPY_BLOCKED",
            error_message=(
                "generate_cmd 使用了 cp ... {output}。"
                "该操作已被禁用，请改为真实文档生成命令。"
            ),
        )
        _emit_result(result, args.result_file)
        return 1
    if args.source_doc:
        result["source_doc"] = guard_detail
        print(
            "[agent_pipeline] source mapping:"
            f" source_doc={guard_detail}"
            f" -> frames_json={frames_path}"
        )

    result["stage"] = "generate"
    generated_ok, generate_error = _generate_fresh_frames(args.generate_cmd, frames_path)
    if not generated_ok:
        result.update(
            error_code="GENERATE_FAILED",
            error_message=f"新建 frames.json 失败: {generate_error}",
        )
        _emit_result(result, args.result_file)
        return 1

    if not frames_path.exists():
        result.update(
            error_code="GENERATE_FAILED",
            error_message=f"生成命令执行后未产出文件: {frames_path}",
        )
        _emit_result(result, args.result_file)
        return 1

    # 防止“新文件名 + 旧内容拷贝”的伪生成，避免文档与 JSON 不匹配。
    # 仅在用户显式传入旧 --frames（作为基准文件）时启用该检查。
    legacy_frames_arg = (args.frames or "").strip()
    if legacy_frames_arg:
        legacy_frames_path = Path(legacy_frames_arg).expanduser().resolve()
    else:
        legacy_frames_path = None
    if legacy_frames_path and legacy_frames_path.exists() and legacy_frames_path != frames_path:
        try:
            if _sha256_file(legacy_frames_path) == _sha256_file(frames_path):
                result.update(
                    stage="generate",
                    error_code="GENERATE_STALE_COPY",
                    error_message=(
                        "检测到生成结果与旧 --frames 文件内容完全一致。"
                        "请使用基于源文档的生成命令，而不是直接复制旧 JSON。"
                    ),
                )
                _emit_result(result, args.result_file)
                return 1
        except Exception as e:
            print(f"[agent_pipeline] stale-copy check skipped: {e}", file=sys.stderr)

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

    valid_themes = {"purple", "ocean", "dark", "light"}
    if not isinstance(payload.get("meta"), dict):
        payload["meta"] = {}
    cli_theme = str(args.theme or "").strip().lower()
    if cli_theme:
        if cli_theme not in valid_themes:
            result.update(
                stage="validate",
                error_code="THEME_INVALID",
                error_message=(
                    f"--theme '{cli_theme}' 不合法，可选: {sorted(valid_themes)}"
                ),
            )
            _emit_result(result, args.result_file)
            return 1
        payload["meta"]["theme"] = cli_theme
        frames_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

    meta_theme = str(payload.get("meta", {}).get("theme", "")).strip().lower()
    if (not meta_theme) and args.require_theme:
        result.update(
            stage="validate",
            error_code="THEME_REQUIRED",
            error_message=(
                "完整链路执行前必须指定主题。请在 frames.json 的 meta.theme "
                "设置 purple/ocean/dark/light，或使用 --theme 参数。"
            ),
            validation_errors=["缺少 meta.theme（--require-theme 已开启）"],
        )
        _emit_result(result, args.result_file)
        return 1

    if not meta_theme:
        timeout_s = max(1, int(args.theme_timeout_seconds))
        picked = ""
        if sys.stdin.isatty():
            choices = "/".join(sorted(valid_themes))
            print(
                f"[agent_pipeline] 请选择主题 ({choices})，"
                f"{timeout_s} 秒内未输入将自动使用默认 purple：",
                file=sys.stderr,
            )
            try:
                readable, _, _ = select.select([sys.stdin], [], [], timeout_s)
                if readable:
                    user_input = sys.stdin.readline().strip().lower()
                    if user_input in valid_themes:
                        picked = user_input
                    elif user_input:
                        print(
                            f"[agent_pipeline] 输入主题 '{user_input}' 无效，已使用默认 purple",
                            file=sys.stderr,
                        )
                else:
                    print(
                        f"[agent_pipeline] {timeout_s} 秒未选择主题，已自动使用默认 purple",
                        file=sys.stderr,
                    )
            except Exception:
                # 交互读取失败时回退默认主题，不中断主流程。
                pass
        else:
            print(
                "[agent_pipeline] 非交互环境且未指定主题，已自动使用默认 purple",
                file=sys.stderr,
            )

        payload["meta"]["theme"] = picked or "purple"
        frames_path.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )

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
    payload["render_engine"] = args.engine
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
