from fastapi import APIRouter

from app.modules.projects.controller import router as projects_router

router = APIRouter()
router.include_router(projects_router)
