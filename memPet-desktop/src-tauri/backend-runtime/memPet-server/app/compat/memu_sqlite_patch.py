from __future__ import annotations

import inspect
import sqlite3
import types
from pathlib import Path
from typing import Any
from typing import Union
from typing import get_args, get_origin

from pydantic import BaseModel
from sqlmodel import SQLModel


def apply_memu_sqlite_pydantic_patch() -> bool:
    """Apply runtime patch for memu SQLite dynamic model construction.

    Upstream reference:
    - https://github.com/NevaMind-AI/memU/issues/14
    - https://github.com/NevaMind-AI/memU/pull/26
    """
    from memu.database.sqlite import models as sqlite_models
    from memu.database.sqlite import schema as sqlite_schema

    source = inspect.getsource(sqlite_models.build_sqlite_table_model)
    if "__annotations__" in source:
        # Upstream likely already fixed; no patch needed.
        return False

    def _is_list_float_annotation(annotation: Any) -> bool:
        origin = get_origin(annotation)
        if origin is list:
            args = get_args(annotation)
            return len(args) == 1 and args[0] is float
        if origin in (types.UnionType, Union):
            return any(_is_list_float_annotation(arg) for arg in get_args(annotation) if arg is not type(None))
        return False

    def _patched_build_sqlite_table_model(
        user_model: type[BaseModel],
        core_model: type[SQLModel],
        *,
        tablename: str,
        metadata: Any | None = None,
        extra_table_args: tuple[Any, ...] | None = None,
        unique_with_scope: list[str] | None = None,
    ) -> type[SQLModel]:
        if tablename.startswith("sqlite_"):
            tablename = f"memu_{tablename[len('sqlite_'):]}"

        overlap = set(user_model.model_fields) & set(core_model.model_fields)
        if overlap:
            msg = f"Scope fields conflict with core model fields: {sorted(overlap)}"
            raise TypeError(msg)

        scope_fields = list(user_model.model_fields.keys())
        base_table_args, table_kwargs = sqlite_models._normalize_table_args(
            getattr(core_model, "__table_args__", None)
        )
        table_args = list(base_table_args)
        if extra_table_args:
            table_args.extend(extra_table_args)
        if scope_fields:
            table_args.append(sqlite_models.Index(f"ix_{tablename}__scope", *scope_fields))
        if unique_with_scope:
            unique_cols = [*unique_with_scope, *scope_fields]
            table_args.append(sqlite_models.Index(f"ix_{tablename}__unique_scoped", *unique_cols, unique=True))

        base_attrs: dict[str, Any] = {"__module__": core_model.__module__, "__tablename__": tablename}
        if metadata is not None:
            base_attrs["metadata"] = metadata
        if table_args or table_kwargs:
            if table_kwargs:
                base_attrs["__table_args__"] = (*table_args, table_kwargs)
            else:
                base_attrs["__table_args__"] = tuple(table_args)

        base = sqlite_models._merge_models(user_model, core_model, name_suffix="SQLiteBase", base_attrs=base_attrs)

        # Pydantic 2.12+ requires explicit type annotations for dynamically injected fields.
        new_attrs: dict[str, Any] = {
            "__module__": core_model.__module__,
            "__tablename__": tablename,
            "__annotations__": {},
        }
        if metadata is not None:
            new_attrs["metadata"] = metadata
        if table_args or table_kwargs:
            if table_kwargs:
                new_attrs["__table_args__"] = (*table_args, table_kwargs)
            else:
                new_attrs["__table_args__"] = tuple(table_args)

        for field_name, field_info in base.model_fields.items():
            annotation = field_info.annotation
            new_attrs["__annotations__"][field_name] = annotation

            if _is_list_float_annotation(annotation):
                new_attrs[field_name] = sqlite_models.Field(
                    default=None,
                    sa_column=sqlite_models.Column(sqlite_models.JSON, nullable=True),
                )
            else:
                new_attrs[field_name] = field_info

        return type(
            f"{user_model.__name__}{core_model.__name__}SQLiteTable",
            (SQLModel,),
            new_attrs,
            table=True,
        )

    sqlite_models.build_sqlite_table_model = _patched_build_sqlite_table_model
    sqlite_schema.build_sqlite_table_model = _patched_build_sqlite_table_model
    sqlite_schema._MODEL_CACHE.clear()
    return True


def _sqlite_db_path_from_dsn(dsn: str) -> Path | None:
    """Extract filesystem path from sqlite dsn."""
    if not dsn.startswith("sqlite:///"):
        return None
    db_path = dsn.replace("sqlite:///", "", 1)
    if db_path == ":memory:":
        return None
    return Path(db_path)


def ensure_memu_sqlite_schema_columns(dsn: str) -> list[str]:
    """Ensure required memU sqlite columns exist for older databases.

    memU 的 SQLite 表结构在不同版本间有演进；旧库可能缺少新字段，
    会在查询时触发 `no such column`。这里做向后兼容的增量补齐。
    """
    db_path = _sqlite_db_path_from_dsn(dsn)
    if db_path is None or not db_path.exists():
        return []

    required_columns: dict[str, dict[str, str]] = {
        "memu_memory_categories": {
            "embedding": "JSON",
        },
        "memu_memory_items": {
            "embedding": "JSON",
            "happened_at": "DATETIME",
            "extra": "JSON",
        },
        "memu_resources": {
            "embedding": "JSON",
        },
    }

    applied: list[str] = []

    with sqlite3.connect(db_path) as conn:
        cursor = conn.cursor()
        for table_name, table_cols in required_columns.items():
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table_name,))
            if cursor.fetchone() is None:
                continue

            cursor.execute(f"PRAGMA table_info('{table_name}')")
            existing_cols = {row[1] for row in cursor.fetchall()}

            for col_name, col_type in table_cols.items():
                if col_name in existing_cols:
                    continue
                cursor.execute(f'ALTER TABLE "{table_name}" ADD COLUMN "{col_name}" {col_type}')
                applied.append(f"{table_name}.{col_name}")

        if applied:
            conn.commit()

    return applied
