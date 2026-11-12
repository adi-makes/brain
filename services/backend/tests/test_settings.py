from second_brain.settings import get_settings, root_env_file


def test_missing_root_env_file_is_not_created(tmp_path, monkeypatch) -> None:
    missing = tmp_path / ".env"
    monkeypatch.setenv("SECOND_BRAIN_ENV_FILE", str(missing))
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.log_level == "info"
    assert not missing.exists()
    assert root_env_file() is None
    get_settings.cache_clear()


def test_reads_existing_root_env_file(tmp_path, monkeypatch) -> None:
    env_file = tmp_path / ".env"
    env_file.write_text("LOG_LEVEL=warning\nWORKER_HEALTH_PORT=8011\n", encoding="utf-8")
    monkeypatch.setenv("SECOND_BRAIN_ENV_FILE", str(env_file))
    monkeypatch.delenv("LOG_LEVEL", raising=False)
    monkeypatch.delenv("WORKER_HEALTH_PORT", raising=False)
    get_settings.cache_clear()
    settings = get_settings()
    assert settings.log_level == "warning"
    assert settings.worker_health_port == 8011
    get_settings.cache_clear()
