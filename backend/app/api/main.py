import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect as sa_inspect, text
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from app.api.router import api_router
from app.core.database import Base, engine
from app.core.logging import setup_logging
from app.services.activity_log_service import (
    extract_client_ip,
    reset_request_audit_context,
    set_request_audit_context,
)

setup_logging()
logger = logging.getLogger(__name__)

app = FastAPI(title="Gold Bot Admin API")

cors_origins_str = os.getenv("CORS_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTINE_POLLING_PREFIXES = (
    "/api/orders",
    "/api/purchase-orders",
    "/api/deposits",
    "/api/withdrawals",
    "/api/dashboard/stock-matrix",
    "/api/dashboard/summary",
    "/health",
)


def _is_routine_polling(path: str) -> bool:
    clean = path.rstrip("/")
    return any(clean.startswith(prefix) for prefix in ROUTINE_POLLING_PREFIXES)


def _format_http_log(
    method: str,
    path: str,
    status_code: int,
    duration_ms: float,
    client_ip: str | None = None,
) -> str:
    """Format HTTP request into a concise colorized line."""
    # Method color
    if method == "GET":
        method_str = f"\033[34m{method}\033[0m"       # Blue
    elif method == "POST":
        method_str = f"\033[32m{method}\033[0m"      # Green
    elif method in ("PUT", "PATCH"):
        method_str = f"\033[33m{method}\033[0m"      # Yellow
    elif method == "DELETE":
        method_str = f"\033[31m{method}\033[0m"      # Red
    else:
        method_str = method

    # Status code color
    if status_code < 300:
        status_str = f"\033[32m{status_code}\033[0m"  # Green (2xx)
    elif status_code < 400:
        status_str = f"\033[36m{status_code}\033[0m"  # Cyan (3xx)
    elif status_code < 500:
        status_str = f"\033[33m{status_code}\033[0m"  # Yellow (4xx)
    else:
        status_str = f"\033[31m{status_code}\033[0m"  # Red (5xx)

    # Duration color
    formatted_ms = f"{duration_ms:.1f}ms"
    if duration_ms > 1000:
        duration_str = f"\033[31m({formatted_ms})\033[0m"  # Red for slow (>1s)
    elif duration_ms > 300:
        duration_str = f"\033[33m({formatted_ms})\033[0m"  # Yellow for warning (>300ms)
    else:
        duration_str = f"\033[90m({formatted_ms})\033[0m"  # Muted gray

    ip_suffix = f" [ip={client_ip}]" if client_ip and status_code >= 400 else ""
    return f"{method_str} {path} {status_str} {duration_str}{ip_suffix}"


@app.middleware("http")
async def log_requests(request: Request, call_next):
    auth_header = request.headers.get("authorization", "")
    bearer_token = (
        auth_header[7:].strip()
        if auth_header.lower().startswith("bearer ")
        else None
    )
    client_ip = extract_client_ip(request)
    ctx_token = set_request_audit_context(
        bearer_token=bearer_token,
        x_user_id=request.headers.get("x-user-id"),
        ip_address=client_ip,
        user_agent=request.headers.get("user-agent"),
        method=request.method,
        path=request.url.path,
    )
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        duration_ms = (time.time() - start_time) * 1000
        logger.error(
            "%s %s failed after %.1fms: %s [ip=%s]",
            request.method,
            request.url.path,
            duration_ms,
            exc,
            client_ip,
            exc_info=True,
        )
        raise
    finally:
        reset_request_audit_context(ctx_token)

    duration_ms = (time.time() - start_time) * 1000
    status_code = response.status_code
    log_line = _format_http_log(request.method, request.url.path, status_code, duration_ms, client_ip)

    if status_code >= 500:
        logger.error(log_line)
    elif status_code >= 400:
        logger.warning(log_line)
    elif request.method in ("POST", "PUT", "PATCH", "DELETE"):
        logger.info(log_line)
    elif _is_routine_polling(request.url.path):
        logger.debug(log_line)
    else:
        logger.info(log_line)

    return response


@app.on_event("startup")
def on_startup():
    setup_logging()
    import app.db.base
    Base.metadata.create_all(bind=engine)

    # Dynamically add any missing columns to existing tables
    try:
        inspector = sa_inspect(engine)
        for table_name, table in Base.metadata.tables.items():
            if table_name not in inspector.get_table_names():
                continue
            existing_cols = {col["name"] for col in inspector.get_columns(table_name)}
            missing = [c for c in table.columns if c.name not in existing_cols]
            if not missing:
                continue
            with engine.connect() as conn:
                for column in missing:
                    col_type = column.type.compile(dialect=engine.dialect)
                    stmt = f"ALTER TABLE {table_name} ADD COLUMN IF NOT EXISTS {column.name} {col_type}"
                    logger.info("Auto-migrate: %s", stmt)
                    conn.execute(text(stmt))
                conn.commit()
    except Exception as err:
        logger.warning("Auto column migration notice: %s", err)

    logger.info("Database tables initialized successfully.")


# Include consolidated API router under /api
app.include_router(api_router, prefix="/api")

# Static files for uploaded customer receipts and payment slips
from pathlib import Path
from fastapi.staticfiles import StaticFiles
uploads_dir = Path(__file__).resolve().parent.parent.parent / "uploads"
uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/health")
@app.get("/api/health")
def health():
    return {"status": "ok"}
