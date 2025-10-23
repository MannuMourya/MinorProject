from fastapi.testclient import TestClient
from sqlmodel import SQLModel

from app.main import app
from app.database import engine


def setup_module() -> None:
    # Create tables before tests run
    SQLModel.metadata.create_all(engine)


def test_health() -> None:
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_signup_and_login() -> None:
    client = TestClient(app)
    username = "tester"
    password = "secretpass"
    res = client.post("/api/signup", json={"username": username, "password": password})
    assert res.status_code == 201
    res = client.post("/api/login", json={"username": username, "password": password})
    assert res.status_code == 200
    data = res.json()
    assert "access_token" in data