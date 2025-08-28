from fastapi import HTTPException, Depends
from typing import List
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import or_
import logging

from models import schemas
from models.database import get_db
from services import notification_service

async def create_team(team_data: schemas.TeamCreate, current_user: schemas.User, db: Session = Depends(get_db)):
    try:
        existing_team = db.query(schemas.Team).filter(schemas.Team.name == team_data.name, schemas.Team.owner_id == current_user.id).first()
        if existing_team:
            raise HTTPException(status_code=400, detail="A team with this name already exists.")

        member_ids = set(team_data.members)
        member_ids.add(current_user.id)
        members = db.query(schemas.User).filter(schemas.User.id.in_(member_ids)).all()

        new_team = schemas.Team(
            name=team_data.name,
            description=team_data.description,
            owner_id=current_user.id,
            members=members
        )
        
        db.add(new_team)
        db.commit()
        db.refresh(new_team)
        return new_team
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating team: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error while creating team: {e}")

async def get_user_teams(current_user: schemas.User, db: Session = Depends(get_db)):
    return db.query(schemas.Team).filter(or_(
        schemas.Team.owner_id == current_user.id,
        schemas.Team.members.any(id=current_user.id)
    )).all()

async def get_team_by_id(team_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    member_ids = [member.id for member in team.members]
    if current_user.id not in member_ids and team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to access this team.")
    
    return team

async def update_team(team_id: str, team_update: schemas.TeamUpdate, current_user: schemas.User, db: Session = Depends(get_db)):
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can update the team.")

    update_data = team_update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "members":
            member_users = db.query(schemas.User).filter(schemas.User.id.in_(value)).all()
            setattr(team, key, member_users)
        else:
            setattr(team, key, value)
    
    team.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(team)
    return team

async def delete_team(team_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")
    
    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can delete the team.")

    db.delete(team)
    db.commit()
    return {"message": "Team deleted successfully."}

async def get_team_members(team_id: str, current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    team = await get_team_by_id(team_id, current_user, db)
    all_members = team.members
    start = (page - 1) * per_page
    end = start + per_page
    paginated_members = all_members[start:end]
    return schemas.PaginatedUserResponse(users=paginated_members, total_count=len(all_members))

async def add_team_member(team_id: str, member_data: schemas.AddMemberRequest, current_user: schemas.User, db: Session = Depends(get_db)):
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can add members.")

    member_to_add = db.query(schemas.User).filter(schemas.User.id == member_data.userId).first()
    if not member_to_add:
        raise HTTPException(status_code=404, detail="User not found.")

    if member_to_add in team.members:
        raise HTTPException(status_code=400, detail="User is already a member of this team.")

    team.members.append(member_to_add)
    db.commit()
    db.refresh(team)

    # Create a notification for the added member
    await notification_service.create_team_invitation_notification(
        team_id=team_id,
        invited_user_id=member_data.userId,
        inviter_user_id=current_user.id,
        db=db
    )

    return team

async def search_team_members(team_id: str, query: str, current_user: schemas.User, db: Session = Depends(get_db)):
    team = await get_team_by_id(team_id, current_user, db)
    
    member_ids = [m.id for m in team.members]
    users = db.query(schemas.User).filter(
        schemas.User.id.in_(member_ids),
        schemas.User.username.ilike(f"%{query}%")
    ).all()
    return users

async def remove_team_member(team_id: str, user_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    if team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the team owner can remove members.")

    if user_id == str(team.owner_id):
        raise HTTPException(status_code=400, detail="The team owner cannot be removed.")

    member_to_remove = db.query(schemas.User).filter(schemas.User.id == user_id).first()
    if not member_to_remove:
        raise HTTPException(status_code=404, detail="User not found.")

    if member_to_remove not in team.members:
        raise HTTPException(status_code=400, detail="User is not a member of this team.")

    team.members.remove(member_to_remove)
    db.commit()

    # Create a notification for the removed member
    await notification_service.create_remove_from_team_notification(
        team_id=team_id,
        removed_user_id=user_id,
        remover_user_id=current_user.id,
        db=db
    )

    return {"message": "Member removed successfully."}
