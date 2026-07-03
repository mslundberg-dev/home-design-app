"""
Pytest configuration and shared fixtures.

API tests require a live PostgreSQL instance — they're designed to run inside
the Docker container where postgres is available on DATABASE_URL. If that env
var is not set (local dev without Docker), only pure-unit tests (geometry math,
etc.) will execute; the `client` and `db` fixtures auto-skip anything that
needs the database.
"""

import os

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.environ.get("DATABASE_URL", "")
POSTGRES_AVAILABLE = DATABASE_URL.startswith("postgresql")

if POSTGRES_AVAILABLE:
    from app.database import Base, get_db
    from app.main import app
    from fastapi.testclient import TestClient

    _engine = create_engine(DATABASE_URL)
    _Session = sessionmaker(autocommit=False, autoflush=False, bind=_engine)

    @pytest.fixture(scope="session", autouse=True)
    def _init_db():
        """Create all tables once per test session."""
        Base.metadata.create_all(bind=_engine)
        yield

    @pytest.fixture(autouse=True)
    def _clean_tables():
        """Delete all rows between tests so each test starts from a clean slate."""
        yield
        with _engine.begin() as conn:
            # DELETE projects; floors cascade via FK ondelete="CASCADE"
            conn.execute(text("DELETE FROM projects"))

    @pytest.fixture()
    def db():
        """Fresh SQLAlchemy session for the duration of one test."""
        session = _Session()
        try:
            yield session
        finally:
            session.close()

    @pytest.fixture()
    def client(db):
        """TestClient wired to the same session used by the test."""
        def _override_db():
            yield db

        app.dependency_overrides[get_db] = _override_db
        with TestClient(app) as c:
            yield c
        app.dependency_overrides.clear()

else:
    # No postgres available — define stub fixtures so test files can be
    # collected without import errors. Tests that depend on these fixtures
    # will be skipped automatically.

    @pytest.fixture()
    def db():
        pytest.skip("requires postgres — run inside the Docker container")

    @pytest.fixture()
    def client():
        pytest.skip("requires postgres — run inside the Docker container")
