from sqlalchemy import text
from app.core.database import Base, engine
from app.db.base import Product, PurchaseOrder

def migrate():
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE purchase_orders ALTER COLUMN spot_price TYPE NUMERIC(20,2);
            ALTER TABLE purchase_orders ALTER COLUMN premium TYPE NUMERIC(20,2);
            ALTER TABLE purchase_orders ALTER COLUMN unit_cost TYPE NUMERIC(20,2);
            ALTER TABLE purchase_orders ALTER COLUMN total_cost TYPE NUMERIC(20,2);
            ALTER TABLE purchase_orders ALTER COLUMN quantity TYPE NUMERIC(20,3);
            ALTER TABLE orders ALTER COLUMN quantity TYPE NUMERIC(20,3);
            ALTER TABLE orders ALTER COLUMN premium TYPE NUMERIC(20,2);
            ALTER TABLE orders ALTER COLUMN premium_amount TYPE NUMERIC(20,2);
            ALTER TABLE products ALTER COLUMN conversion_factor TYPE DOUBLE PRECISION;
            ALTER TABLE orders ADD COLUMN IF NOT EXISTS region VARCHAR(20) DEFAULT 'LOCAL';
            ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS product_type VARCHAR(100);
        """))
        conn.commit()
        print("Database migration completed successfully! Products, purchase_orders, and orders tables updated in PostgreSQL.")

if __name__ == "__main__":
    migrate()
