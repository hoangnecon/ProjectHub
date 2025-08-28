from fastapi import HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from sqlalchemy.orm import joinedload
from fastapi.encoders import jsonable_encoder
import logging
import json

from models import schemas
from models.database import get_db
from services import notification_service
from websocket_manager import manager

async def broadcast_task_update(task: schemas.Task):
    if task.project_id:
        task_data = schemas.TaskResponse.from_orm(task)
        await manager.broadcast(json.dumps({"type": "task_updated", "data": jsonable_encoder(task_data)}), str(task.project_id))

async def broadcast_task_creation(task: schemas.Task):
    if task.project_id:
        task_data = schemas.TaskResponse.from_orm(task)
        await manager.broadcast(json.dumps({"type": "task_created", "data": jsonable_encoder(task_data)}), str(task.project_id))

async def broadcast_task_deletion(task_id: str, project_id: str):
    if project_id:
        await manager.broadcast(json.dumps({"type": "task_deleted", "data": {"id": task_id}}), str(project_id))

async def create_task(task_data: schemas.TaskCreate, current_user: schemas.User, db: Session = Depends(get_db)):
    try:
        assignees = []
        owner_id = None
        project_id = task_data.project_id

        if project_id:
            project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
            if not project:
                raise HTTPException(status_code=404, detail="Project not found.")
            if str(project.owner_id) != str(current_user.id):
                raise HTTPException(status_code=403, detail="Only the project owner can create tasks.")

            # If project has a team_id, it's a team project, so assignees are required.
            if project.team_id and not task_data.assignee_ids:
                raise HTTPException(
                    status_code=422,
                    detail="Assignees are required for tasks in a team project."
                )
            
            owner_id = str(project.owner_id)
            if task_data.assignee_ids:
                assignees = db.query(schemas.User).filter(schemas.User.id.in_(task_data.assignee_ids)).all()
        else:
            owner_id = str(current_user.id)
            assignees = [current_user]

        new_task = schemas.Task(
            title=task_data.title,
            description=task_data.description,
            notes=task_data.notes,
            priority=task_data.priority,
            deadline=task_data.deadline,
            project_id=project_id,
            owner_id=owner_id,
            assigned_by=str(current_user.id),
            assigned_at=datetime.now(timezone.utc),
            assignees=assignees
        )

        db.add(new_task)
        db.commit()
        db.refresh(new_task)

        # Notify assignees, excluding the user who performed the action
        if new_task.assignees:
            assignees_to_notify = [a for a in new_task.assignees if str(a.id) != str(current_user.id)]
            for assignee in assignees_to_notify:
                await notification_service.create_task_assigned_notification(
                    task_id=new_task.id,
                    user_id=assignee.id,
                    assigner_id=current_user.id,
                    db=db
                )
        
        await broadcast_task_creation(new_task)
        return new_task
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating task: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error while creating task: {e}")

