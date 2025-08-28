from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from controllers import auth_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(prefix="/auth", tags=["authentication"])

@router.post("/register", response_model=schemas.UserResponse)
async def register(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    return await auth_controller.register_user(user_data, db)

@router.post("/login", response_model=schemas.Token)
async def login(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    return await auth_controller.login_user(user_credentials, db)

@router.get("/me", response_model=schemas.UserResponse)
async def read_users_me(current_user: schemas.User = Depends(get_current_user)):
    return await auth_controller.get_current_user_info(current_user)

@router.get("/users/search", response_model=List[schemas.UserResponse])
async def search_users_endpoint(query: str, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    return await auth_controller.search_users(query, db, current_user)

@router.get("/users/{user_id}", response_model=schemas.UserResponse)
async def get_user_by_id_endpoint(user_id: str, db: Session = Depends(get_db)):
    return await auth_controller.get_user_by_id_info(user_id, db)
