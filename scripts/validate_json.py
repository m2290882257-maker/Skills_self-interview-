#!/usr/bin/env python3
"""Validate JSON files used by skills fixtures/schemas/data."""

from __future__ import annotations

import json
from glob import glob


TARGETS = ["data/*.json", "schemas/*.json", "tests/fixtures/*.json"]


def main() -> None:
    paths = []
    for pattern in TARGETS:
        paths.extend(glob(pattern))

    for path in sorted(paths):
        with open(path, "r", encoding="utf-8") as f:
            json.load(f)

    print(f"Validated {len(paths)} JSON files.")


if __name__ == "__main__":
    main()
