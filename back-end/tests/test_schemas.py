import pytest
from pydantic import ValidationError

from app.modules.projects.schemas import ProjectCreate
from app.modules.users.schemas import UserCreate


def test_user_requires_valid_email():
    with pytest.raises(ValidationError):
        UserCreate(name="Usuário", email="invalido")


def test_project_rejects_short_name():
    with pytest.raises(ValidationError):
        ProjectCreate(nome="x", codigo="P1", areaResponsavel="Pesquisa")


def test_project_rejects_empty_responsible_area():
    with pytest.raises(ValidationError):
        ProjectCreate(nome="Projeto válido", codigo="P1", areaResponsavel="")
