from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.core.authorization import canonical_role, ensure_role


@pytest.mark.parametrize(
    ("legacy", "canonical"),
    [("gestor", "gerente"), ("participante", "gerente"), ("visualizador", "auditor")],
)
def test_legacy_roles_are_compatible(legacy: str, canonical: str):
    assert canonical_role(legacy) == canonical


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
