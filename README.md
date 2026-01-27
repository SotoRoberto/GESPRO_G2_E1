# GESPRO_G2_E1
Proyecto del curso de Gestión de Proyectos en la Universidad de Burgos
# Gestor de Tareas (Web)

Aplicación web sencilla para gestionar tareas: permite listar y crear tareas, aplicando validaciones básicas.
El backend expone una API REST y el frontend consume esa API desde el navegador.

## Funcionalidades
- Listar tareas (`GET /tasks`)
- Crear tareas (`POST /tasks`)
- Endpoint de verificación (`GET /health` o `/`)
- Persistencia en memoria (las tareas se reinician al apagar el backend)
- Validaciones básicas al crear tareas (por ejemplo, título no vacío)

## Tecnologías
- Backend: Python (Flask o FastAPI)
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
│ └── styles.css # opcional
└── docs/ # documentación adicional


## Cómo ejecutar en local

### 1) Clonar el repositorio
```bash
git clone <https://github.com/SotoRoberto/GESPRO_G2_E1.git>

2) Backend
cd backend
python -m venv .venv
# Activación:
#   Windows: .venv\Scripts\activate
#   macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt

Si usas Flask   
python app.py
# o: flask --app app run --debug
3) Frontend

Abre frontend/index.html en el navegador.

Si el frontend usa fetch, asegúrate de que la URL del backend sea la correcta (host/puerto).

API (endpoints)
GET /health (o /)

Devuelve un estado simple para comprobar que el backend está activo.
Respuesta (ejemplo)

{ "status": "ok" }

GET /tasks

Devuelve la lista de tareas.

Respuesta (ejemplo)

[
  { "id": 1, "title": "Primera tarea", "status": "TODO" }
]

POST /tasks

Crea una nueva tarea.

Body (ejemplo)

{ "title": "Nueva tarea" }


Respuesta (ejemplo)
{ "id": 2, "title": "Nueva tarea", "status": "TODO" }
Notas
La persistencia es en memoria: si reinicias el backend, se pierde el contenido.
Si el navegador bloquea peticiones por CORS, habilita CORS en el backend o sirve el frontend desde el mismo dominio/puerto.
