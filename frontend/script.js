const API_BASE_URL = "http://127.0.0.1:8000";

const DEFAULT_MAX_IN_PROGRESS = 5;
let maxInProgress = DEFAULT_MAX_IN_PROGRESS;

function setFormError(msg) {
  const p = document.getElementById("form-error");
  if (p) p.textContent = msg || "";
}

async function apiGetTasks() {
  const res = await fetch(`${API_BASE_URL}/tasks`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiGetSettings() {
  const res = await fetch(`${API_BASE_URL}/settings`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiGetResponsibles() {
  const res = await fetch(`${API_BASE_URL}/responsibles`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

async function apiPatchSettings(payload) {
  const res = await fetch(`${API_BASE_URL}/settings`, {
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

function updateInProgressBadge(value) {
  const badge = document.getElementById("inprogress-max");
  if (badge) {
    badge.textContent = `Máx: ${value}`;
  }
}

function renderResponsibleOptions(items) {
  const select = document.getElementById("task-resp");
  if (!select) return;
  select.innerHTML = "<option value=\"\" disabled selected>Selecciona un responsable</option>";
  for (const name of items) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    select.appendChild(option);
  }
}

function setLimitHint(message, isError = false) {
  const hint = document.getElementById("limit-hint");
  if (hint) {
    hint.textContent = message || "";
    hint.classList.toggle("hint-error", isError);
  }
}

function renderDetails(task) {
  const content = document.getElementById("details-content");
  if (!content) return;
  const est = task.estimated_time ?? task.estimatedTime ?? 0;
  const actual = task.actual_time ?? task.actualTime ?? 0;
  const comments = task.comments || "Sin comentarios";
  const responsible = task.responsible || "Sin responsable";

  content.innerHTML = `
    <div class="detail-row">
      <span class="detail-label">Título</span>
      <span class="detail-value">${task.title}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Responsable</span>
      <span class="detail-value">${responsible}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Descripción</span>
      <span class="detail-value">${task.description || "Sin descripción"}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Comentarios</span>
      <span class="detail-value">${comments}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Tiempo estimado</span>
      <span class="detail-value">${est} hrs</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Tiempo real</span>
      <span class="detail-value">${actual} hrs</span>
    </div>
  `;
}

function openDetails(task) {
  renderDetails(task);
  const modal = document.getElementById("details-modal");
  if (modal) {
    modal.classList.remove("hidden");
  }
}

function closeDetails() {
  const modal = document.getElementById("details-modal");
  if (modal) {
    modal.classList.add("hidden");
  }
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
    if (targetStatus === "IN_PROGRESS" && countInProgressTasks(tasksSnapshot) >= maxInProgress) {
      alert(`No se pueden tener más de ${maxInProgress} tareas en IN_PROGRESS.`);
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

  const btnDetails = document.createElement("button");
  btnDetails.textContent = "Detalles";
  btnDetails.className = "btn-secondary";
  btnDetails.addEventListener("click", () => openDetails(task));

  actions.appendChild(btnDetails);

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
  const modal = document.getElementById("details-modal");
  const modalClose = document.getElementById("details-close");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeDetails();
    });
  }
  if (modalClose) {
    modalClose.addEventListener("click", closeDetails);
  }

  updateInProgressBadge(maxInProgress);
  loadBoard();

  const form = document.getElementById("task-form");
  const inputTitle = document.getElementById("task-title");
  const inputDesc = document.getElementById("task-desc"); // nuevo
  const inputEst = document.getElementById("task-est");   // nuevo (number)
  const inputResp = document.getElementById("task-resp");
  const selectStatus = document.getElementById("task-status");
  const inputMax = document.getElementById("max-inprogress");

  if (inputMax) {
    apiGetSettings()
      .then((settings) => {
        maxInProgress = settings.max_in_progress ?? DEFAULT_MAX_IN_PROGRESS;
        inputMax.value = String(maxInProgress);
        updateInProgressBadge(maxInProgress);
      })
      .catch(() => {
        maxInProgress = DEFAULT_MAX_IN_PROGRESS;
        inputMax.value = String(maxInProgress);
        updateInProgressBadge(maxInProgress);
      });

    inputMax.addEventListener("change", async () => {
      const parsed = normalizeNumber(inputMax.value, DEFAULT_MAX_IN_PROGRESS);
      if (parsed < 1 || parsed > 50) {
        setLimitHint("El máximo debe estar entre 1 y 50.", true);
        inputMax.value = String(maxInProgress);
        return;
      }

      try {
        const updated = await apiPatchSettings({ max_in_progress: parsed });
        maxInProgress = updated.max_in_progress;
        updateInProgressBadge(maxInProgress);
        setLimitHint("Límite actualizado correctamente.");
      } catch (err) {
        setLimitHint(err.message, true);
        inputMax.value = String(maxInProgress);
      }
    });
  }

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setFormError("");

    const title = (inputTitle?.value || "").trim();
    const description = (inputDesc?.value || "").trim();
    const responsible = (inputResp?.value || "").trim();
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
    if (!responsible) {
      setFormError("El responsable es obligatorio.");
      return;
    }
    if (description.length > 280) {
      setFormError("La descripción es demasiado larga (máx. 280 caracteres).");
      return;
    }

    try {
      // Para validar límite de IN_PROGRESS necesitamos tasks actuales:
      const tasksNow = await apiGetTasks();
      if (status === "IN_PROGRESS" && countInProgressTasks(tasksNow) >= maxInProgress) {
        setFormError(`Solo se permiten ${maxInProgress} tareas en IN_PROGRESS.`);
        return;
      }

      await apiCreateTask({ title, description, estimated_time, status, responsible });

      if (inputTitle) inputTitle.value = "";
      if (inputDesc) inputDesc.value = "";
      if (inputEst) inputEst.value = "";
      if (inputResp) inputResp.value = "";
      if (selectStatus) selectStatus.value = "TODO";

      await loadBoard();
    } catch (err) {
      setFormError(err.message);
    }
  });
});
