import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

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

    # Safely migrate existing tables by auto-adding new columns if not present
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS name VARCHAR(150);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact VARCHAR(150);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS sex VARCHAR(20);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS dob VARCHAR(50);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS nation VARCHAR(100);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS address VARCHAR(255);"))
            conn.execute(text("ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;"))

            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS region VARCHAR(20) DEFAULT 'LOCAL';"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS channel VARCHAR(50) DEFAULT 'TELEGRAM';"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(150);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS sales_person VARCHAR(150);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS spot_price NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS telegram_user_id VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS username VARCHAR(100);"))
            conn.execute(text("ALTER TABLE orders ADD COLUMN IF NOT EXISTS slot_date_str VARCHAR(20);"))

            conn.execute(text("ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS vendor_code VARCHAR(100);"))

            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS po_type VARCHAR(20) DEFAULT 'LOCAL';"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS unit_type VARCHAR(20) DEFAULT 'Kg';"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS spot_price NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS premium NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD';"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS notes TEXT;"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50);"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS tracking_no VARCHAR(100);"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS customs_fee NUMERIC(12, 2);"))
            conn.execute(text("ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS port_of_origin VARCHAR(100);"))

            conn.commit()
    except Exception as err:
        logger.warning("Auto column migration notice: %s", err)

    logger.info("Database tables initialized successfully.")


# Include consolidated API router under /api
app.include_router(api_router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok"}
