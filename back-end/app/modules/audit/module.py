from fastapi import APIRouter

from .controller import router as audit_controller

router = APIRouter()
router.include_router(audit_controller)
