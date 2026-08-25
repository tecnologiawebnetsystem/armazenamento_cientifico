"""
Exceções tipadas para a aplicação.
Todas as exceções de negócio lançam AppException ou subclasses.
O app.py tem um exception_handler global que converte em JSON padronizado.
"""

from typing import Any


class AppException(Exception):
    """Classe base para todas as exceções da aplicação."""

    def __init__(
        self,
        message: str,
        error_code: str = "InternalError",
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class NotFoundException(AppException):
    """Recurso não encontrado (404)."""

    def __init__(self, message: str = "Recurso não encontrado", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="NotFound",
            status_code=404,
            details=details,
        )


class UnauthorizedException(AppException):
    """Credenciais ausentes ou inválidas (401)."""

    def __init__(self, message: str = "Não autenticado", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="Unauthorized",
            status_code=401,
            details=details,
        )


class ForbiddenException(AppException):
    """Autenticado, mas sem permissão (403)."""

    def __init__(self, message: str = "Sem permissão", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="Forbidden",
            status_code=403,
            details=details,
        )


class ConflictException(AppException):
    """Violação de regra única ou de integridade (409)."""

    def __init__(self, message: str = "Conflito", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="Conflict",
            status_code=409,
            details=details,
        )


class ValidationException(AppException):
    """Regra de negócio inválida (422)."""

    def __init__(self, message: str = "Validação falhou", details: dict[str, Any] | None = None):
        super().__init__(
            message=message,
            error_code="ValidationError",
            status_code=422,
            details=details,
        )
