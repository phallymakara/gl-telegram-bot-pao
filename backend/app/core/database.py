"""
Database Engine & Session Management.
Initializes SQLAlchemy connection pool, sessionmaker factory (SessionLocal), and declarative Base class for ORM models.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import DATABASE_URL

# Global SQLAlchemy database engine
engine = create_engine(DATABASE_URL)

# Thread-local database session factory
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# Declarative ORM Base class for database models
Base = declarative_base()