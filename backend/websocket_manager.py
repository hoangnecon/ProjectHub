from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import logging

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logging.info(f"Client connected to project {project_id}. Total connections for project: {len(self.active_connections[project_id])}")

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            logging.info(f"Client disconnected from project {project_id}. Total connections for project: {len(self.active_connections.get(project_id, []))}")

    async def broadcast(self, message: str, project_id: str):
        logging.info(f"Broadcasting to project {project_id}. Connections: {len(self.active_connections.get(project_id, []))}")
        if project_id in self.active_connections:
            for i, connection in enumerate(self.active_connections[project_id]):
                try:
                    logging.info(f"Sending to connection {i} for project {project_id}...")
                    await connection.send_text(message)
                    logging.info(f"Successfully sent to connection {i} for project {project_id}.")
                except Exception as e:
                    logging.error(f"Failed to send to connection {i} for project {project_id}: {e}")
        logging.info(f"Finished broadcasting to project {project_id}.")

manager = ConnectionManager()
