import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]


def test_validate_json_script_passes() -> None:
    """确保 pytest 至少覆盖一个本地脚本契约，避免 no tests ran。"""
    result = subprocess.run(
        [sys.executable, "scripts/validate_json.py"],
        cwd=REPO_ROOT,
        check=False,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stderr
    assert "Validated" in result.stdout
