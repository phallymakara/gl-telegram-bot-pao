import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect as sa_inspect, text

from app.api.router import api_router
from app.core.database import Base, engine

import os

logger = logging.getLogger(__name__)

app = FastAPI(title="Gold Bot Admin API")

cors_origins_str = os.getenv("CORS_ORIGINS", "*")
cors_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000
    logger.info(
        "HTTP %s %s -> Status %d (%.2fms)",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.on_event("startup")
def on_startup():
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


@app.get("/api/health")
def health():
    return {"status": "ok"}
