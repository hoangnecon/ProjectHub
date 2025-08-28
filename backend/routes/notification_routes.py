from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from controllers import notification_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("", response_model=List[schemas.NotificationResponse])
async def get_notifications_endpoint(unread_only: bool = False, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await notification_controller.get_notifications(unread_only, current_user, db)

@router.put("/{notification_id}/read")
async def mark_notification_read_endpoint(notification_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await notification_controller.mark_notification_as_read(notification_id, current_user, db)

@router.put("/read-all")
async def mark_all_notifications_read_endpoint(current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await notification_controller.mark_all_as_read(current_user, db)

@router.get("/unread-count")
async def get_unread_count_endpoint(current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await notification_controller.get_unread_notifications_count(current_user, db)