from typing import List, Literal, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import os


# =========================================================
# MODELOS
# Se investigó el uso de Pydantic para definir esquemas
# de datos y validación automática en FastAPI.
# =========================================================

TaskStatus = Literal["TODO", "IN_PROGRESS", "DONE"]

class Task(BaseModel):
    id: int
    title: str
    description: str = ""                 # NUEVO
    estimated_time: float = 0.0           # NUEVO (horas, por ejemplo)
    responsible: str = ""                 # NUEVO
    status: TaskStatus = "TODO"
    comments: str = ""                    # NUEVO
    actual_time: float = 0.0              # NUEVO (horas)

class TaskCreate(BaseModel):
    title: str = Field(
        ..., 
        min_length=1, 
        max_length=120,
        description="Título de la tarea (no vacío)."
    )
    description: Optional[str] = Field("", max_length=280)       # NUEVO
    estimated_time: Optional[float] = 0.0 # NUEVO
    responsible: Optional[str] = Field("", max_length=80)       # NUEVO
    status: Optional[TaskStatus] = None  # Si no viene, se asigna TODO

class TaskUpdate(BaseModel):
    # para cambios parciales (status, comentarios, tiempo real, etc.)
    status: Optional[TaskStatus] = None
    comments: Optional[str] = Field(None, max_length=500)
    actual_time: Optional[float] = None
    responsible: Optional[str] = Field(None, max_length=80)

class Settings(BaseModel):
    max_in_progress: int = Field(5, ge=1, le=50)

class ErrorResponse(BaseModel):
    error: str

# =========================================================
# APP
# Se investigó la configuración básica de FastAPI y CORS
# para permitir la conexión con un frontend.
# =========================================================

app = FastAPI(
    title="Gestor de Tareas API",
    version="1.0.0"
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(BASE_DIR, "tasks.json")
SETTINGS_FILE = os.path.join(BASE_DIR, "settings.json")
RESPONSIBLES_FILE = os.path.join(BASE_DIR, "responsibles.json")

def load_tasks_from_file():
    if not os.path.exists(DATA_FILE):
        return [], 1

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    tasks = [Task(**t) for t in data]
    next_id = max([t.id for t in tasks], default=0) + 1
    return tasks, next_id


def save_tasks_to_file(tasks):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(
            [t.model_dump() for t in tasks],
            f,
            indent=2,
            ensure_ascii=False
        )

def load_settings_from_file():
    if not os.path.exists(SETTINGS_FILE):
        return Settings()

    with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    try:
        return Settings(**data)
    except Exception:
        return Settings()


def save_settings_to_file(settings: Settings):
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(settings.model_dump(), f, indent=2, ensure_ascii=False)

def load_responsibles_from_file():
    if not os.path.exists(RESPONSIBLES_FILE):
        return []

    with open(RESPONSIBLES_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    if isinstance(data, dict):
        return data.get("responsibles", [])
    if isinstance(data, list):
        return data
    return []


def _sanitize_title(title: str) -> str:
    """
    Se investigó la validación manual de datos
    para evitar títulos vacíos o con solo espacios.
    """
    cleaned = title.strip()
    if not cleaned:
        raise HTTPException(
            status_code=400,
            detail="El título no puede estar vacío"
        )
    return cleaned

def _sanitize_short_text(value: Optional[str]) -> str:
    return (value or "").strip()

# =========================================================
# MIDDLEWARE CORS
# =========================================================
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================================
# ENDPOINTS
# =========================================================

@app.get("/responsibles")
def list_responsibles():
    return load_responsibles_from_file()

@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------
# GET /tasks
# Método HTTP GET para la obtención de
# recursos y su implementación en FastAPI.
# Este endpoint devuelve la lista completa de tareas.
# ---------------------------------------------------------
@app.get("/tasks", response_model=List[Task])
def list_tasks():
    return _tasks

# =========================================================
# PERSISTENCIA EN MEMORIA
# Se investigó el uso de listas en memoria como simulación
# de base de datos para pruebas iniciales.
# =========================================================
_tasks, _next_id = load_tasks_from_file()
_settings = load_settings_from_file()

# ---------------------------------------------------------
# POST /tasks
# Se investigó la creación de recursos con POST y el uso
# de modelos de entrada para validación.
# ---------------------------------------------------------
@app.post("/tasks", response_model=Task)
def create_task(payload: TaskCreate):
    global _next_id

    title = _sanitize_title(payload.title)
    status: TaskStatus = payload.status if payload.status is not None else "TODO"

    # Límite in progress
    if status == "IN_PROGRESS" and count_in_progress_tasks() >= _settings.max_in_progress:
        raise HTTPException(
            status_code=400,
            detail=f"No se pueden tener más de {_settings.max_in_progress} tareas en IN_PROGRESS"
        )

    description = _sanitize_short_text(payload.description)
    estimated_time = float(payload.estimated_time or 0.0)
    if estimated_time < 0:
        raise HTTPException(status_code=400, detail="El tiempo estimado no puede ser negativo")
    responsible = _sanitize_short_text(payload.responsible)
    if not responsible:
        raise HTTPException(status_code=400, detail="El responsable es obligatorio")

    task = Task(
        id=_next_id,
        title=title,
        description=description,
        estimated_time=estimated_time,
        responsible=responsible,
        status=status,
        comments="",
        actual_time=0.0
    )

    _next_id += 1
    _tasks.append(task)

    save_tasks_to_file(_tasks)  # si ya tienes persistencia JSON
    return task

@app.patch("/tasks/{task_id}", response_model=Task)
def update_task(task_id: int, payload: TaskUpdate):
    for i, t in enumerate(_tasks):
        if t.id == task_id:
            updates = {}

            if payload.status is not None:
                # Límite IN_PROGRESS también al mover
                if payload.status == "IN_PROGRESS":
                    currently_in_progress = count_in_progress_tasks()

                    # Si la tarea ya está en IN_PROGRESS, no cuenta como "nueva"
                    if t.status != "IN_PROGRESS" and currently_in_progress >= _settings.max_in_progress:
                        raise HTTPException(
                            status_code=400,
                            detail=f"No se pueden tener más de {_settings.max_in_progress} tareas en IN_PROGRESS"
                        )

                updates["status"] = payload.status


            if payload.comments is not None:
                updates["comments"] = payload.comments.strip()

            if payload.actual_time is not None:
                actual_time = float(payload.actual_time)
                if actual_time < 0:
                    raise HTTPException(status_code=400, detail="El tiempo real no puede ser negativo")
                updates["actual_time"] = actual_time

            if payload.responsible is not None:
                cleaned = payload.responsible.strip()
                if not cleaned:
                    raise HTTPException(status_code=400, detail="El responsable es obligatorio")
                updates["responsible"] = cleaned

            updated = t.model_copy(update=updates)
            _tasks[i] = updated

            save_tasks_to_file(_tasks)  # persistencia JSON
            return updated

    raise HTTPException(status_code=404, detail="Task not found")


# ---------------------------------------------------------
# Configuración
# ---------------------------------------------------------

@app.get("/settings", response_model=Settings)
def get_settings():
    return _settings


@app.patch("/settings", response_model=Settings)
def update_settings(payload: Settings):
    global _settings
    max_in_progress = payload.max_in_progress
    if max_in_progress < 1:
        raise HTTPException(status_code=400, detail="El máximo debe ser mayor a cero")
    _settings = Settings(max_in_progress=max_in_progress)
    save_settings_to_file(_settings)
    return _settings


def count_in_progress_tasks():
    return sum(1 for t in _tasks if t.status == "IN_PROGRESS")