"""Persistent run history backed by a local SQLite database."""
import sqlite3
import threading
import time
from pathlib import Path

_DB_PATH = Path(__file__).resolve().parent / ".crewai_data" / "run_history.db"
_lock = threading.Lock()


def _conn() -> sqlite3.Connection:
    _DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    c = sqlite3.connect(str(_DB_PATH), check_same_thread=False)
    c.row_factory = sqlite3.Row
    return c


def _init_db() -> None:
    with _conn() as c:
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS runs (
                id       TEXT PRIMARY KEY,
                ts       REAL NOT NULL,
                topic    TEXT NOT NULL,
                mode     TEXT NOT NULL,
                status   TEXT NOT NULL,
                elapsed  REAL,
                result   TEXT
            )
            """
        )
        c.commit()


_init_db()


def save_run(run_id: str, topic: str, mode: str, status: str,
             elapsed: float | None, result: str | None) -> None:
    with _lock, _conn() as c:
        c.execute(
            """
            INSERT OR REPLACE INTO runs (id, ts, topic, mode, status, elapsed, result)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (run_id, time.time(), topic, mode, status, elapsed, result),
        )
        # Keep only the last 100 runs
        c.execute(
            "DELETE FROM runs WHERE id NOT IN "
            "(SELECT id FROM runs ORDER BY ts DESC LIMIT 100)"
        )
        c.commit()


def get_history(limit: int = 20) -> list[dict]:
    with _lock, _conn() as c:
        rows = c.execute(
            "SELECT * FROM runs ORDER BY ts DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]
