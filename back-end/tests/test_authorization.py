from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.authorization import ensure_role, has_capability, require_capability


def test_manager_is_allowed_to_manage():
    user = SimpleNamespace(role="gerente")
    assert ensure_role(user, "admin", "gerente") is user


def test_read_only_role_is_denied_from_management():
    with pytest.raises(HTTPException) as error:
        ensure_role(SimpleNamespace(role="auditor"), "admin", "gerente")
    assert error.value.status_code == 403


def test_only_admin_can_change_roles():
    with pytest.raises(HTTPException) as error:
        ensure_role(SimpleNamespace(role="gerente"), "admin")
    assert error.value.status_code == 403


def test_sponsor_can_read_but_cannot_audit():
    user = {"role": "patrocinador", "permissions": ["projeto.visualizar"]}
    assert has_capability(user, "read") is True
    assert has_capability(user, "audit") is False
    with pytest.raises(HTTPException) as error:
        require_capability(user, "audit")
    assert error.value.status_code == 403


def test_auditor_can_audit_but_cannot_manage_projects():
    user = {"role": "auditor", "permissions": ["projeto.visualizar", "audit"]}
    assert has_capability(user, "audit") is True
    assert has_capability(user, "create") is False


def test_missing_capability_returns_403():
    with pytest.raises(HTTPException) as error:
        require_capability({"role": "solicitante", "permissions": []}, "reports")
    assert error.value.status_code == 403
