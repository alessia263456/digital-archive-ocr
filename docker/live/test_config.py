"""Offline checks of the live Compose model. Run with python3 docker/live/test_config.py."""
import json
import os
from pathlib import Path
import subprocess
import unittest


def config(**inputs):
    env = os.environ.copy()
    for key in (
        "APP_KEY", "DB_PASSWORD", "DOCUMENTS_DISK", "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY", "R2_BUCKET", "R2_ENDPOINT", "R2_DEFAULT_REGION",
        "R2_USE_PATH_STYLE_ENDPOINT",
    ):
        env.pop(key, None)
    env.update(inputs)
    return subprocess.run(
        ["docker", "compose", "--profile", "smoke", "--env-file", "/dev/null", "-f",
         str(Path(__file__).with_name("compose.yaml")), "config", "--format", "json"],
        env=env, capture_output=True, text=True,
    )


class LiveConfig(unittest.TestCase):
    def test_signed_delivery_smoke_script_has_valid_bash_syntax(self):
        script = Path(__file__).with_name("tests") / "signed-delivery-smoke.sh"
        result = subprocess.run(["bash", "-n", str(script)], capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_missing_inputs_are_named(self):
        required = [
            "APP_KEY", "DB_PASSWORD", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
            "R2_BUCKET", "R2_ENDPOINT",
        ]
        supplied = {key: "validation-only" for key in required}
        for missing in required:
            with self.subTest(missing=missing):
                result = config(**{key: value for key, value in supplied.items() if key != missing})
                self.assertNotEqual(result.returncode, 0)
                self.assertIn(missing, result.stderr)

    def test_only_edge_publishes_ports_and_mounts_credentials(self):
        result = config(
            APP_KEY="validation-only", DB_PASSWORD="validation-only",
            R2_ACCESS_KEY_ID="validation-only", R2_SECRET_ACCESS_KEY="validation-only",
            R2_BUCKET="validation-only", R2_ENDPOINT="https://example.eu.r2.cloudflarestorage.com",
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        model = json.loads(result.stdout)
        services = model["services"]
        self.assertEqual(set(services), {"caddy", "backend", "postgres", "ocr-worker", "ocr-queue-worker"})
        self.assertEqual({p["published"] for p in services["caddy"]["ports"]}, {"80", "443"})
        mounts = {v["target"]: v for v in services["caddy"]["volumes"]}
        self.assertTrue(mounts["/run/secrets/placeholder-auth"]["read_only"])
        self.assertTrue(model["volumes"][mounts["/data"]["source"]]["external"])
        for name in ("backend", "postgres", "ocr-worker", "ocr-queue-worker"):
            self.assertFalse(services[name].get("ports"))
            for mount in services[name].get("volumes", []):
                self.assertNotIn(mount["target"], ("/data", "/run/secrets/placeholder-auth"))
        self.assertEqual(services["backend"]["environment"]["APP_ENV"], "production")
        backend_env = services["backend"]["environment"]
        self.assertEqual(backend_env["SANCTUM_STATEFUL_DOMAINS"], "arhivar.swedencentral.cloudapp.azure.com")
        self.assertEqual(backend_env["SESSION_DRIVER"], "database")
        self.assertEqual(backend_env["SESSION_LIFETIME"], "30")
        self.assertEqual(backend_env["SESSION_EXPIRE_ON_CLOSE"], "true")
        self.assertEqual(backend_env["SESSION_ENCRYPT"], "true")
        self.assertEqual(backend_env["SESSION_HTTP_ONLY"], "true")
        self.assertEqual(backend_env["SESSION_SAME_SITE"], "lax")
        self.assertEqual(backend_env["SESSION_SECURE_COOKIE"], "true")
        self.assertEqual(backend_env["DOCUMENTS_DISK"], "r2")
        self.assertEqual(backend_env["R2_DEFAULT_REGION"], "auto")
        self.assertEqual(backend_env["R2_USE_PATH_STYLE_ENDPOINT"], "false")
        self.assertEqual(backend_env["R2_ENDPOINT"], "https://example.eu.r2.cloudflarestorage.com")
        worker_env = services["ocr-queue-worker"]["environment"]
        self.assertEqual(worker_env["QUEUE_CONNECTION"], "database")
        self.assertEqual(worker_env["DB_QUEUE_RETRY_AFTER"], "8100")
        self.assertEqual(worker_env["DOCUMENTS_DISK"], backend_env["DOCUMENTS_DISK"])
        self.assertEqual(worker_env["R2_ENDPOINT"], backend_env["R2_ENDPOINT"])

    def test_caddy_forwards_sanctum_without_access_logging_and_sets_a_restrictive_csp(self):
        caddyfile = Path(__file__).with_name("Caddyfile").read_text()
        self.assertIn("@laravel path /up /api /api/* /sanctum /sanctum/*", caddyfile)
        self.assertIn("Content-Security-Policy \"default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'\"", caddyfile)
        self.assertNotIn("log {", caddyfile)


if __name__ == "__main__":
    unittest.main()
