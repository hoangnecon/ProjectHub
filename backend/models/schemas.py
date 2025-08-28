from pydantic import BaseModel, Field, validator
from typing import List, Optional, Literal, Any
import uuid
from datetime import datetime, timezone

# SQLAlchemy specific imports
from sqlalchemy import (Column, String, DateTime, Boolean, ForeignKey, Table, JSON, ARRAY)
from sqlalchemy.orm import relationship
from .database import Base

# Association Table for Team Members (Many-to-Many)
team_member_association = Table(
    'team_members',
    Base.metadata,
    Column('team_id', String, ForeignKey('teams.id'), primary_key=True),
    Column('user_id', String, ForeignKey('users.id'), primary_key=True)
)

# Association Table for Task Assignees (Many-to-Many)
task_assignee_association = Table(
    'task_assignees',
    Base.metadata,
    Column('task_id', String, ForeignKey('tasks.id'), primary_key=True),
    Column('user_id', String, ForeignKey('users.id'), primary_key=True)
)

# --- SQLAlchemy ORM Models ---

class User(Base):
    __tablename__ = 'users'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    teams = relationship("Team", secondary=team_member_association, back_populates="members")
    owned_teams = relationship("Team", back_populates="owner")
    owned_projects = relationship("Project", back_populates="owner")

class Team(Base):
    __tablename__ = 'teams'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String)
    owner_id = Column(String, ForeignKey('users.id'), nullable=False)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    owner = relationship("User", back_populates="owned_teams")
    members = relationship("User", secondary=team_member_association, back_populates="teams")
    projects = relationship("Project", back_populates="team", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = 'projects'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    description = Column(String)
    owner_id = Column(String, ForeignKey('users.id'), nullable=False)
    team_id = Column(String, ForeignKey('teams.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=datetime.now(timezone.utc), onupdate=datetime.now(timezone.utc))

    owner = relationship("User", back_populates="owned_projects")
    team = relationship("Team", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMemberRole", back_populates="project", cascade="all, delete-orphan")

class ProjectMemberRole(Base):
    __tablename__ = 'project_member_roles'
    project_id = Column(String, ForeignKey('projects.id', ondelete="CASCADE"), primary_key=True)
    user_id = Column(String, ForeignKey('users.id', ondelete="CASCADE"), primary_key=True)
    role = Column(String, nullable=False, default='Member')

    project = relationship("Project", back_populates="members")
    user = relationship("User")

class Task(Base):
    __tablename__ = 'tasks'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String, nullable=False)
    description = Column(String)
    notes = Column(String, default="")
    project_id = Column(String, ForeignKey('projects.id'), nullable=True)
    owner_id = Column(String, ForeignKey('users.id'), nullable=True) # For personal tasks
    assigned_by = Column(String, ForeignKey('users.id'), nullable=True)
    status = Column(String, default="todo")
    priority = Column(String, default="medium")
    submission_content = Column(JSON, default=[])
    created_at = Column(DateTime, default=datetime.now(timezone.utc))
    assigned_at = Column(DateTime, nullable=True)
    accepted_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)

    project = relationship("Project", back_populates="tasks")
    assignees = relationship("User", secondary=task_assignee_association)

    @property
    def assignee_ids(self):
        return [str(user.id) for user in self.assignees]

class Notification(Base):
    __tablename__ = 'notifications'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    type = Column(String, default="general")
    is_read = Column(Boolean, default=False)
    related_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.now(timezone.utc))

    user = relationship("User")

class Role(Base):
    __tablename__ = 'roles'
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, nullable=False)
    description = Column(String)
    permissions = Column(ARRAY(String), default=[])
    created_at = Column(DateTime, default=datetime.now(timezone.utc))


# --- Pydantic Schemas (for API requests/responses) ---

# User Models
class UserBase(BaseModel):
    username: str
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PaginatedUserResponse(BaseModel):
    users: List[UserResponse]
    total_count: int

# Role Models
class RoleBase(BaseModel):
    name: str
    description: str
    permissions: List[str] = []

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True

# Project Models
class ProjectBase(BaseModel):
    name: str
    description: str

class ProjectCreate(ProjectBase):
    team_id: Optional[str] = None

class ProjectResponse(ProjectBase):
    id: str
    owner_id: str
    team_id: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ProjectSummary(ProjectResponse):
    member_count: Optional[int] = None

class PaginatedProjectSummaryResponse(BaseModel):
    projects: List[ProjectSummary]
    total_count: int

# Submission Models
class SubmissionEntry(BaseModel):
    user_id: str
    username: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Task Models
class TaskBase(BaseModel):
    title: str
    description: str
    notes: str = ""
    priority: Literal["low", "medium", "high", "critical"] = "medium"
    deadline: Optional[datetime] = None

class TaskCreate(TaskBase):
    project_id: Optional[str] = None
    assignee_ids: List[str] = []

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    assignee_ids: Optional[List[str]] = None
    status: Optional[Literal["todo", "in_progress", "pending_approval", "completed"]] = None
    priority: Optional[Literal["low", "medium", "high", "critical"]] = None
    deadline: Optional[datetime] = None

class TaskResponse(TaskBase):
    id: str
    project_id: Optional[str] = None
    owner_id: Optional[str] = None
    assigned_by: Optional[str] = None
    status: Literal["todo", "in_progress", "pending_approval", "completed"] = "todo"
    submission_content: List[SubmissionEntry] = Field(default_factory=list)
    created_at: datetime
    assigned_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    assignee_ids: List[str] = Field(default_factory=list)
    project: Optional[ProjectResponse] = None

    class Config:
        from_attributes = True

class TaskSummary(TaskResponse):
    pass

class PaginatedTaskSummaryResponse(BaseModel):
    tasks: List[TaskSummary]
    total_count: int

class TaskSubmit(BaseModel):
    content: str

# Team Models
class TeamBase(BaseModel):
    name: str
    description: str

class TeamCreate(TeamBase):
    members: List[str] = []

class TeamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    members: Optional[List[str]] = None

class TeamResponse(TeamBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime
    members: List[UserResponse] = []

    class Config:
        from_attributes = True

class AddMemberRequest(BaseModel):
    userId: str

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    username: Optional[str] = None

# Project Member Models
class ProjectMember(BaseModel):
    project_id: str
    user_id: str
    role: str
    user: UserResponse

    class Config:
        from_attributes = True

class ProjectMemberUpdate(BaseModel):
    role: str

class PaginatedProjectMemberResponse(BaseModel):
    members: List[ProjectMember]
    total_count: int

# Notification Models
class NotificationBase(BaseModel):
    title: str
    message: str
    type: Literal["task_assigned", "task_completed", "deadline_reminder", "team_invitation", "project_invitation", "remove_from_team", "project_deleted", "role_changed", "task_status_changed", "task_submitted_for_approval", "task_approved", "task_reopened", "task_changes_requested", "general"] = "general"
    related_id: Optional[str] = None

class NotificationCreate(NotificationBase):
    user_id: str

class NotificationResponse(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Auth Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenExchangeRequest(BaseModel):
    supabase_access_token: str