from sqlmodel import SQLModel, create_engine, Session

from .config import get_settings

# Create a SQLAlchemy engine.  SQLModel builds on top of SQLAlchemy and
# requires a version <2.0 when using SQLModel 0.0.8.
settings = get_settings()
engine = create_engine(settings.database_url, echo=False, future=False)


def init_db() -> None:
    """Create database tables."""
    SQLModel.metadata.create_all(engine)


def get_session() -> Session:
    """Dependency that yields a SQLModel session."""
    with Session(engine) as session:
        yield session