from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from controllers import project_member_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter()

@router.get("/projects/{project_id}/members", response_model=schemas.PaginatedProjectMemberResponse)
async def get_project_members_route(
    project_id: str,
    page: int = 1,
    per_page: int = 20,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await project_member_controller.get_project_members(project_id, current_user, db, page, per_page)

@router.put("/projects/{project_id}/members/{user_id}/role")
async def update_project_member_role_route(
    project_id: str,
    user_id: str,
    role_update: schemas.ProjectMemberUpdate,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await project_member_controller.update_project_member_role(project_id, user_id, role_update, current_user, db)