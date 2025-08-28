from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from controllers import project_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(prefix="/projects", tags=["projects"])

@router.post("", response_model=schemas.ProjectResponse)
async def create_project_endpoint(project_data: schemas.ProjectCreate, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.create_project(project_data, current_user, db)

@router.get("", response_model=schemas.PaginatedProjectSummaryResponse)
async def get_projects(page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.get_user_projects(current_user, db, page, per_page)

@router.get("/personal", response_model=schemas.PaginatedProjectSummaryResponse)
async def get_personal_projects_endpoint(page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.get_personal_projects(current_user, db, page, per_page)

@router.get("/{project_id}", response_model=schemas.ProjectResponse)
async def get_project(project_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.get_project_by_id(project_id, current_user, db)

@router.delete("/{project_id}")
async def delete_project_endpoint(project_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.delete_project(project_id, current_user, db)

@router.post("/{project_id}/members", status_code=201)
async def add_project_member_endpoint(project_id: str, member_data: schemas.AddMemberRequest, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.add_project_member(project_id, member_data, current_user, db)