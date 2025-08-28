from fastapi import HTTPException, Depends
from typing import List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
import logging

from models import schemas
from models.database import get_db
from services import notification_service

async def create_project(project_data: schemas.ProjectCreate, current_user: schemas.User, db: Session = Depends(get_db)):
    try:
        # Common project data
        new_project_data = {
            "name": project_data.name,
            "description": project_data.description,
            "owner_id": str(current_user.id)
        }

        if project_data.team_id:
            # Team Project Logic
            team = db.query(schemas.Team).filter(schemas.Team.id == project_data.team_id).first()
            if not team:
                raise HTTPException(status_code=404, detail=f"Team with ID {project_data.team_id} not found")
            
            if str(team.owner_id) != str(current_user.id):
                raise HTTPException(status_code=403, detail="Only the team owner can create projects for the team.")

            new_project_data["team_id"] = project_data.team_id
            new_project = schemas.Project(**new_project_data)
            db.add(new_project)
            db.flush() # Flush to get the new_project.id

            # Add all team members to the project, including the owner
            all_team_members = team.members
            if not any(m.id == team.owner_id for m in all_team_members):
                all_team_members.append(team.owner)

            for member in all_team_members:
                role = "Owner" if str(member.id) == str(current_user.id) else "Member"
                project_member = schemas.ProjectMemberRole(project_id=new_project.id, user_id=member.id, role=role)
                db.add(project_member)
        else:
            # Personal Project Logic
            new_project = schemas.Project(**new_project_data)
            db.add(new_project)
            db.flush() # Flush to get the new_project.id

            # Add only the owner as a member
            project_member = schemas.ProjectMemberRole(project_id=new_project.id, user_id=str(current_user.id), role="Owner")
            db.add(project_member)
            all_team_members = [] # No one to notify for personal projects

        # Send notifications to all members except the owner
        for member in all_team_members:
            if str(member.id) != str(current_user.id):
                await notification_service.create_project_invitation_notification(
                    project_id=new_project.id,
                    invited_user_id=member.id,
                    inviter_user_id=current_user.id,
                    db=db
                )

        db.commit()
        db.refresh(new_project)
        return new_project
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error while creating project: {e}")

async def get_user_projects(current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    # Subquery to get project IDs the user is a member of
    user_project_ids_query = db.query(schemas.ProjectMemberRole.project_id).filter(schemas.ProjectMemberRole.user_id == current_user.id)
    
    # Main query for projects
    query = db.query(schemas.Project).filter(schemas.Project.id.in_(user_project_ids_query))
    
    total_count = query.count()
    
    # Subquery for member count
    member_count_subquery = db.query(
        schemas.ProjectMemberRole.project_id,
        func.count(schemas.ProjectMemberRole.user_id).label("member_count")
    ).group_by(schemas.ProjectMemberRole.project_id).subquery()

    # Join with member count
    query = query.outerjoin(member_count_subquery, schemas.Project.id == member_count_subquery.c.project_id)
    query = query.add_columns(func.coalesce(member_count_subquery.c.member_count, 0).label("member_count"))

    projects_with_counts = query.offset((page - 1) * per_page).limit(per_page).all()

    projects_summary = [
        schemas.ProjectSummary(
            id=p.id, name=p.name, description=p.description, owner_id=p.owner_id,
            team_id=p.team_id, created_at=p.created_at, member_count=mc
        ) for p, mc in projects_with_counts
    ]

    return schemas.PaginatedProjectSummaryResponse(projects=projects_summary, total_count=total_count)

async def get_personal_projects(current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    # Main query for personal projects (team_id is None and user is owner)
    query = db.query(schemas.Project).filter(
        and_(
            schemas.Project.team_id.is_(None),
            schemas.Project.owner_id == str(current_user.id)
        )
    )
    
    total_count = query.count()
    
    # Subquery for member count (will always be 1 for personal projects, but good for consistency)
    member_count_subquery = db.query(
        schemas.ProjectMemberRole.project_id,
        func.count(schemas.ProjectMemberRole.user_id).label("member_count")
    ).group_by(schemas.ProjectMemberRole.project_id).subquery()

    # Join with member count
    query = query.outerjoin(member_count_subquery, schemas.Project.id == member_count_subquery.c.project_id)
    query = query.add_columns(func.coalesce(member_count_subquery.c.member_count, 0).label("member_count"))

    projects_with_counts = query.order_by(schemas.Project.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    projects_summary = [
        schemas.ProjectSummary(
            id=p.id, name=p.name, description=p.description, owner_id=p.owner_id,
            team_id=p.team_id, created_at=p.created_at, updated_at=p.updated_at, member_count=mc
        ) for p, mc in projects_with_counts
    ]

    return schemas.PaginatedProjectSummaryResponse(projects=projects_summary, total_count=total_count)

async def get_project_by_id(project_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Check for membership
    member_role = db.query(schemas.ProjectMemberRole).filter(
        schemas.ProjectMemberRole.project_id == project_id,
        schemas.ProjectMemberRole.user_id == current_user.id
    ).first()

    if not member_role:
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to access this project.")
    
    return project

async def delete_project(project_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    if str(project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the project owner can delete the project.")

    # Get project members before deleting the project
    members = db.query(schemas.ProjectMemberRole).filter(schemas.ProjectMemberRole.project_id == project_id).all()
    project_name = project.name

    db.delete(project)
    db.commit()

    # Send notifications to all members
    for member in members:
        if str(member.user_id) != str(current_user.id):
            await notification_service.create_project_deleted_notification(
                project_id=project_id,
                project_name=project_name,
                user_id=member.user_id,
                remover_user_id=current_user.id,
                db=db
            )

    return {"message": "Project deleted successfully."}

async def get_projects_for_team(team_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found.")

    member_ids = [member.id for member in team.members]
    if current_user.id not in member_ids and team.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied: You do not have permission to access this team.")

    return db.query(schemas.Project).filter(schemas.Project.team_id == team_id).all()

async def add_project_member(project_id: str, member_data: schemas.AddMemberRequest, current_user: schemas.User, db: Session = Depends(get_db)):
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")

    # Authorization: Check if user is the project owner
    if str(project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the project owner can add members.")

    user_to_add = db.query(schemas.User).filter(schemas.User.id == member_data.userId).first()
    if not user_to_add:
        raise HTTPException(status_code=404, detail="User not found.")

    # Check if user is already a member
    existing_member = db.query(schemas.ProjectMemberRole).filter(
        schemas.ProjectMemberRole.project_id == project_id,
        schemas.ProjectMemberRole.user_id == member_data.userId
    ).first()
    if existing_member:
        raise HTTPException(status_code=400, detail="User is already a member of this project.")

    # Add the new member with a default role (e.g., "Member")
    new_member = schemas.ProjectMemberRole(
        project_id=project_id,
        user_id=member_data.userId,
        role="Member"  # Or get role from member_data if available
    )
    db.add(new_member)
    db.commit()

    # Create a notification for the added member
    await notification_service.create_project_invitation_notification(
        project_id=project_id,
        invited_user_id=member_data.userId,
        inviter_user_id=current_user.id,
        db=db
    )

    db.refresh(new_member)
    return {"message": "Member added successfully."}