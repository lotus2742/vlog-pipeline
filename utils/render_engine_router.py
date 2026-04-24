#!/usr/bin/env python3
import os

VALID_ENGINES = {"legacy", "remotion", "auto"}


def normalize_engine(engine: str) -> str:
    candidate = str(engine or "").strip().lower()
    return candidate if candidate in VALID_ENGINES else "auto"


def resolve_requested_engine(req_engine: str, default_engine: str = "auto") -> str:
    normalized_req = normalize_engine(req_engine)
    if normalized_req != "auto":
        return normalized_req
    normalized_default = normalize_engine(default_engine)
    return normalized_default if normalized_default != "auto" else "auto"


def remotion_healthcheck(remotion_enabled: bool, project_dir: str) -> tuple[bool, str]:
    project_dir = os.path.abspath(project_dir)
    package_json = os.path.join(project_dir, "package.json")
    src_root = os.path.join(project_dir, "src", "Root.tsx")
    if not remotion_enabled:
        return False, "REMOTION_ENABLED 未开启"
    if not os.path.isdir(project_dir):
        return False, f"Remotion 项目目录不存在: {project_dir}"
    if not os.path.isfile(package_json):
        return False, f"Remotion 缺少 package.json: {package_json}"
    if not os.path.isfile(src_root):
        return False, f"Remotion 缺少入口文件: {src_root}"
    return True, "ok"


def pick_render_engine(
    requested_engine: str,
    *,
    default_engine: str,
    remotion_enabled: bool,
    remotion_project_dir: str,
) -> tuple[str, str]:
    req = resolve_requested_engine(requested_engine, default_engine=default_engine)
    if req == "legacy":
        return "legacy", "显式指定 legacy"
    if req == "remotion":
        ok, reason = remotion_healthcheck(remotion_enabled, remotion_project_dir)
        if ok:
            return "remotion", "显式指定 remotion 且健康检查通过"
        return "legacy", f"remotion 不可用，已回退 legacy: {reason}"
    ok, reason = remotion_healthcheck(remotion_enabled, remotion_project_dir)
    if ok:
        return "remotion", "auto 模式命中 remotion"
    return "legacy", f"auto 模式回退 legacy: {reason}"
