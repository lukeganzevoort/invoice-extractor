"""
Database helper module using SQLAlchemy.
Provides a centralized database connection and utility functions.
"""

import os
from contextlib import contextmanager
from typing import Optional

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, declarative_base, sessionmaker

# Declarative base for ORM models
Base = declarative_base()

# Database connection string
# Can be overridden via environment variable DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///case_study_data.db")

# Create SQLAlchemy engine
# echo=True enables SQL logging (useful for debugging)
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@contextmanager
def get_db_session():
    """
    Context manager for database sessions.
    Usage:
        with get_db_session() as session:
            # use session here
            pass
    """
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def get_db_engine():
    """
    Get the SQLAlchemy engine directly.
    Useful for pandas operations or raw SQL queries.
    """
    return engine


def execute_query(query: str, params: Optional[dict] = None):
    """
    Execute a raw SQL query and return results.

    Args:
        query: SQL query string
        params: Optional dictionary of parameters for parameterized queries

    Returns:
        Query results
    """
    with get_db_session() as session:
        result = session.execute(text(query), params or {})
        return result.fetchall()


def get_table_names():
    """
    Get list of all table names in the database.

    Returns:
        List of table names
    """
    with get_db_session() as session:
        result = session.execute(
            text("SELECT name FROM sqlite_master WHERE type='table'")
        )
        return [row[0] for row in result]


def table_exists(table_name: str) -> bool:
    """
    Check if a table exists in the database.

    Args:
        table_name: Name of the table to check

    Returns:
        True if table exists, False otherwise
    """
    return table_name in get_table_names()


def init_db():
    """
    Initialize database tables from models.
    Creates all tables defined in models.py if they don't exist.
    """
    Base.metadata.create_all(bind=engine)
