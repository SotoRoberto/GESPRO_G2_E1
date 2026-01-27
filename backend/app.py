from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------
# Modelos
# ---------------------------

TaskStatus = Literal["TODO", "IN_PROGRESS", "DONE"]


class Task(BaseModel):
    id: int
    title: str
    status: TaskStatus = "TODO"


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, description="Título de la tarea (no vacío).")
    status: Optional[TaskStatus] = None  # opcional; si no viene, se pone TODO


class ErrorResponse(BaseModel):
    error: str


# ---------------------------
# App
# ---------------------------

app = FastAPI(title="Gestor de Tareas API", version="1.0.0")

# CORS (para poder abrir frontend/index.html y llamar al backend)
# En producción lo normal es restringir origins.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------
# Persistencia en memoria
# ---------------------------

_tasks: List[Task] = []
_next_id: int = 1


def _sanitize_title(title: str) -> str:
    """Recorta espacios y valida que no quede vacío."""
    cleaned = title.strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="El título no puede estar vacío")
    return cleaned

# ---------------------------
# Endpoints
# ---------------------------

@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/tasks", response_model=List[Task])
def list_tasks():
    return _tasks


@app.post("/tasks", response_model=Task)
def create_task(payload: TaskCreate):
    global _next_id

    title = _sanitize_title(payload.title)
    status: TaskStatus = payload.status if payload.status is not None else "TODO"

    task = Task(id=_next_id, title=title, status=status)
    _next_id += 1
    _tasks.append(task)

    return task