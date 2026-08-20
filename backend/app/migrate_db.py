from sqlalchemy import inspect as sa_inspect, text
from app.core.database import Base, engine

def migrate():
    Base.metadata.create_all(bind=engine)

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
                print(f"  Adding {table_name}.{column.name}")
                conn.execute(text(stmt))
            conn.commit()
    print("Auto-migration completed successfully.")

if __name__ == "__main__":
    migrate()