async def get_project_tasks(project_id: str, status: Optional[str], current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
    
    is_owner = str(project.owner_id) == str(current_user.id)
    query = db.query(schemas.Task).options(joinedload(schemas.Task.assignees)).filter(schemas.Task.project_id == project_id)
    
    if not is_owner:
        query = query.filter(schemas.Task.assignees.any(id=current_user.id))

    if status:
        query = query.filter(schemas.Task.status == status)
    
    total_count = query.count()
    tasks = query.order_by(schemas.Task.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return schemas.PaginatedTaskSummaryResponse(tasks=tasks, total_count=total_count)

async def get_user_tasks(current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    # A user's tasks are all tasks they are assigned to.
    # From that set, we apply conditional filtering based on the task type.
    base_query = db.query(schemas.Task).options(joinedload(schemas.Task.project)).filter(schemas.Task.assignees.any(id=current_user.id))

    # We want to keep a task if:
    # 1. It's a personal task (project_id is None), regardless of status.
    # 2. It's a project task (project_id is not None) AND its status is not 'completed'.
    filter_condition = or_(
        schemas.Task.project_id.is_(None),
        and_(
            schemas.Task.project_id.isnot(None),
            schemas.Task.status != 'completed'
        )
    )

    query = base_query.filter(filter_condition)

    total_count = query.count()
    tasks = query.order_by(schemas.Task.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    
    return schemas.PaginatedTaskSummaryResponse(tasks=tasks, total_count=total_count)

async def get_personal_tasks(status: Optional[str], current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    query = db.query(schemas.Task).filter(schemas.Task.owner_id == str(current_user.id))
    if status:
        query = query.filter(schemas.Task.status == status)
    total_count = query.count()
    tasks = query.order_by(schemas.Task.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return schemas.PaginatedTaskSummaryResponse(tasks=tasks, total_count=total_count)

async def get_task_by_id(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = db.query(schemas.Task).options(joinedload(schemas.Task.assignees), joinedload(schemas.Task.project)).filter(schemas.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")
    return task

async def update_task(task_id: str, task_update: schemas.TaskUpdate, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    original_assignee_ids = {str(a.id) for a in task.assignees}

    # Permission check
    is_personal_task = task.project_id is None
    is_project_owner = not is_personal_task and task.project and str(task.project.owner_id) == str(current_user.id)
    is_task_owner = is_personal_task and str(task.owner_id) == str(current_user.id)

    if not is_project_owner and not is_task_owner:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this task.")

    update_data = task_update.dict(exclude_unset=True)
    if 'assignee_ids' in update_data:
        if not is_personal_task:
            project_member_ids = {str(m.user_id) for m in task.project.members}
            if not set(update_data['assignee_ids']).issubset(project_member_ids):
                raise HTTPException(status_code=400, detail="All assignees must be members of the project.")
        
        assignees = db.query(schemas.User).filter(schemas.User.id.in_(update_data['assignee_ids'])).all()
        task.assignees = assignees
        del update_data['assignee_ids']

    for key, value in update_data.items():
        setattr(task, key, value)

    db.commit()
    db.refresh(task)

    # Notify newly added assignees, excluding the user who performed the action
    new_assignee_ids = {str(a.id) for a in task.assignees}
    added_assignee_ids = new_assignee_ids - original_assignee_ids
    assignee_ids_to_notify = {uid for uid in added_assignee_ids if uid != str(current_user.id)}

    if assignee_ids_to_notify:
        for user_id in assignee_ids_to_notify:
            await notification_service.create_task_assigned_notification(
                task_id=task.id,
                user_id=user_id,
                assigner_id=current_user.id,
                db=db
            )

    # Notify about status change
    if 'status' in update_data and task.assignees:
        for assignee in task.assignees:
            if str(assignee.id) != str(current_user.id):
                await notification_service.create_task_status_changed_notification(
                    task_id=task.id,
                    user_id=assignee.id,
                    new_status=update_data['status'],
                    changer_id=current_user.id,
                    db=db
                )

    await broadcast_task_update(task)
    return task

async def delete_task(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    is_personal_task = task.project_id is None
    if is_personal_task:
        if str(task.owner_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the task owner can delete this personal task.")
    else:
        if not task.project or str(task.project.owner_id) != str(current_user.id):
            raise HTTPException(status_code=403, detail="Only the project owner can delete this task.")

    project_id = str(task.project_id)
    db.delete(task)
    db.commit()
    await broadcast_task_deletion(task_id, project_id)
    return {"message": "Task deleted successfully."}

async def save_task_content(task_id: str, task_submit: schemas.TaskSubmit, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    if str(current_user.id) not in [str(a.id) for a in task.assignees]:
        raise HTTPException(status_code=403, detail="You are not assigned to this task.")

    new_entry = schemas.SubmissionEntry(
        user_id=str(current_user.id),
        username=current_user.full_name,
        content=task_submit.content
    )
    
    submission_list = list(task.submission_content or [])
    updated_list = [entry for entry in submission_list if entry['user_id'] != str(current_user.id)]
    updated_list.append(jsonable_encoder(new_entry))
    
    task.submission_content = updated_list
    db.commit()
    db.refresh(task)
    await broadcast_task_update(task)
    return {"message": "Your submission has been saved."}

async def submit_for_approval(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    if task.project_id is None:
        raise HTTPException(status_code=400, detail="Personal tasks cannot be submitted for approval.")
    if current_user not in task.assignees:
        raise HTTPException(status_code=403, detail="You are not assigned to this task.")

    task.status = "pending_approval"
    db.commit()
    db.refresh(task)

    # Notify project owner
    if task.project and task.project.owner_id:
        if str(task.project.owner_id) != str(current_user.id):
            await notification_service.create_task_submitted_for_approval_notification(
                task_id=task.id,
                user_id=task.project.owner_id,
                submitter_id=current_user.id,
                db=db
            )

    await broadcast_task_update(task)
    return {"message": "Task submitted for approval."}

async def recall_task_submission(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    if current_user not in task.assignees:
        raise HTTPException(status_code=403, detail="You are not assigned to this task.")
    if task.status != "pending_approval":
        raise HTTPException(status_code=400, detail="This task is not pending approval.")

    task.status = "in_progress"
    db.commit()
    db.refresh(task)
    await broadcast_task_update(task)
    return {"message": "Task submission recalled successfully."}

async def approve_task(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    if not task.project or str(task.project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the project owner can approve tasks.")
    if task.status != "pending_approval":
        raise HTTPException(status_code=400, detail="This task is not pending approval.")

    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)

    # Notify assignees that the task has been approved
    if task.assignees:
        for assignee in task.assignees:
            await notification_service.create_task_approved_notification(
                task_id=task.id,
                user_id=assignee.id,
                approver_id=current_user.id,
                db=db
            )

    await broadcast_task_update(task)
    return {"message": "Task approved successfully."}

async def get_pending_approval_tasks(project_id: str, current_user: schemas.User, db: Session = Depends(get_db), page: int = 1, per_page: int = 20):
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()
    if not project or str(project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the project owner can view pending approval tasks.")

    query = db.query(schemas.Task).filter(schemas.Task.project_id == project_id, schemas.Task.status == "pending_approval")
    total_count = query.count()
    tasks = query.order_by(schemas.Task.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()
    return schemas.PaginatedTaskSummaryResponse(tasks=tasks, total_count=total_count)

async def complete_personal_task(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    if str(task.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="You are not the owner of this task.")
    
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(task)
    return task

async def reopen_task(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    is_personal_task = task.project_id is None
    is_project_owner = not is_personal_task and task.project and str(task.project.owner_id) == str(current_user.id)
    is_task_owner = is_personal_task and str(task.owner_id) == str(current_user.id)

    if not is_project_owner and not is_task_owner:
        raise HTTPException(status_code=403, detail="You do not have permission to reopen this task.")

    task.status = "in_progress"
    task.completed_at = None
    db.commit()
    db.refresh(task)

    # Notify assignees that the task has been reopened
    if task.assignees:
        for assignee in task.assignees:
            if str(assignee.id) != str(current_user.id):
                await notification_service.create_task_reopened_notification(
                    task_id=task.id,
                    user_id=assignee.id,
                    reopener_id=current_user.id,
                    db=db
                )

    await broadcast_task_update(task)
    return task

async def request_changes(task_id: str, current_user: schemas.User, db: Session = Depends(get_db)):
    task = await get_task_by_id(task_id, current_user, db)
    if not task.project or str(task.project.owner_id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Only the project owner can request changes.")
    if task.status != "pending_approval":
        raise HTTPException(status_code=400, detail="This task is not pending approval.")

    task.status = "in_progress"
    db.commit()
    db.refresh(task)

    # Notify assignees that changes are requested
    if task.assignees:
        for assignee in task.assignees:
            await notification_service.create_task_changes_requested_notification(
                task_id=task.id,
                user_id=assignee.id,
                requester_id=current_user.id,
                db=db
            )

    await broadcast_task_update(task)
    return {"message": "Changes requested for task."}