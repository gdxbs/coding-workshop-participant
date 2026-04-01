import os
import pytest
import mongomock
from unittest.mock import patch
from shared.db_utils import get_db_connection

@pytest.fixture
def mock_env(monkeypatch):
    """Fixture to set up necessary environment variables."""
    monkeypatch.setenv("MONGO_HOST", "localhost")
    monkeypatch.setenv("MONGO_PORT", "27017")
    monkeypatch.setenv("MONGO_NAME", "testdb")
    monkeypatch.setenv("MONGO_USER", "user")
    monkeypatch.setenv("MONGO_PASS", "pass")

@patch("shared.db_utils.MongoClient", new=mongomock.MongoClient)
def test_get_db_connection_local(mock_env, monkeypatch):
    """Test generating correct connection when IS_LOCAL is 'true'."""
    monkeypatch.setenv("IS_LOCAL", "true")
    
    # We patch MongoClient with mongomock, but we also want to verify the URI was correct.
    # mongomock doesn't easily expose the original URI, so let's use a spy on the mocked class.
    with patch("mongomock.MongoClient.__init__", return_value=None) as mock_init:
        get_db_connection()
        expected_uri = "mongodb://user:pass@localhost:27017/testdb"
        mock_init.assert_called_once()
        assert expected_uri in mock_init.call_args[0]

@patch("shared.db_utils.MongoClient", new=mongomock.MongoClient)
def test_get_db_connection_remote_with_tls(mock_env, monkeypatch):
    """Test generating correct connection when IS_LOCAL is 'false'."""
    monkeypatch.setenv("IS_LOCAL", "false")
    
    with patch("mongomock.MongoClient.__init__", return_value=None) as mock_init:
        get_db_connection()
        expected_uri = "mongodb://user:pass@localhost:27017/testdb?tls=true&tlsAllowInvalidCertificates=true&retryWrites=false"
        mock_init.assert_called_once()
        assert expected_uri in mock_init.call_args[0]

def test_get_db_connection_missing_env_vars(monkeypatch):
    """Test handling missing environment variables gracefully."""
    # Ensure all DB env vars are cleared
    for var in ["MONGO_HOST", "MONGO_PORT", "MONGO_NAME", "MONGO_USER", "MONGO_PASS", "IS_LOCAL"]:
        monkeypatch.delenv(var, raising=False)
        
    with pytest.raises(ValueError, match="Missing required database environment variables"):
        get_db_connection()

@patch("shared.db_utils.MongoClient", new=mongomock.MongoClient)
def test_get_db_connection_no_auth_local(monkeypatch):
    """Test generating connection without user/pass when IS_LOCAL is 'true'."""
    monkeypatch.setenv("IS_LOCAL", "true")
    monkeypatch.setenv("MONGO_HOST", "localhost")
    monkeypatch.setenv("MONGO_PORT", "27017")
    monkeypatch.setenv("MONGO_NAME", "testdb")
    monkeypatch.delenv("MONGO_USER", raising=False)
    monkeypatch.delenv("MONGO_PASS", raising=False)
    
    with patch("mongomock.MongoClient.__init__", return_value=None) as mock_init:
        get_db_connection()
        expected_uri = "mongodb://localhost:27017/testdb"
        mock_init.assert_called_once()
        assert expected_uri in mock_init.call_args[0]
