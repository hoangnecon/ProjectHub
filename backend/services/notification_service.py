from sqlalchemy.orm import Session
from models import schemas
import logging
from fastapi import HTTPException

async def create_notification(notification_data: schemas.NotificationCreate, db: Session):
    try:
        new_notification = schemas.Notification(**notification_data.dict())
        db.add(new_notification)
        db.commit()
        db.refresh(new_notification)
        return new_notification
    except Exception as e:
        db.rollback()
        logging.error(f"Error creating notification: {e}")

async def get_user_notifications(user_id: str, unread_only: bool, db: Session):
    query = db.query(schemas.Notification).filter(schemas.Notification.user_id == user_id)
    if unread_only:
        query = query.filter(schemas.Notification.is_read == False)
    return query.order_by(schemas.Notification.created_at.desc()).limit(100).all()

async def mark_notification_read(notification_id: str, user_id: str, db: Session):
    notification = db.query(schemas.Notification).filter(
        schemas.Notification.id == notification_id,
        schemas.Notification.user_id == user_id
    ).first()
    if notification:
        notification.is_read = True
        db.commit()
        return True
    return False

async def mark_all_notifications_read(user_id: str, db: Session):
    try:
        updated_count = db.query(schemas.Notification).filter(
            schemas.Notification.user_id == user_id,
            schemas.Notification.is_read == False
        ).update({"is_read": True}, synchronize_session=False)
        db.commit()
        return updated_count
    except Exception as e:
        db.rollback()
        logging.error(f"Error marking all notifications as read: {e}")
        return 0

async def get_unread_count(user_id: str, db: Session):
    return db.query(schemas.Notification).filter(
        schemas.Notification.user_id == user_id,
        schemas.Notification.is_read == False
    ).count()

async def create_project_invitation_notification(project_id: str, invited_user_id: str, inviter_user_id: str, db: Session):
    inviter = db.query(schemas.User).filter(schemas.User.id == inviter_user_id).first()
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()

    if not inviter or not project:
        return

    message = f"You have been invited to join the project '{project.name}' by {inviter.username}."
    notification_data = schemas.NotificationCreate(
        user_id=invited_user_id,
        title="Project Invitation",
        message=message,
        type='project_invitation',
        related_id=project_id
    )
    await create_notification(notification_data, db)

async def create_team_invitation_notification(team_id: str, invited_user_id: str, inviter_user_id: str, db: Session):
    inviter = db.query(schemas.User).filter(schemas.User.id == inviter_user_id).first()
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()

    if not inviter or not team:
        return

    message = f"You have been invited to join the team '{team.name}' by {inviter.username}."
    notification_data = schemas.NotificationCreate(
        user_id=invited_user_id,
        title="Team Invitation",
        message=message,
        type='team_invitation',
        related_id=team_id
    )
    await create_notification(notification_data, db)

async def create_remove_from_team_notification(team_id: str, removed_user_id: str, remover_user_id: str, db: Session):
    remover = db.query(schemas.User).filter(schemas.User.id == remover_user_id).first()
    team = db.query(schemas.Team).filter(schemas.Team.id == team_id).first()

    if not remover or not team:
        return

    message = f"You have been removed from the team '{team.name}' by {remover.username}."
    notification_data = schemas.NotificationCreate(
        user_id=removed_user_id,
        title="Removed from Team",
        message=message,
        type='remove_from_team',
        related_id=team_id
    )
    await create_notification(notification_data, db)

async def create_project_deleted_notification(project_id: str, project_name: str, user_id: str, remover_user_id: str, db: Session):
    remover = db.query(schemas.User).filter(schemas.User.id == remover_user_id).first()

    if not remover:
        return

    message = f"The project '{project_name}' has been deleted by {remover.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Project Deleted",
        message=message,
        type='project_deleted',
        related_id=project_id
    )
    await create_notification(notification_data, db)

async def create_role_changed_notification(project_id: str, user_id: str, new_role: str, changer_user_id: str, db: Session):
    changer = db.query(schemas.User).filter(schemas.User.id == changer_user_id).first()
    project = db.query(schemas.Project).filter(schemas.Project.id == project_id).first()

    if not changer or not project:
        return

    message = f"Your role in project '{project.name}' has been changed to '{new_role}' by {changer.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Role Changed",
        message=message,
        type='role_changed',
        related_id=project_id
    )
    await create_notification(notification_data, db)

async def create_task_assigned_notification(task_id: str, user_id: str, assigner_id: str, db: Session):
    assigner = db.query(schemas.User).filter(schemas.User.id == assigner_id).first()
    task = db.query(schemas.Task).filter(schemas.Task.id == task_id).first()

    if not assigner or not task:
        return

    message = f"You have been assigned a new task: '{task.title}' by {assigner.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="New Task Assigned",
        message=message,
        type='task_assigned',
        related_id=task_id
    )
    await create_notification(notification_data, db)

async def create_task_status_changed_notification(task_id: str, user_id: str, new_status: str, changer_id: str, db: Session):
    changer = db.query(schemas.User).filter(schemas.User.id == changer_id).first()
    task = db.query(schemas.Task).filter(schemas.Task.id == task_id).first()

    if not changer or not task:
        return

    message = f"The status of task '{task.title}' has been changed to '{new_status}' by {changer.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Task Status Changed",
        message=message,
        type='task_status_changed',
        related_id=task_id
    )
    await create_notification(notification_data, db)

async def create_task_submitted_for_approval_notification(task_id: str, user_id: str, submitter_id: str, db: Session):
    submitter = db.query(schemas.User).filter(schemas.User.id == submitter_id).first()
    task = db.query(schemas.Task).filter(schemas.Task.id == task_id).first()

    if not submitter or not task:
        return

    message = f"Task '{task.title}' has been submitted for approval by {submitter.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Task Submitted for Approval",
        message=message,
        type='task_submitted_for_approval',
        related_id=task_id
    )
    await create_notification(notification_data, db)

async def create_task_approved_notification(task_id: str, user_id: str, approver_id: str, db: Session):
    approver = db.query(schemas.User).filter(schemas.User.id == approver_id).first()
    task = db.query(schemas.Task).filter(schemas.Task.id == task_id).first()

    if not approver or not task:
        return

    message = f"Your submission for task '{task.title}' has been approved by {approver.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Task Approved",
        message=message,
        type='task_approved',
        related_id=task_id
    )
    await create_notification(notification_data, db)

async def create_task_reopened_notification(task_id: str, user_id: str, reopener_id: str, db: Session):
    reopener = db.query(schemas.User).filter(schemas.User.id == reopener_id).first()
    task = db.query(schemas.Task).filter(schemas.Task.id == task_id).first()

    if not reopener or not task:
        return

    message = f"Task '{task.title}' has been reopened by {reopener.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Task Reopened",
        message=message,
        type='task_reopened',
        related_id=task_id
    )
    await create_notification(notification_data, db)

async def create_task_changes_requested_notification(task_id: str, user_id: str, requester_id: str, db: Session):
    requester = db.query(schemas.User).filter(schemas.User.id == requester_id).first()
    task = db.query(schemas.Task).filter(schemas.Task.id == task_id).first()

    if not requester or not task:
        return

    message = f"Changes have been requested for task '{task.title}' by {requester.username}."
    notification_data = schemas.NotificationCreate(
        user_id=user_id,
        title="Task Changes Requested",
        message=message,
        type='task_changes_requested',
        related_id=task_id
    )
    await create_notification(notification_data, db)
