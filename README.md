# GESPRO_G2_E1
Proyecto del curso de Gestión de Proyectos en la Universidad de Burgos.

# INTEGRANTES
Roberto Soto López -
Paola Elizabeth Martínez De la Mora -
Camila Ocampo Bastida -
Ximena Jazmín García Vargas -
Arantxa Milene Amayo Vásquez

## Agradecimientos
Este proyecto utilizó ChatGPT (OpenAI) como apoyo para generación de ideas, asistencia con código y documentación.
OpenAI. *ChatGPT*. https://chat.openai.com  
Modelo de lenguaje utilizado para apoyo en el desarrollo del proyecto.

# Gestor de Tareas (Web)

Aplicación web sencilla para gestionar tareas: permite listar y crear tareas, aplicando validaciones básicas.
El backend expone una API REST y el frontend consume esa API desde el navegador.

## Funcionalidades
- Listar tareas (GET /tasks).
- Crear tareas (POST /tasks) con validaciones básicas (título, responsable, tiempos).
- Actualizar tareas (PATCH /tasks/{id}) para cambiar estado, comentarios o tiempos.
- Configurar el máximo de tareas en IN_PROGRESS (GET/PATCH /settings).
- Obtener responsables desde JSON (GET /responsibles).
- Endpoint de verificación (GET /health).

## Tecnologías
- Backend: Python + FastAPI
- Frontend: HTML + JavaScript (fetch)

## Requisitos
- Python 3.10+ (recomendado)
- pip
- Navegador web moderno

## Estructura del repositorio

/
├── backend/
│ ├── app.py # o main.py (según framework)
│ └── requirements.txt
├── frontend/
│ ├── index.html
│ ├── script.js
│ ├── style.css
│ └── logo1.png
└── docs/ # documentación adicional


## Cómo ejecutar en local

### 1) Clonar el repositorio
bash
git clone https://github.com/SotoRoberto/GESPRO_G2_E1.git
cd GESPRO_G2_E1


### 2) Backend (FastAPI)
bash
cd backend
python -m venv .venv
# Activación:
#   Windows: .venv\\Scripts\\activate
#   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app:app --reload --port 8000


> Nota: ejecuta el backend desde la carpeta backend/ para que pueda leer
> tasks.json, settings.json y responsibles.json.

### 3) Frontend
Puedes abrir frontend/index.html directamente o servirlo con un servidor simple:
bash
python -m http.server 8001 --directory ../frontend

Luego abre http://127.0.0.1:8001 en el navegador.

## Responsables
Los responsables se cargan desde backend/responsibles.json. Si quieres agregar más,
edita ese archivo y reinicia el backend.

## API (endpoints)

### GET /health
Devuelve un estado simple para comprobar que el backend está activo.

Respuesta (ejemplo):
json
{ "status": "ok" }


### GET /tasks
Devuelve la lista de tareas.

Respuesta (ejemplo):
json
[
  { "id": 1, "title": "Primera tarea", "status": "TODO" }
]


### POST /tasks
Crea una nueva tarea.

Body (ejemplo):
json
{ "title": "Nueva tarea", "responsible": "R1" }


Respuesta (ejemplo):
json
{ "id": 2, "title": "Nueva tarea", "status": "TODO" }


### PATCH /tasks/{id}
Actualiza estado, comentarios, tiempos o responsable.

### GET /settings / PATCH /settings
Consulta o actualiza el máximo de tareas en IN_PROGRESS.

### GET /responsibles
Devuelve la lista de responsables desde responsibles.json.

## Notas
- Los archivos tasks.json y settings.json persisten los datos en disco.
- Si el navegador bloquea peticiones por CORS, revisa la URL del backend en
  frontend/script.js.