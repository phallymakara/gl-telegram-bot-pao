from sqlalchemy import text
from app.core.database import Base, engine
from app.db.base import Product, PurchaseOrder

def migrate():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE products ADD COLUMN IF NOT EXISTS conversion_factor DOUBLE PRECISION DEFAULT 1.0;
            ALTER TABLE products ALTER COLUMN product_code DROP NOT NULL;
            ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS region VARCHAR(20) DEFAULT 'LOCAL';
        """))
        conn.commit()
        print("Database migration completed successfully! Products, purchase_orders, and orders tables updated in PostgreSQL.")

if __name__ == "__main__":
    migrate()
