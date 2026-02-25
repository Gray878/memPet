#!/usr/bin/env python3
"""导出 memPet-server OpenAPI 契约到 JSON 文件。"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))


def fetch_openapi_from_url(url: str) -> dict:
    with urlopen(url, timeout=10) as response:  # nosec B310 - 仅本地 URL
        payload = response.read().decode("utf-8")
    return json.loads(payload)


def load_openapi_from_app() -> dict:
    from app.main import app  # 延迟导入，避免无谓初始化

    return app.openapi()


def main() -> int:
    parser = argparse.ArgumentParser(description="导出 memPet-server OpenAPI 契约")
    parser.add_argument(
        "--output",
        default="docs/openapi.json",
        help="输出路径（默认 docs/openapi.json）",
    )
    parser.add_argument(
        "--url",
        default="http://127.0.0.1:8000/openapi.json",
        help="优先从运行中服务拉取 OpenAPI 的地址",
    )
    args = parser.parse_args()

    output_path = Path(args.output).resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    schema: dict | None = None
    fetch_error: str | None = None

    try:
        schema = fetch_openapi_from_url(args.url)
        print(f"✓ 从运行中服务导出: {args.url}")
    except (URLError, OSError, TimeoutError, json.JSONDecodeError) as exc:
        fetch_error = str(exc)

    if schema is None:
        try:
            schema = load_openapi_from_app()
            print("✓ 从应用实例导出 OpenAPI")
        except Exception as exc:  # pragma: no cover
            print("✗ 导出失败：无法从 URL 或应用实例获取 OpenAPI", file=sys.stderr)
            if fetch_error:
                print(f"  URL 拉取失败: {fetch_error}", file=sys.stderr)
            print(f"  应用实例失败: {exc}", file=sys.stderr)
            print("  建议：先启动 memPet-server，再执行该脚本。", file=sys.stderr)
            return 1

    output_path.write_text(
        json.dumps(schema, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"✓ OpenAPI 已写入: {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
