from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List

app = FastAPI()

# Permitir que el frontend se conecte
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Modelo de datos de una tarea
class Task(BaseModel):
    id: int
    title: str
    status: str

class TaskCreate(BaseModel):
    title: str

# Lista de tareas guardadas en memoria
tasks: List[Task] = [
    Task(id=1, title="Configurar proyecto", status="backlog"),
    Task(id=2, title="Crear backend", status="doing"),
    Task(id=3, title="Conectar frontend", status="done"),
]

# Endpoint de prueba
@app.get("/health")
def health():
    return {"status": "ok"}

# Listar tareas
@app.get("/tasks", response_model=List[Task])
def list_tasks():
    return tasks

# Crear tarea nueva
@app.post("/tasks", response_model=Task)
def create_task(task_in: TaskCreate):
    title = task_in.title.strip()
    if not title:
        raise HTTPException(status_code=400, detail="El título no puede estar vacío")

    new_id = max([t.id for t in tasks] or [0]) + 1
    task = Task(id=new_id, title=title, status="backlog")
    tasks.append(task)
    return task