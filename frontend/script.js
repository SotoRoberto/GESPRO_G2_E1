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

document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
});
