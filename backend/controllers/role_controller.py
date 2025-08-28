from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
import logging

from models import schemas
from models.database import get_db

async def get_role_by_id(role_id: str, db: Session = Depends(get_db)):
    role = db.query(schemas.Role).filter(schemas.Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found.")
    return role

async def initialize_default_roles(db: Session = Depends(get_db)):
    """Initialize default roles if they don't exist"""
    try:
        default_roles = [
            {"name": "Owner", "description": "Owner of a project or team", "permissions": ["*"]},
            {"name": "Member", "description": "A standard member of a project or team", "permissions": ["read"]}
        ]
        
        created_roles = []
        for role_data in default_roles:
            existing_role = db.query(schemas.Role).filter(schemas.Role.name == role_data["name"]).first()
            if not existing_role:
                role = schemas.Role(**role_data)
                db.add(role)
                created_roles.append(role.name)
        
        if created_roles:
            db.commit()
            return {"message": f"Default roles initialized: {', '.join(created_roles)}"}
        else:
            return {"message": "Default roles already exist."}

    except Exception as e:
        db.rollback()
        logging.error(f"Error initializing default roles: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error while initializing roles: {e}")