const API_BASE_URL = "http://127.0.0.1:8000";

// Regla de negocio opcional (si quieres limitar IN_PROGRESS)
const MAX_IN_PROGRESS = 5;

function setFormError(msg) {
  const p = document.getElementById("form-error");
  if (p) p.textContent = msg || "";
}

async function apiGetTasks() {
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiCreateTask(payload) {
  const res = await fetch(`${API_BASE_URL}/tasks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

// PATCH genérico para status / comments / actual_time (y lo que tu backend soporte)
async function apiPatchTask(id, payload) {
  const res = await fetch(`${API_BASE_URL}/tasks/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
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

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function countInProgressTasks(tasks) {
  return tasks.filter((t) => t.status === "IN_PROGRESS").length;
}

function renderTask(task, tasksSnapshot, onChange) {
  const card = document.createElement("div");
  card.className = "task";

  const title = document.createElement("p");
  title.className = "task-title";

  // Puedes mostrar más info si quieres
  // Ejemplo: "Título — 1.5h est"
  const est = task.estimated_time ?? task.estimatedTime ?? 0;
  const desc = task.description ?? "";
  title.textContent = est ? `${task.title} (${est}h est.)` : task.title;

  if (desc) {
    const d = document.createElement("p");
    d.style.margin = "0 0 8px";
    d.style.opacity = "0.85";
    d.textContent = desc;
    card.appendChild(d);
  }

  const actions = document.createElement("div");
  actions.className = "task-actions";

  const btnLeft = document.createElement("button");
  btnLeft.textContent = "←";
  btnLeft.disabled = task.status === "TODO";
  btnLeft.addEventListener("click", async () => {
    try {
      await apiPatchTask(task.id, { status: prevStatus(task.status) });
      await onChange();
    } catch (e) {
      alert(e.message);
    }
  });

  const btnRight = document.createElement("button");
  btnRight.textContent = "→";
  btnRight.disabled = task.status === "DONE";
  btnRight.addEventListener("click", async () => {
    const targetStatus = nextStatus(task.status);

    // Regla de negocio: máximo en IN_PROGRESS
    if (targetStatus === "IN_PROGRESS" && countInProgressTasks(tasksSnapshot) >= MAX_IN_PROGRESS) {
      alert(`No se pueden tener más de ${MAX_IN_PROGRESS} tareas en IN_PROGRESS.`);
      return;
    }

    try {
      // Si va a DONE, pedir comentarios + tiempo real
      if (targetStatus === "DONE") {
        const comments = prompt("Comentarios de cierre (opcional):", task.comments || "") ?? "";
        const timeStr = prompt("Tiempo real utilizado (horas):", String(task.actual_time ?? 0)) ?? "0";
        const actual_time = normalizeNumber(timeStr, 0);

        if (actual_time < 0) {
          alert("El tiempo real no puede ser negativo.");
          return;
        }

        await apiPatchTask(task.id, { status: "DONE", comments, actual_time });
      } else {
        await apiPatchTask(task.id, { status: targetStatus });
      }

      await onChange();
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
  const colTodo = document.getElementById("col-todo");
  const colInProgress = document.getElementById("col-inprogress");
  const colDone = document.getElementById("col-done");

  // Limpieza segura
  colTodo.innerHTML = "";
  colInProgress.innerHTML = "";
  colDone.innerHTML = "";

  try {
    const tasks = await apiGetTasks();

    if (!tasks || tasks.length === 0) {
      colTodo.innerHTML = "<div class='task'>No hay tareas aún.</div>";
      return;
    }

    // Render por columnas
    for (const t of tasks) {
      const node = renderTask(t, tasks, loadBoard);

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
  const inputDesc = document.getElementById("task-desc"); // nuevo
  const inputEst = document.getElementById("task-est");   // nuevo (number)
  const selectStatus = document.getElementById("task-status");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormError("");

    const title = (inputTitle?.value || "").trim();
    const description = (inputDesc?.value || "").trim();
    const status = selectStatus?.value || "TODO";
    const estRaw = inputEst?.value || "";
    const estimated_time = estRaw === "" ? 0 : normalizeNumber(estRaw, 0);

    // Validaciones básicas (frontend)
    if (!title) {
      setFormError("El título no puede estar vacío.");
      return;
    }
    if (title.length > 120) {
      setFormError("El título es demasiado largo (máx. 120 caracteres).");
      return;
    }
    if (estimated_time < 0) {
      setFormError("El tiempo estimado no puede ser negativo.");
      return;
    }

    try {
      // Para validar límite de IN_PROGRESS necesitamos tasks actuales:
      const tasksNow = await apiGetTasks();
      if (status === "IN_PROGRESS" && countInProgressTasks(tasksNow) >= MAX_IN_PROGRESS) {
        setFormError(`Solo se permiten ${MAX_IN_PROGRESS} tareas en IN_PROGRESS.`);
        return;
      }

      await apiCreateTask({ title, description, estimated_time, status });

      if (inputTitle) inputTitle.value = "";
      if (inputDesc) inputDesc.value = "";
      if (inputEst) inputEst.value = "";
      if (selectStatus) selectStatus.value = "TODO";

      await loadBoard();
    } catch (err) {
      setFormError(err.message);
    }
  });
});
