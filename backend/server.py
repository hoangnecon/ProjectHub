from fastapi import FastAPI, APIRouter, Depends, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
import logging
from sqlalchemy.orm import Session
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
import jwt
from datetime import timedelta
from typing import Callable

from config import settings
from models import schemas
from models.database import engine, get_db
from websocket_manager import manager
from middleware.auth import create_access_token

# Create all database tables
schemas.Base.metadata.create_all(bind=engine)

# Import routes
from routes.auth_routes import router as auth_router
from routes.role_routes import router as role_router
from routes.team_routes import router as team_router
from routes.project_routes import router as project_router
from routes.task_routes import router as task_router
from routes.notification_routes import router as notification_router
from routes.user_routes import router as user_router
from routes.project_member_routes import router as project_member_router

# Import controllers for init endpoint
from controllers.role_controller import initialize_default_roles

# Create the main app
app = FastAPI(title="ProjectHub API - Modern Task Management")

# Add centralized exception handler
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"message": "An internal server error occurred.", "detail": str(exc)},
    )

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=settings.CORS_ORIGINS.split(','),
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-New-Token"],
)

class TokenRefreshMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable):
        response = await call_next(request)
        
        # Only refresh for successful API requests that are not the login endpoint
        if response.status_code >= 200 and response.status_code < 300 and request.url.path.startswith("/api/") and request.url.path != "/api/auth/login":
            auth_header = request.headers.get('authorization')
            if auth_header:
                try:
                    scheme, token = auth_header.split()
                    if scheme.lower() == 'bearer':
                        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.ALGORITHM])
                        user_id = payload.get('sub')
                        if user_id:
                            new_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
                            new_token = create_access_token(
                                data={"sub": user_id},
                                expires_delta=new_token_expires
                            )
                            response.headers['X-New-Token'] = new_token
                except (ValueError, jwt.PyJWTError):
                    pass
                
        return response

app.add_middleware(TokenRefreshMiddleware)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Include all route modules
api_router.include_router(auth_router)
api_router.include_router(role_router)
api_router.include_router(team_router)
api_router.include_router(project_router)
api_router.include_router(task_router)
api_router.include_router(notification_router)
api_router.include_router(user_router)
api_router.include_router(project_member_router)

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "ProjectHub API - Modern Task Management System"}

# Initialization endpoint
@api_router.post("/init")
async def initialize(db: Session = Depends(get_db)):
    return await initialize_default_roles(db)

# WebSocket endpoint
@api_router.websocket("/ws/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_text()
            # For now, we just broadcast any message received
            await manager.broadcast(f"Client {project_id} says: {data}", project_id)
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
        await manager.broadcast(f"Client {project_id} left the chat", project_id)

# Include the main API router
app.include_router(api_router)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown():
    pass
