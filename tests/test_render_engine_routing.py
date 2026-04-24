import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from tools import remotion_renderer
from utils import render_engine_router


class RenderEngineRoutingTests(unittest.TestCase):
    def test_pick_engine_legacy_explicit(self):
        engine, reason = render_engine_router.pick_render_engine(
            "legacy",
            default_engine="auto",
            remotion_enabled=False,
            remotion_project_dir="/tmp/no-project",
        )
        self.assertEqual(engine, "legacy")
        self.assertIn("legacy", reason)

    def test_pick_engine_remotion_when_healthy(self):
        with mock.patch("utils.render_engine_router.os.path.isdir", return_value=True), mock.patch(
            "utils.render_engine_router.os.path.isfile", return_value=True
        ):
            engine, reason = render_engine_router.pick_render_engine(
                "remotion",
                default_engine="auto",
                remotion_enabled=True,
                remotion_project_dir="/tmp/remotion-demo",
            )
        self.assertEqual(engine, "remotion")
        self.assertIn("通过", reason)

    def test_pick_engine_auto_fallback(self):
        engine, reason = render_engine_router.pick_render_engine(
            "auto",
            default_engine="auto",
            remotion_enabled=False,
            remotion_project_dir="/tmp/no-project",
        )
        self.assertEqual(engine, "legacy")
        self.assertIn("回退", reason)


class RemotionPropsTests(unittest.TestCase):
    def test_build_remotion_slides_without_audio(self):
        data = {
            "meta": {"topic": "测试", "min_seg_sec": 2.8, "max_seg_sec": 9},
            "frames": [
                {"id": "a", "type": "hook", "title": "T", "script": "x" * 80},
                {"id": "b", "type": "cards", "title": "C", "script": "y" * 200},
            ],
        }
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp) / "frames.json"
            p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            props = remotion_renderer.build_remotion_props(data, str(p), fps=30)
        self.assertEqual(len(props["slides"]), 2)
        self.assertEqual(props["slides"][0]["id"], "a")
        self.assertGreater(props["slides"][0]["durationInFrames"], 0)
        self.assertEqual(props["slides"][0]["frame"]["title"], "T")

    def test_build_remotion_slides_uses_audio_duration(self):
        data = {
            "meta": {"topic": "测", "min_seg_sec": 2.8, "max_seg_sec": 9},
            "frames": [{"id": "seg1", "type": "hook", "title": "T", "script": "短"}],
        }
        with tempfile.TemporaryDirectory() as tmp:
            base = Path(tmp)
            (base / "audio").mkdir()
            (base / "audio" / "seg1.mp3").write_bytes(b"fake")
            p = base / "frames.json"
            p.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            with mock.patch.object(
                remotion_renderer,
                "ffprobe_duration_seconds",
                return_value=5.0,
            ):
                props = remotion_renderer.build_remotion_props(data, str(p), fps=30)
        self.assertEqual(props["slides"][0]["durationInFrames"], 150)


if __name__ == "__main__":
    unittest.main()
