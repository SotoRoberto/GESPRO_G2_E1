const API_BASE_URL = "http://127.0.0.1:8000";

async function loadTasks() {
  const list = document.getElementById("task-list");
  list.innerHTML = "<li>Cargando...</li>";

  try {
    const res = await fetch(`${API_BASE_URL}/tasks`);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

    const tasks = await res.json();

    list.innerHTML = "";
    if (tasks.length === 0) {
      list.innerHTML = "<li>No hay tareas aún.</li>";
      return;
    }

    for (const task of tasks) {
      const li = document.createElement("li");
      li.textContent = `${task.title} [${task.status}]`;
      list.appendChild(li);
    }
  } catch (err) {
    list.innerHTML = `<li>Error cargando tareas: ${err.message}</li>`;
  }
}

async function createTask(title) {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    let detail = "Error creando tarea";
    try {
      const data = await res.json();
      detail = data.detail || data.error || detail;
    } catch {}
    throw new Error(detail);
  }

  return await res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();

  const form = document.getElementById("task-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const input = document.getElementById("task-title");
      const title = input.value.trim();

      if (!title) {
        alert("El título no puede estar vacío");
        return;
      }

      try {
        await createTask(title);
        input.value = "";
        await loadTasks();
      } catch (err) {
        alert(err.message);
      }
    });
  }
});




