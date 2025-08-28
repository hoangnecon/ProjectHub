from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from controllers import role_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(prefix="/roles", tags=["roles"])

@router.get("/{role_id}", response_model=schemas.RoleResponse)
async def get_role(role_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await role_controller.get_role_by_id(role_id, db)