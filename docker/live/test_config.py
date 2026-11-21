"""Offline checks of the live Compose model. Run with python3 docker/live/test_config.py."""
import json
import os
from pathlib import Path
import subprocess
import unittest


def config(**inputs):
    env = os.environ.copy()
    for key in ("APP_KEY", "DB_PASSWORD"):
        env.pop(key, None)
    env.update(inputs)
    return subprocess.run(
        ["docker", "compose", "--env-file", "/dev/null", "-f",
         str(Path(__file__).with_name("compose.yaml")), "config", "--format", "json"],
        env=env, capture_output=True, text=True,
    )


class LiveConfig(unittest.TestCase):
    def test_missing_inputs_are_named(self):
        for missing, supplied in [("APP_KEY", "DB_PASSWORD"), ("DB_PASSWORD", "APP_KEY")]:
            with self.subTest(missing=missing):
                result = config(**{supplied: "validation-only"})
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(missing, result.stderr)

    def test_only_edge_publishes_ports_and_mounts_credentials(self):
        result = config(APP_KEY="validation-only", DB_PASSWORD="validation-only")
        self.assertEqual(result.returncode, 0, result.stderr)
        model = json.loads(result.stdout)
        services = model["services"]
        self.assertEqual(set(services), {"caddy", "backend", "postgres", "ocr-worker"})
        self.assertEqual({p["published"] for p in services["caddy"]["ports"]}, {"80", "443"})
        mounts = {v["target"]: v for v in services["caddy"]["volumes"]}
        self.assertTrue(mounts["/run/secrets/placeholder-auth"]["read_only"])
        self.assertTrue(model["volumes"][mounts["/data"]["source"]]["external"])
        for name in ("backend", "postgres", "ocr-worker"):
            self.assertFalse(services[name].get("ports"))
            for mount in services[name].get("volumes", []):
                self.assertNotIn(mount["target"], ("/data", "/run/secrets/placeholder-auth"))
        self.assertEqual(services["backend"]["environment"]["APP_ENV"], "production")


if __name__ == "__main__":
    unittest.main()
