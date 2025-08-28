from fastapi import APIRouter, Depends
from typing import List, Optional
from sqlalchemy.orm import Session

from models import schemas
from controllers import task_controller
from middleware.auth import get_current_user
from models.database import get_db

router = APIRouter(prefix="/tasks", tags=["tasks"])

@router.post("", response_model=schemas.TaskResponse, status_code=201)
async def create_task_endpoint(task_data: schemas.TaskCreate, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.create_task(task_data, current_user, db)

@router.get("/project/{project_id}", response_model=schemas.PaginatedTaskSummaryResponse)
async def get_project_tasks_endpoint(project_id: str, status: Optional[str] = None, page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.get_project_tasks(project_id, status, current_user, db, page, per_page)

@router.get("/project/{project_id}/pending-approval", response_model=schemas.PaginatedTaskSummaryResponse)
async def get_pending_approval_tasks_endpoint(project_id: str, page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.get_pending_approval_tasks(project_id, current_user, db, page, per_page)

@router.get("/personal", response_model=schemas.PaginatedTaskSummaryResponse)
async def get_personal_tasks_endpoint(status: Optional[str] = None, page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.get_personal_tasks(status, current_user, db, page, per_page)

@router.get("/my", response_model=schemas.PaginatedTaskSummaryResponse)
async def get_my_tasks(page: int = 1, per_page: int = 20, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.get_user_tasks(current_user, db, page, per_page)

@router.get("/{task_id}", response_model=schemas.TaskResponse)
async def get_task_by_id_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.get_task_by_id(task_id, current_user, db)

@router.put("/{task_id}", response_model=schemas.TaskResponse)
async def update_task_endpoint(task_id: str, task_update: schemas.TaskUpdate, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.update_task(task_id, task_update, current_user, db)

@router.delete("/{task_id}")
async def delete_task_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.delete_task(task_id, current_user, db)

@router.post("/{task_id}/content")
async def save_task_content_endpoint(task_id: str, task_submit: schemas.TaskSubmit, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.save_task_content(task_id, task_submit, current_user, db)

# Routes for Project Task Workflow
@router.post("/{task_id}/submit")
async def submit_for_approval_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.submit_for_approval(task_id, current_user, db)

@router.post("/{task_id}/recall")
async def recall_task_submission_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.recall_task_submission(task_id, current_user, db)

@router.post("/{task_id}/approve")
async def approve_task_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.approve_task(task_id, current_user, db)

# Routes for Personal & Project Task State Changes
@router.post("/{task_id}/complete-personal", response_model=schemas.TaskResponse)
async def complete_personal_task_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.complete_personal_task(task_id, current_user, db)

@router.post("/{task_id}/reopen", response_model=schemas.TaskResponse)
async def reopen_task_endpoint(task_id: str, current_user: schemas.User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await task_controller.reopen_task(task_id, current_user, db)
