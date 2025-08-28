from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from controllers import team_controller, project_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(prefix="/teams", tags=["teams"])

@router.post("", response_model=schemas.TeamResponse)
async def create_team_endpoint(
    team_data: schemas.TeamCreate, 
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await team_controller.create_team(team_data, current_user, db)

@router.get("", response_model=List[schemas.TeamResponse])
async def get_teams(current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await team_controller.get_user_teams(current_user, db)

@router.get("/{team_id}", response_model=schemas.TeamResponse)
async def get_team(team_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await team_controller.get_team_by_id(team_id, current_user, db)

@router.put("/{team_id}", response_model=schemas.TeamResponse)
async def update_team_endpoint(
    team_id: str, 
    team_update: schemas.TeamUpdate, 
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await team_controller.update_team(team_id, team_update, current_user, db)

@router.delete("/{team_id}")
async def delete_team_endpoint(
    team_id: str, 
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await team_controller.delete_team(team_id, current_user, db)

@router.get("/{team_id}/members", response_model=schemas.PaginatedUserResponse)
async def get_team_members_endpoint(team_id: str, page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await team_controller.get_team_members(team_id, current_user, db, page, per_page)

@router.get("/{team_id}/members/search", response_model=List[schemas.UserResponse])
async def search_team_members_route(
    team_id: str,
    query: str,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await team_controller.search_team_members(team_id, query, current_user, db)

@router.post("/{team_id}/members", response_model=schemas.TeamResponse)
async def add_member_to_team(
    team_id: str,
    member_data: schemas.AddMemberRequest,
    current_user: schemas.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return await team_controller.add_team_member(team_id, member_data, current_user, db)

@router.get("/{team_id}/projects", response_model=List[schemas.ProjectResponse])
async def get_team_projects_endpoint(team_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await project_controller.get_projects_for_team(team_id, current_user, db)