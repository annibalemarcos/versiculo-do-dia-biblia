import logging
from fastapi import Request, status, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from typing import Optional, Any, Dict

logger = logging.getLogger("uvicorn.error")

class AppException(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_400_BAD_REQUEST,
        details: Optional[Any] = None
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)

class BadRequestException(AppException):
    def __init__(
        self,
        message: str = "Requisição inválida",
        details: Optional[Any] = None
    ):
        super().__init__(
            code="BAD_REQUEST",
            message=message,
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )

class UnauthorizedException(AppException):
    def __init__(self, message: str = "Autenticação necessária ou token inválido", details: Optional[Any] = None):
        super().__init__(
            code="UNAUTHORIZED",
            message=message,
            status_code=status.HTTP_401_UNAUTHORIZED,
            details=details
        )

class ForbiddenException(AppException):
    def __init__(self, message: str = "Permissão insuficiente para executar esta ação", details: Optional[Any] = None):
        super().__init__(
            code="FORBIDDEN",
            message=message,
            status_code=status.HTTP_403_FORBIDDEN,
            details=details
        )

class NotFoundException(AppException):
    def __init__(self, message: str = "Recurso não encontrado", details: Optional[Any] = None):
        super().__init__(
            code="NOT_FOUND",
            message=message,
            status_code=status.HTTP_404_NOT_FOUND,
            details=details
        )

class ConflictException(AppException):
    def __init__(self, message: str = "Conflito com o estado atual do recurso", details: Optional[Any] = None):
        super().__init__(
            code="CONFLICT",
            message=message,
            status_code=status.HTTP_409_CONFLICT,
            details=details
        )

class RateLimitedException(AppException):
    def __init__(self, message: str = "Muitas requisições. Tente novamente mais tarde.", details: Optional[Any] = None):
        super().__init__(
            code="RATE_LIMITED",
            message=message,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details
        )

class ValidationErrorException(AppException):
    def __init__(self, message: str = "Dados de entrada inválidos", details: Optional[Any] = None):
        super().__init__(
            code="VALIDATION_ERROR",
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details
        )

async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details
            }
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    errors = exc.errors()
    first_msg = "Dados de requisição inválidos."
    if errors and len(errors) > 0:
        loc = " -> ".join([str(l) for l in errors[0].get("loc", []) if l != "body"])
        msg = errors[0].get("msg", "inválido")
        first_msg = f"Campo inválido: {loc} ({msg})" if loc else msg
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": first_msg,
                "details": errors
            }
        }
    )

async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": "HTTP_ERROR",
                "message": exc.detail if isinstance(exc.detail, str) else "Erro na requisição",
                "details": exc.detail if not isinstance(exc.detail, str) else None
            }
        }
    )

async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(f"Unhandled Exception on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "Ocorreu um erro interno ao processar sua solicitação."
            }
        }
    )
