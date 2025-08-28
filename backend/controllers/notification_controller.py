from fastapi import HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from services import notification_service
from models.database import get_db
from middleware.auth import get_current_user

async def get_notifications(unread_only: bool, current_user: schemas.User, db: Session = Depends(get_db)):
    return await notification_service.get_user_notifications(current_user.id, unread_only, db)

async def mark_notification_as_read(notification_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    success = await notification_service.mark_notification_read(notification_id, current_user.id, db)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}

async def mark_all_as_read(current_user: schemas.User, db: Session = Depends(get_db)):
    count = await notification_service.mark_all_notifications_read(current_user.id, db)
    return {"message": f"Marked {count} notifications as read"}

async def get_unread_notifications_count(current_user: schemas.User, db: Session = Depends(get_db)):
    count = await notification_service.get_unread_count(current_user.id, db)
    return {"count": count}