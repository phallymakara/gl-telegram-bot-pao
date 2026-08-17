import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import engine, Base

logger = logging.getLogger(__name__)

import time
from fastapi import Request

app = FastAPI(title="Gold Bot Admin API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    logger.info("Database tables initialized successfully.")



from app.api.routes import auth, users, orders, slots, dashboard, alerts, settings, customers, inventory, suppliers, purchase_orders

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(orders.router, prefix="/api/orders", tags=["orders"])
app.include_router(slots.router, prefix="/api/slots", tags=["slots"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(settings.router, prefix="/api/settings", tags=["settings"])
app.include_router(customers.router, prefix="/api/customers", tags=["customers"])
app.include_router(inventory.router, prefix="/api/inventory", tags=["inventory"])
app.include_router(suppliers.router, prefix="/api/suppliers", tags=["suppliers"])
app.include_router(purchase_orders.router, prefix="/api/purchase-orders", tags=["purchase-orders"])


@app.get("/api/health")
def health():
    return {"status": "ok"}
