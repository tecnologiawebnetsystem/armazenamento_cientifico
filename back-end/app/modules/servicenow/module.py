from fastapi import APIRouter, Request

from app.api.dependencies import CurrentUser
from app.core.authorization import canonical_role, require_capability

from .schemas import RitmStatusUpdateRequest, RitmStatusUpdateResponse
from .service import update_ritm_status

router = APIRouter(prefix="/api/servicenow", tags=["ServiceNow"])


@router.put("/ritms/{ritm_number}/status", response_model=RitmStatusUpdateResponse)
async def update_ritm_status_route(
    ritm_number: str,
    payload: RitmStatusUpdateRequest,
    request: Request,
    current_user: CurrentUser,
) -> RitmStatusUpdateResponse:
    role = current_user.get("role") if isinstance(current_user, dict) else None
    if canonical_role(role) != "admin":
        require_capability(current_user, "servicenow_update")

    request.state.audit_action = "servicenow_status_update"
    request.state.audit_entity = "servicenow_ritm"
    request.state.audit_entity_id = ritm_number.strip().upper()
    result = await update_ritm_status(ritm_number, payload.status)
    return RitmStatusUpdateResponse(**result)
