import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.database import engine, Base

logger = logging.getLogger(__name__)

app = FastAPI(title="Gold Bot Admin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    import app.db.base
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        for sql in [
            "ALTER TABLE customers ALTER COLUMN telegram_user_id DROP NOT NULL",
            "ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_telegram_user_id_key",
        ]:
            try:
                conn.execute(text(f"COMMIT"))
                conn.execute(text(sql))
            except Exception:
                pass


from app.api.routes import auth, users, orders, slots, dashboard, alerts, settings, customers

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(slots.router, prefix="/api/slots", tags=["slots"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
