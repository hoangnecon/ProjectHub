from fastapi import HTTPException, status, Depends
from datetime import timedelta
from sqlalchemy.orm import Session
import logging

from models import schemas
from models.database import get_db
from middleware.auth import create_access_token, get_current_user
from config import settings
from passlib.context import CryptContext

# Password Hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

async def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    db_user_by_email = db.query(schemas.User).filter(schemas.User.email == user_data.email).first()
    if db_user_by_email:
        raise HTTPException(status_code=400, detail="Email is already registered.")
    db_user_by_username = db.query(schemas.User).filter(schemas.User.username == user_data.username).first()
    if db_user_by_username:
        raise HTTPException(status_code=400, detail="Username already exists.")

    hashed_password = get_password_hash(user_data.password)
    db_user = schemas.User(
        username=user_data.username,
        full_name=user_data.full_name,
        email=user_data.email,
        hashed_password=hashed_password
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

async def login_user(user_credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(schemas.User).filter(schemas.User.email == user_credentials.email).first()
    if not user or not verify_password(user_credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=access_token_expires
    )
    
    return schemas.Token(access_token=access_token, token_type="bearer")

async def get_current_user_info(current_user: schemas.User = Depends(get_current_user)):
    return current_user

async def search_users(query: str, db: Session = Depends(get_db), current_user: schemas.User = Depends(get_current_user)):
    users = db.query(schemas.User).filter(
        schemas.User.username.ilike(f"%{query}%"),
        schemas.User.id != str(current_user.id)
    ).all()
    return users

async def get_user_by_id_info(user_id: str, db: Session = Depends(get_db)):
    user = db.query(schemas.User).filter(schemas.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return user