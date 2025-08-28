from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
import logging

from models import schemas
from models.database import get_db

async def update_user_info(user_update: schemas.UserUpdate, current_user: schemas.User, db: Session = Depends(get_db)):
    try:
        user_in_db = db.query(schemas.User).filter(schemas.User.id == current_user.id).first()
        if not user_in_db:
            raise HTTPException(status_code=404, detail="User not found")

        update_data = user_update.dict(exclude_unset=True)
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update.")

        for key, value in update_data.items():
            setattr(user_in_db, key, value)
        
        db.commit()
        db.refresh(user_in_db)
        return user_in_db

    except Exception as e:
        db.rollback()
        logging.error(f"Error updating user info: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while updating user info.")