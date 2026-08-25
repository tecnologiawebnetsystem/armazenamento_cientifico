import pytest
from pydantic import ValidationError

from app.schemas.common import FileCreate, LoginRequest, ProjectCreate


def test_login_requires_valid_email():
    with pytest.raises(ValidationError):
        LoginRequest(email="invalido", senha="x")


def test_project_rejects_short_name():
    with pytest.raises(ValidationError):
        ProjectCreate(nome="x", codigo="P1", areaResponsavel="Pesquisa")


def test_file_rejects_negative_size():
    with pytest.raises(ValidationError):
        FileCreate(projectId="p1", tipo="arquivo", nome="dados.csv", tamanho=-1)
