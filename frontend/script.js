const API_BASE_URL = "http://127.0.0.1:8000";

const colTodo = document.getElementById("col-todo");
const colInProgress = document.getElementById("col-inprogress");
const colDone = document.getElementById("col-done");

function setFormError(msg) {
  document.getElementById("form-error").textContent = msg || "";
}

function clearBoard() {
  colTodo.innerHTML = "";
  colInProgress.innerHTML = "";
  colDone.innerHTML = "";
}

async function apiGetTasks() {
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiCreateTask(title, status) {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, status }),
  });

  if (!res.ok) {
    let message = `Error HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.detail || data.error || message;
    } catch {}
    throw new Error(message);
  }

  return await res.json();
}

async function apiMoveTask(id, status) {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    let message = `Error HTTP ${res.status}`;
    try {
      const data = await res.json();
      message = data.detail || data.error || message;
    } catch {}
    throw new Error(message);
  }

  return await res.json();
}

function nextStatus(status) {
  if (status === "TODO") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "DONE";
  return "DONE";
}

function prevStatus(status) {
  if (status === "DONE") return "IN_PROGRESS";
  if (status === "IN_PROGRESS") return "TODO";
  return "TODO";
}

function renderTask(task) {
  const card = document.createElement("div");
  card.className = "task";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const btnLeft = document.createElement("button");
  btnLeft.textContent = "←";
  btnLeft.disabled = task.status === "TODO";
  btnLeft.addEventListener("click", async () => {
    try {
      await apiMoveTask(task.id, prevStatus(task.status));
      await loadBoard();
    } catch (e) {
      alert(e.message);
    }
  });

  const btnRight = document.createElement("button");
  btnRight.textContent = "→";
  btnRight.disabled = task.status === "DONE";
  btnRight.addEventListener("click", async () => {
    try {
      await apiMoveTask(task.id, nextStatus(task.status));
      await loadBoard();
    } catch (e) {
      alert(e.message);
    }
  });

  actions.appendChild(btnLeft);
  actions.appendChild(btnRight);

  card.appendChild(title);
  card.appendChild(actions);

  return card;
}

async function loadBoard() {
  clearBoard();
  try {
    const tasks = await apiGetTasks();

    if (tasks.length === 0) {
      colTodo.innerHTML = "<div class='task'>No hay tareas aún.</div>";
      return;
    }

    for (const t of tasks) {
      const node = renderTask(t);
      if (t.status === "TODO") colTodo.appendChild(node);
      else if (t.status === "IN_PROGRESS") colInProgress.appendChild(node);
      else colDone.appendChild(node);
    }
  } catch (e) {
    colTodo.innerHTML = `<div class='task'>Error: ${e.message}</div>`;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadBoard();

  const form = document.getElementById("task-form");
  const inputTitle = document.getElementById("task-title");
  const selectStatus = document.getElementById("task-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormError("");

    const title = inputTitle.value.trim();
    const status = selectStatus.value;

    if (!title) {
      setFormError("El título no puede estar vacío.");
      return;
    }
    if (title.length > 120) {
      setFormError("El título es demasiado largo (máx. 120 caracteres).");
      return;
    }

    try {
      await apiCreateTask(title, status);
      inputTitle.value = "";
      selectStatus.value = "TODO";
      await loadBoard();
    } catch (err) {
      setFormError(err.message);
    }
  });
});

