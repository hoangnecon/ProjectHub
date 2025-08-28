from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models import schemas
from controllers import user_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(
    prefix="/users",
    tags=["Users"]
)

@router.put("/me", response_model=schemas.UserResponse)
async def update_current_user_info(user_update: schemas.UserUpdate, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await user_controller.update_user_info(user_update, current_user, db)
