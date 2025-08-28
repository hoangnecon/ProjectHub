from fastapi import HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session

from models import schemas
from models.database import get_db
from services import notification_service

async def get_project_members(project_id: str, current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20) -> schemas.PaginatedProjectMemberResponse:
    # Authorization: Check if user is a member of the project
    member_check = db.query(schemas.ProjectMemberRole).filter(
        schemas.ProjectMemberRole.project_id == project_id,
        schemas.ProjectMemberRole.user_id == current_user.id
    ).first()
    if not member_check:
        raise HTTPException(status_code=403, detail="You are not a member of this project.")

    # Get total count for pagination
    total_count = db.query(schemas.ProjectMemberRole).filter(schemas.ProjectMemberRole.project_id == project_id).count()

    # Get members for the current page
    members_db = db.query(schemas.ProjectMemberRole).filter(schemas.ProjectMemberRole.project_id == project_id).offset((page - 1) * per_page).limit(per_page).all()
    
    # Manually construct the response to include user details
    project_members = [
        schemas.ProjectMember(
            project_id=member.project_id,
            user_id=member.user_id,
            role=member.role,
            user=schemas.UserResponse.from_orm(member.user)
        ) for member in members_db
    ]
    
    return schemas.PaginatedProjectMemberResponse(members=project_members, total_count=total_count)

async def update_project_member_role(project_id: str, user_id: str, role_update: schemas.ProjectMemberUpdate, current_user: schemas.User, db: Session = Depends(get_db)):
    # Authorization: Check if user is the project owner
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
    if not project or str(project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the project owner can update roles.")

    member_role = db.query(schemas.ProjectMemberRole).filter(
        schemas.ProjectMemberRole.project_id == project_id,
        schemas.ProjectMemberRole.user_id == user_id
    ).first()

    if not member_role:
        raise HTTPException(status_code=404, detail="Member not found.")

    member_role.role = role_update.role
    db.commit()

    # Create a notification for the user whose role was changed
    await notification_service.create_role_changed_notification(
        project_id=project_id,
        user_id=user_id,
        new_role=role_update.role,
        changer_user_id=current_user.id,
        db=db
    )

    return {"message": "Role updated successfully."}