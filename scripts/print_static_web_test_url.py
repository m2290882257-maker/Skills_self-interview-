#!/usr/bin/env python3
"""打印可直接打开的静态测试页 file:// URL。"""

from pathlib import Path
import sys


def main() -> int:
    repo_root = Path(__file__).resolve().parents[1]
    index_file = repo_root / "static_web_test" / "index.html"
    if not index_file.exists():
        print(f"❌ missing file: {index_file}", file=sys.stderr)
        return 1

    print("✅ 可直接在浏览器打开（无需本地服务）：")
    print(index_file.resolve().as_uri())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
