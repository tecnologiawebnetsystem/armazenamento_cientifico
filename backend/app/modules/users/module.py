from fastapi import APIRouter

from app.modules.users.controller import router as users_router

router = APIRouter()
router.include_router(users_router)
