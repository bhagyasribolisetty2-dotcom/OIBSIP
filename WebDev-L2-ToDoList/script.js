
// =========================================
// TASKVERSE - COMPLETE APPLICATION
// =========================================

const $ = id => document.getElementById(id);

const storageKey = "taskverse-v1";

const weekdays = [
    "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday"
];

const themes = {
    "Lavender & Sage": [
        "#f8f7fc", "#ffffff", "#8272dc",
        "#a8cba0", "#30263f"
    ],
    "Rose Garden": [
        "#fff1f5", "#ffffff", "#c46189",
        "#b5c9a5", "#53313e"
    ],
    "Ocean Breeze": [
        "#eff8ff", "#ffffff", "#4684bd",
        "#8bd8d2", "#243b53"
    ],
    "Midnight": [
        "#171722", "#262638", "#9175dc",
        "#83b88a", "#f4f1ff"
    ],
    "Vintage Diary": [
        "#f3ebdd", "#fffdf6", "#98734f",
        "#a9b697", "#49392c"
    ],
    "Forest": [
        "#edf4eb", "#ffffff", "#56865b",
        "#b9d4ae", "#294432"
    ],
    "Peach Glow": [
        "#fff4ec", "#ffffff", "#bb7556",
        "#eac5ad", "#51362a"
    ],
    "Minimal": [
        "#f4f4f4", "#ffffff", "#393939",
        "#b5c9b5", "#252525"
    ]
};

const defaultTheme = {
    colors: [...themes["Lavender & Sage"]],
    radius: 16,
    font: "Inter",
    fontSize: 14,
    pattern: "grid",
    animations: true
};

function freshState() {
    return {
        name: "",
        entries: [],
        theme: structuredClone(defaultTheme),
        planner: {
            plans: [],
            extras: [],
            history: {}
        }
    };
}

let state = freshState();

let editingId = null;
let editingType = "list";
let editingPlanId = null;
let editingTaskId = null;
let currentPage = "home";
let calendarMonth = new Date();
let toastTimer;
let lastDay = localDate();

const notified = new Set();


// =========================================
// UTILITIES
// =========================================

function newId() {
    return globalThis.crypto?.randomUUID?.()
        || Date.now().toString(36)
        + Math.random().toString(36).slice(2);
}

function localDate(value = new Date()) {
    const date = new Date(value);

    return `${date.getFullYear()}-${String(
        date.getMonth() + 1
    ).padStart(2, "0")}-${String(
        date.getDate()
    ).padStart(2, "0")}`;
}

function displayDate(value) {
    if (!value) return "";

    const date = value.length === 10
        ? new Date(value + "T12:00:00")
        : new Date(value);

    return date.toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function addDays(date, amount) {
    const result = new Date(date + "T12:00:00");
    result.setDate(result.getDate() + amount);
    return localDate(result);
}

function formatTime(time) {
    if (!time) return "Any time";

    const [hour, minute] = time.split(":").map(Number);

    return `${hour % 12 || 12}:${String(
        minute
    ).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
}

function safe(value = "") {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function validColor(value) {
    return typeof value === "string"
        && /^#[0-9a-f]{6}$/i.test(value);
}

function validDate(value) {
    return typeof value === "string"
        && /^\d{4}-\d{2}-\d{2}$/.test(value)
        && Number.isFinite(Date.parse(value));
}

function validTime(value) {
    return typeof value === "string"
        && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function percentage(done, total) {
    return total ? Math.round(done / total * 100) : 0;
}

function notify(message) {
    $("toast").textContent = message;
    $("toast").classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        $("toast").classList.remove("show");
    }, 3500);
}

function icons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}


// =========================================
// STORAGE AND DATA VALIDATION
// =========================================

function normalizeData(data) {

    if (!data || typeof data !== "object") {
        throw new Error("Invalid data");
    }

    if (!Array.isArray(data.entries)) {
        throw new Error("Invalid entries");
    }

    const result = freshState();

    result.name = typeof data.name === "string"
        ? data.name : "";

    result.entries = data.entries.map(entry => {

        if (!entry || typeof entry.title !== "string") {
            throw new Error("Invalid entry");
        }

        return {
            id: String(entry.id || newId()),
            type: ["list", "note", "diary"].includes(entry.type)
                ? entry.type : "note",
            title: entry.title,
            format: ["checklist", "bullet", "numbered",
                "paragraph"].includes(entry.format)
                ? entry.format : "paragraph",
            content: typeof entry.content === "string"
                ? entry.content : "",
            items: Array.isArray(entry.items)
                ? entry.items.map(item => ({
                    id: String(item.id || newId()),
                    text: String(item.text || ""),
                    done: Boolean(item.done),
                    completedAt: item.completedAt || null
                })) : [],
            mood: String(entry.mood || ""),
            color: validColor(entry.color)
                ? entry.color : "#ffffff",
            highlighted: Boolean(entry.highlighted),
            pinned: Boolean(entry.pinned),
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: entry.updatedAt || new Date().toISOString(),
            deleted: Boolean(entry.deleted)
        };
    });

    const theme = data.theme || {};

    if (Array.isArray(theme.colors)
        && theme.colors.length === 5
        && theme.colors.every(validColor)) {

        result.theme.colors = [...theme.colors];
    }

    if (Number.isFinite(theme.radius)) {
        result.theme.radius = Math.max(
            0, Math.min(30, theme.radius)
        );
    }

    if (Number.isFinite(theme.fontSize)) {
        result.theme.fontSize = Math.max(
            12, Math.min(19, theme.fontSize)
        );
    }

    if (["Inter", "Georgia", "Arial",
        "monospace"].includes(theme.font)) {

        result.theme.font = theme.font;
    }

    if (["grid", "dots", "plain"].includes(theme.pattern)) {
        result.theme.pattern = theme.pattern;
    }

    result.theme.animations = theme.animations !== false;

    if (data.planner) {

        const planner = data.planner;

        if (!Array.isArray(planner.plans)
            || !Array.isArray(planner.extras)
            || !planner.history
            || typeof planner.history !== "object"
            || Array.isArray(planner.history)) {

            throw new Error("Invalid planner data");
        }

        result.planner.plans = planner.plans.map(plan => {

            if (!plan || !Array.isArray(plan.versions)
                || !plan.versions.length) {

                throw new Error("Invalid timetable");
            }

            return {
                id: String(plan.id || newId()),

                versions: plan.versions.map(version => {

                    if (!validDate(version.start)
                        || !validDate(version.end)
                        || version.end < version.start
                        || !validDate(version.effective)
                        || !Array.isArray(version.days)
                        || version.days.length !== 7) {

                        throw new Error("Invalid schedule");
                    }

                    return {
                        name: String(version.name || "Timetable"),
                        start: version.start,
                        end: version.end,
                        effective: version.effective,
                        paused: Boolean(version.paused),
                        deleted: Boolean(version.deleted),

                        days: version.days.map(day => {

                            if (!Array.isArray(day)) {
                                throw new Error("Invalid weekday");
                            }

                            return day.map(activity => {

                                if (!validTime(activity.start)
                                    || !validTime(activity.end)) {

                                    throw new Error("Invalid activity");
                                }

                                return {
                                    id: String(activity.id || newId()),
                                    name: String(activity.name || ""),
                                    start: activity.start,
                                    end: activity.end
                                };
                            });
                        })
                    };
                })
            };
        });

        result.planner.extras = planner.extras.map(task => {

            if (!validDate(task.date)) {
                throw new Error("Invalid task date");
            }

            return {
                id: String(task.id || newId()),
                name: String(task.name || ""),
                description: String(task.description || ""),
                date: task.date,
                time: validTime(task.time) ? task.time : "",
                priority: ["Low", "Medium", "High"]
                    .includes(task.priority)
                    ? task.priority : "Medium",
                reminder: [-1, 0, 5, 15, 30, 60]
                    .includes(Number(task.reminder))
                    ? Number(task.reminder) : -1
            };
        });

        Object.entries(planner.history).forEach(([date, items]) => {

            if (validDate(date) && Array.isArray(items)) {
                result.planner.history[date] =
                    [...new Set(items.map(String))];
            }
        });
    }

    return result;
}

try {
    const stored = localStorage.getItem(storageKey);

    if (stored) {
        state = normalizeData(JSON.parse(stored));
    }
} catch (error) {
    console.warn("Unable to load saved TaskVerse data.", error);
    notify("Saved data could not be loaded. Check your backup.");
}

function persist() {
    try {

        localStorage.setItem(
            storageKey,
            JSON.stringify(state)
        );

        $("saveStatus").textContent = "✓ All changes saved";

        return true;

    } catch {

        $("saveStatus").textContent = "Storage unavailable";

        notify("Unable to save. Please export a backup.");

        return false;
    }
}


// =========================================
// NAVIGATION
// =========================================

function showPage(page) {

    if (!$(page)?.classList.contains("page")) return;

    currentPage = page;

    document.querySelectorAll(".page").forEach(section => {
        section.classList.toggle(
            "active-page",
            section.id === page
        );
    });

    document.querySelectorAll(".nav-item").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.page === page
        );
    });

    if (window.innerWidth <= 700) {
        document.body.classList.add("sidebar-closed");
    }

    window.scrollTo(0, 0);

    renderAll();
}

document.querySelectorAll(".nav-item").forEach(button => {
    button.addEventListener("click", () => {
        showPage(button.dataset.page);
    });
});

$("menuButton").addEventListener("click", () => {
    document.body.classList.toggle("sidebar-closed");
});

if (window.innerWidth <= 700) {
    document.body.classList.add("sidebar-closed");
}


// =========================================
// PERSONAL PROFILE
// =========================================

function updateProfile() {

    $("profileName").textContent =
        state.name || "My Workspace";

    $("greeting").textContent =
        `Hello, ${state.name || "dreamer"}!`;

    $("username").value = state.name;

    $("currentDate").textContent =
        new Date().toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
        });
}

function saveProfile() {

    state.name = $("username").value.trim();

    updateProfile();

    if (persist()) {
        notify("Profile updated.");
    }
}


// =========================================
// WEEKLY TIMETABLE PLANNER
// =========================================

function openPlanEditor(id = null) {

    editingPlanId = id;

    const plan = state.planner.plans.find(p => p.id === id);

    const version = plan?.versions.at(-1);

    $("planEditorTitle").textContent =
        id ? "Edit Weekly Timetable" : "Create Weekly Timetable";

    $("planName").value = version?.name || "";

    $("planStart").value = version?.start || localDate();

    $("planEnd").value =
        version?.end || addDays(localDate(), 30);

    $("plannerWeekEditor").innerHTML = "";

    weekdays.forEach((day, index) => {

        const container = document.createElement("div");

        container.className = "planner-day";

        container.innerHTML = `
            <h4>${day}</h4>

            <div id="plannerDay${index}"></div>

            <button type="button"
                    data-action="add-slot"
                    data-day="${index}">
                + Add Activity
            </button>
        `;

        $("plannerWeekEditor").append(container);

        const activities = version?.days[index] || [];

        activities.forEach(activity => {
            addPlanSlot(index, activity);
        });
    });

    $("planEditor").showModal();
}

function addPlanSlot(day, activity = {}) {

    const row = document.createElement("div");

    row.className = "planner-slot";

    row.dataset.id = activity.id || newId();

    row.innerHTML = `
        <input type="text"
               class="slot-name"
               placeholder="Activity name"
               aria-label="Activity name"
               required>

        <input type="time"
               class="slot-start"
               aria-label="Starting time"
               required>

        <input type="time"
               class="slot-end"
               aria-label="Ending time"
               required>

        <button type="button"
                class="danger"
                data-action="remove-slot"
                aria-label="Remove activity">
            ✕
        </button>
    `;

    row.querySelector(".slot-name").value =
        activity.name || "";

    row.querySelector(".slot-start").value =
        activity.start || "07:00";

    row.querySelector(".slot-end").value =
        activity.end || "08:00";

    $("plannerDay" + day).append(row);
}

function savePlanVersion(plan, version) {

    const last = plan.versions.at(-1);

    if (last?.effective === version.effective) {
        plan.versions[plan.versions.length - 1] = version;
    } else {
        plan.versions.push(version);
    }
}

$("planForm").addEventListener("submit", event => {

    event.preventDefault();

    const name = $("planName").value.trim();
    const start = $("planStart").value;
    const end = $("planEnd").value;

    if (!name || !validDate(start) || !validDate(end)) {
        alert("Please enter valid timetable details.");
        return;
    }

    if (end < start) {
        alert("Ending date must not be before starting date.");
        return;
    }

    const days = weekdays.map((_, index) => {

        return [
            ...$("plannerDay" + index)
                .querySelectorAll(".planner-slot")
        ].map(row => ({
            id: row.dataset.id,
            name: row.querySelector(".slot-name").value.trim(),
            start: row.querySelector(".slot-start").value,
            end: row.querySelector(".slot-end").value
        }));
    });

    const activities = days.flat();

    if (!activities.length) {
        alert("Add at least one activity.");
        return;
    }

    if (activities.some(activity =>
        !activity.name
        || !validTime(activity.start)
        || !validTime(activity.end)
        || activity.start === activity.end
    )) {
        alert("Please check your activity names and timings.");
        return;
    }

    const existing = state.planner.plans.find(
        plan => plan.id === editingPlanId
    );

    const version = {
        name,
        start,
        end,
        days,
        paused: existing?.versions.at(-1)?.paused || false,
        deleted: false,

        effective: existing ? localDate() : start
    };

    if (existing) {

        savePlanVersion(existing, version);

    } else {

        state.planner.plans.push({
            id: newId(),
            versions: [version]
        });
    }

    const saved = persist();

    $("planEditor").close();

    renderAll();

    if (saved) notify("Weekly timetable saved!");
});

function planVersionForDate(plan, date) {

    return [...plan.versions]
        .filter(version => version.effective <= date)
        .reverse()
        .sort((a, b) =>
            b.effective.localeCompare(a.effective)
        )[0];
}

function getScheduledTasks(date) {

    const day = (
        new Date(date + "T12:00:00").getDay() + 6
    ) % 7;

    const tasks = [];

    state.planner.plans.forEach(plan => {

        const version = planVersionForDate(plan, date);

        if (!version || version.paused || version.deleted) {
            return;
        }

        if (date < version.start || date > version.end) {
            return;
        }

        (version.days[day] || []).forEach(activity => {

            tasks.push({
                key: `${plan.id}:${activity.id}`,
                planId: plan.id,
                name: activity.name,
                start: activity.start,
                end: activity.end,
                source: version.name,
                type: "scheduled"
            });
        });
    });

    return tasks.sort((a, b) =>
        a.start.localeCompare(b.start)
    );
}

function togglePlanPause(id) {

    const plan = state.planner.plans.find(p => p.id === id);

    if (!plan) return;

    const previous = plan.versions.at(-1);

    // Upcoming schedules are changed from their start date.
    const effective = localDate() < previous.start
        ? previous.start : localDate();

    savePlanVersion(plan, {
        ...structuredClone(previous),
        paused: !previous.paused,
        effective
    });

    persist();
    renderAll();

    notify(previous.paused ? "Timetable resumed." : "Timetable paused.");
}

function deletePlan(id) {

    if (!confirm(
        "End this timetable? Earlier schedule versions will remain saved."
    )) return;

    const plan = state.planner.plans.find(p => p.id === id);

    if (!plan) return;

    const previous = plan.versions.at(-1);

    savePlanVersion(plan, {
        ...structuredClone(previous),
        deleted: true,
        effective: localDate() < previous.start
            ? previous.start : localDate()
    });

    persist();
    renderAll();

    notify("Timetable ended.");
}

function duplicatePlan(id) {

    const plan = state.planner.plans.find(p => p.id === id);

    if (!plan) return;

    const version = structuredClone(plan.versions.at(-1));

    version.name += " (Copy)";
    version.paused = true;
    version.deleted = false;
    version.effective = version.start;

    version.days.forEach(day => {
        day.forEach(activity => activity.id = newId());
    });

    state.planner.plans.push({
        id: newId(),
        versions: [version]
    });

    persist();
    renderAll();

    notify("Timetable duplicated as a paused plan.");
}

function renderPlans() {

    const plans = state.planner.plans.filter(
        plan => !plan.versions.at(-1)?.deleted
    );

    $("planContainer").innerHTML = plans.map(plan => {

        const version = plan.versions.at(-1);

        const today = localDate();

        const status = version.paused
            ? "Paused"
            : today < version.start
                ? "Upcoming"
                : today > version.end
                    ? "Ended"
                    : "Active";

        const preview = version.days.map((day, index) => {

            if (!day.length) return "";

            return `
                <h4>${weekdays[index]}</h4>

                ${day.map(activity => `
                    <p>
                        ${safe(formatTime(activity.start))}
                        -
                        ${safe(formatTime(activity.end))}
                        · ${safe(activity.name)}
                    </p>
                `).join("")}
            `;
        }).join("");

        return `
            <article class="card entry">

                <span class="plan-label
                    ${status === "Active" ? "running" : ""}">
                    ${status}
                </span>

                <h3>${safe(version.name)}</h3>

                <p>
                    ${displayDate(version.start)}
                    –
                    ${displayDate(version.end)}
                </p>

                <small>
                    ${version.days.flat().length}
                    activities per week
                </small>

                <details class="plan-preview">
                    <summary>View Weekly Schedule</summary>
                    ${preview}
                </details>

                <div class="entry-actions">

                    <button data-action="edit-plan"
                            data-id="${safe(plan.id)}">
                        Edit
                    </button>

                    <button data-action="pause-plan"
                            data-id="${safe(plan.id)}">
                        ${version.paused ? "Resume" : "Pause"}
                    </button>

                    <button data-action="duplicate-plan"
                            data-id="${safe(plan.id)}">
                        Duplicate
                    </button>

                    <button class="danger"
                            data-action="delete-plan"
                            data-id="${safe(plan.id)}">
                        Delete
                    </button>

                </div>

            </article>
        `;
    }).join("") || `
        <p class="empty">
            No timetables yet. Create your first weekly routine.
        </p>
    `;
}


// =========================================
// ADDITIONAL TO-DO TASKS
// =========================================

function openTaskEditor(id = null) {

    editingTaskId = id;

    const task = state.planner.extras.find(t => t.id === id);

    $("taskEditorTitle").textContent =
        task ? "Edit Task" : "Add Extra Task";

    $("taskName").value = task?.name || "";

    $("taskDescription").value = task?.description || "";

    $("taskDate").value = task?.date
        || (currentPage === "today"
            ? $("todayDate").value : localDate());

    $("taskTime").value = task?.time || "";

    $("taskPriority").value = task?.priority || "Medium";

    $("taskReminder").value = String(task?.reminder ?? -1);

    $("taskEditor").showModal();
}

$("taskForm").addEventListener("submit", event => {

    event.preventDefault();

    const name = $("taskName").value.trim();

    const date = $("taskDate").value;

    const time = $("taskTime").value;

    const reminder = Number($("taskReminder").value);

    if (!name || !validDate(date)) {
        alert("Enter a task name and valid date.");
        return;
    }

    if (reminder >= 0 && !time) {
        alert("Choose a time for the reminder.");
        return;
    }

    const previous = state.planner.extras.find(
        task => task.id === editingTaskId
    );

    const task = {
        id: editingTaskId || newId(),
        name,
        description: $("taskDescription").value.trim(),
        date,
        time,
        priority: $("taskPriority").value,
        reminder
    };

    if (previous) {

        // If the date changes, completion starts fresh.

        if (previous.date !== date) {

            const records =
                state.planner.history[previous.date] || [];

            state.planner.history[previous.date] =
                records.filter(key => key !== `extra:${task.id}`);
        }

        state.planner.extras = state.planner.extras.map(item =>
            item.id === task.id ? task : item
        );

    } else {

        state.planner.extras.push(task);
    }

    const saved = persist();

    $("taskEditor").close();

    renderAll();

    if (saved) notify("Task saved!");
});

function getExtraTasks(date) {

    return state.planner.extras
        .filter(task => task.date === date)
        .map(task => ({
            ...task,
            key: `extra:${task.id}`,
            start: task.time,
            source: "Additional To-Do",
            type: "extra"
        }))
        .sort((a, b) =>
            (a.start || "99:99").localeCompare(b.start || "99:99")
        );
}

function deleteExtraTask(id) {

    if (!confirm("Delete this task?")) return;

    state.planner.extras = state.planner.extras.filter(
        task => task.id !== id
    );

    persist();
    renderAll();

    notify("Task deleted.");
}


// =========================================
// DAILY COMPLETION AND HISTORY
// =========================================

function getDailyTasks(date) {
    return [
        ...getScheduledTasks(date),
        ...getExtraTasks(date)
    ];
}

function dailyTaskDone(date, key) {

    return (state.planner.history[date] || [])
        .includes(key);
}

function toggleDailyTask(date, key) {

    if (date > localDate()) {
        renderAll();
        return;
    }

    const records = state.planner.history[date] || [];

    const completed = !records.includes(key);

    state.planner.history[date] = completed
        ? [...records, key]
        : records.filter(item => item !== key);

    persist();
    renderAll();

    if (completed) {
        notify("Great work! Activity completed.");
    }
}

function dailyProgress(date) {

    const tasks = getDailyTasks(date);

    const completed = tasks.filter(task =>
        dailyTaskDone(date, task.key)
    ).length;

    return {
        total: tasks.length,
        completed,
        pending: tasks.length - completed,
        percent: percentage(completed, tasks.length)
    };
}

function dailyTaskMarkup(task, date) {

    const done = dailyTaskDone(date, task.key);

    const timing = task.end
        ? `${formatTime(task.start)} – ${formatTime(task.end)}`
        : formatTime(task.start);

    const priority = ["Low", "Medium", "High"]
        .includes(task.priority)
        ? task.priority : "Medium";

    return `
        <div class="task-row ${done ? "finished" : ""}">

            <input type="checkbox"
                   aria-label="${safe(task.name)}"
                   data-daily-key="${safe(task.key)}"
                   data-date="${safe(date)}"
                   ${done ? "checked" : ""}
                   ${date > localDate() ? "disabled" : ""}>

            <div class="task-info">

                <strong class="${done ? "completed" : ""}">
                    ${safe(task.name)}
                </strong>

                <small>
                    ${safe(timing)} · ${safe(task.source)}
                </small>

                ${task.description ? `
                    <p>${safe(task.description)}</p>
                ` : ""}

                ${task.type === "extra" ? `
                    <span class="priority ${priority.toLowerCase()}">
                        ${priority}
                    </span>
                ` : ""}

            </div>

            ${task.type === "extra" ? `

                <button data-action="edit-extra"
                        data-id="${safe(task.id)}">
                    Edit
                </button>

                <button class="danger"
                        data-action="delete-extra"
                        data-id="${safe(task.id)}">
                    Delete
                </button>

            ` : ""}

        </div>
    `;
}

function renderToday() {

    const date = $("todayDate").value || localDate();

    const progress = dailyProgress(date);

    $("todayPercent").textContent = progress.percent + "%";

    $("todayProgress").style.width = progress.percent + "%";

    $("todayStatus").textContent =
        `${progress.completed} of ${progress.total} activities completed`;

    $("todaySchedule").innerHTML =
        getScheduledTasks(date).map(task =>
            dailyTaskMarkup(task, date)
        ).join("") || `
            <p class="empty">
                No scheduled activities for this date.
            </p>
        `;

    $("todayExtras").innerHTML =
        getExtraTasks(date).map(task =>
            dailyTaskMarkup(task, date)
        ).join("") || `
            <p class="empty">
                No additional tasks yet.
            </p>
        `;
}

$("todayDate").value = localDate();

$("todayDate").addEventListener("change", renderToday);


// =========================================
// LISTS, NOTES AND DIARY
// =========================================

function createEntry(type) {

    editingId = null;
    editingType = type;

    $("editorHeading").textContent =
        type === "list" ? "Create New List"
        : type === "note" ? "Create New Note"
        : "Dear Diary...";

    $("entryTitle").value = "";
    $("entryContent").value = "";
    $("entryColor").value = state.theme.colors[1];
    $("entryMood").value = "";
    $("entryMood").hidden = type !== "diary";
    $("entryHighlight").checked = false;

    $("entryFormat").value =
        type === "list" ? "checklist" : "paragraph";

    $("checklistEditor").innerHTML = "";

    addChecklistItem();

    updateFormat();

    $("editor").showModal();

    $("entryTitle").focus();
}

function closeEditor() {
    $("editor").close();
}

function updateFormat() {

    const checklist = $("entryFormat").value === "checklist";

    $("checklistEditor").hidden = !checklist;

    $("addItemButton").hidden = !checklist;

    $("entryContent").hidden = checklist;

    $("entryContent").placeholder =
        $("entryFormat").value === "paragraph"
            ? "Write your thoughts here..."
            : "Write each point on a new line...";
}

$("entryFormat").addEventListener("change", updateFormat);

function addChecklistItem(item = {}) {

    const row = document.createElement("div");

    row.className = "editor-task";

    row.dataset.id = item.id || newId();

    row.dataset.completedAt = item.completedAt || "";

    const check = document.createElement("input");

    check.type = "checkbox";
    check.checked = Boolean(item.done);

    check.setAttribute("aria-label", "Complete item");

    check.addEventListener("change", () => {
        row.dataset.completedAt = check.checked
            ? new Date().toISOString() : "";
    });

    const input = document.createElement("input");

    input.type = "text";
    input.placeholder = "Write a task...";
    input.value = item.text || "";

    input.addEventListener("keydown", event => {

        if (event.key === "Enter") {

            event.preventDefault();

            addChecklistItem();

            $("checklistEditor").lastElementChild
                .querySelector('input[type="text"]').focus();
        }
    });

    const remove = document.createElement("button");

    remove.textContent = "✕";

    remove.onclick = () => row.remove();

    row.append(check, input, remove);

    $("checklistEditor").append(row);
}

function clearEditor() {

    if (!confirm("Erase the content in this editor?")) return;

    $("entryContent").value = "";

    $("checklistEditor").innerHTML = "";

    addChecklistItem();
}

function saveEntry() {

    const title = $("entryTitle").value.trim();

    if (!title) {
        alert("Please enter a title.");
        return;
    }

    const format = $("entryFormat").value;

    const previous = state.entries.find(e => e.id === editingId);

    const items = format === "checklist"
        ? [...$("checklistEditor").querySelectorAll(".editor-task")]
            .map(row => {

                const done =
                    row.querySelector('[type="checkbox"]').checked;

                return {
                    id: row.dataset.id,
                    text: row.querySelector('[type="text"]').value.trim(),
                    done,
                    completedAt: done
                        ? row.dataset.completedAt
                            || new Date().toISOString()
                        : null
                };

            }).filter(item => item.text)
        : [];

    const entry = {
        id: editingId || newId(),
        type: editingType,
        title,
        format,
        content: format === "checklist"
            ? "" : $("entryContent").value,
        items,
        mood: editingType === "diary"
            ? $("entryMood").value : "",
        color: $("entryColor").value,
        highlighted: $("entryHighlight").checked,
        pinned: previous?.pinned || false,
        createdAt: previous?.createdAt
            || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        deleted: false
    };

    if (previous) {

        state.entries = state.entries.map(item =>
            item.id === editingId ? entry : item
        );

    } else {

        state.entries.unshift(entry);
    }

    const saved = persist();

    closeEditor();

    renderAll();

    if (saved) notify("Entry saved successfully.");
}

function editEntry(id) {

    const entry = state.entries.find(e => e.id === id);

    if (!entry || entry.deleted) return;

    createEntry(entry.type);

    editingId = id;

    $("editorHeading").textContent = "Edit Entry";

    $("entryTitle").value = entry.title;

    $("entryFormat").value = entry.format;

    $("entryContent").value = entry.content;

    $("entryColor").value = entry.color;

    $("entryMood").value = entry.mood;

    $("entryHighlight").checked = entry.highlighted;

    $("checklistEditor").innerHTML = "";

    entry.items.forEach(item => addChecklistItem(item));

    if (!entry.items.length) addChecklistItem();

    updateFormat();
}

function deleteEntry(id) {

    const entry = state.entries.find(e => e.id === id);

    if (!entry) return;

    entry.deleted = true;

    persist();
    renderAll();

    notify("Moved to Recycle Bin.");
}

function restoreEntry(id) {

    const entry = state.entries.find(e => e.id === id);

    if (!entry) return;

    entry.deleted = false;

    persist();
    renderAll();

    notify("Entry restored.");
}

function permanentDelete(id) {

    if (!confirm("Permanently delete this entry?")) return;

    state.entries = state.entries.filter(e => e.id !== id);

    persist();
    renderAll();
}

function duplicateEntry(id) {

    const entry = state.entries.find(e => e.id === id);

    if (!entry) return;

    const copy = structuredClone(entry);

    copy.id = newId();

    copy.title += " (Copy)";

    copy.createdAt = new Date().toISOString();

    copy.updatedAt = copy.createdAt;

    copy.items = copy.items.map(item => ({
        ...item,
        id: newId(),
        done: false,
        completedAt: null
    }));

    state.entries.unshift(copy);

    persist();
    renderAll();

    notify("Entry duplicated.");
}

function pinEntry(id) {

    const entry = state.entries.find(e => e.id === id);

    if (!entry) return;

    entry.pinned = !entry.pinned;

    persist();
    renderAll();
}

function toggleEntryTask(entryId, itemId) {

    const entry = state.entries.find(e => e.id === entryId);

    const item = entry?.items.find(t => t.id === itemId);

    if (!item) return;

    item.done = !item.done;

    item.completedAt = item.done
        ? new Date().toISOString() : null;

    entry.updatedAt = new Date().toISOString();

    persist();
    renderAll();

    if (item.done) notify("Task completed!");
}

function activeEntries() {

    return state.entries
        .filter(entry => !entry.deleted)
        .sort((a, b) =>
            Number(b.pinned) - Number(a.pinned)
            || b.updatedAt.localeCompare(a.updatedAt)
        );
}

function contrastColor(hex) {

    const colors = hex.slice(1).match(/.{2}/g)
        .map(number => parseInt(number, 16) / 255)
        .map(value => value <= 0.04045
            ? value / 12.92
            : ((value + 0.055) / 1.055) ** 2.4);

    const luminance =
        colors[0] * 0.2126
        + colors[1] * 0.7152
        + colors[2] * 0.0722;

    return luminance > 0.179 ? "#222222" : "#ffffff";
}

function entryMarkup(entry) {

    let content = "";

    if (entry.format === "checklist") {

        content = entry.items.map(item => `
            <div class="task-row ${item.done ? "finished" : ""}"
                 style="background:transparent">

                <input type="checkbox"
                       aria-label="${safe(item.text)}"
                       data-entry-id="${safe(entry.id)}"
                       data-item-id="${safe(item.id)}"
                       ${item.done ? "checked" : ""}>

                <span class="${item.done ? "completed" : ""}">
                    ${safe(item.text)}
                </span>

            </div>
        `).join("");

    } else if (entry.format === "bullet"
        || entry.format === "numbered") {

        const tag = entry.format === "bullet" ? "ul" : "ol";

        const lines = entry.content.split("\n")
            .filter(line => line.trim());

        content = `<${tag}>${lines.map(line =>
            `<li>${safe(line)}</li>`
        ).join("")}</${tag}>`;

    } else {

        content = `<p>${safe(entry.content)}</p>`;
    }

    const color = entry.highlighted
        ? state.theme.colors[3] : entry.color;

    return `
        <article class="card entry
                ${entry.type === "diary" ? "diary-entry" : ""}
                ${entry.highlighted ? "highlighted" : ""}"
                style="background:${color};color:${contrastColor(color)}">

            <small>
                ${displayDate(entry.createdAt)}
                ${entry.pinned ? " · Pinned" : ""}
            </small>

            <h3>${safe(entry.title)}</h3>

            ${entry.mood ? `<p>${safe(entry.mood)}</p>` : ""}

            ${content}

            <div class="entry-actions">

                <button data-action="edit-entry"
                        data-id="${safe(entry.id)}">
                    Edit
                </button>

                <button data-action="pin-entry"
                        data-id="${safe(entry.id)}">
                    ${entry.pinned ? "Unpin" : "Pin"}
                </button>

                <button data-action="duplicate-entry"
                        data-id="${safe(entry.id)}">
                    Duplicate
                </button>

                <button class="danger"
                        data-action="delete-entry"
                        data-id="${safe(entry.id)}">
                    Delete
                </button>

            </div>

        </article>
    `;
}

function renderEntries() {

    const mapping = [
        ["list", "listContainer", "listSearch"],
        ["note", "noteContainer", "noteSearch"],
        ["diary", "diaryContainer", "diarySearch"]
    ];

    mapping.forEach(([type, container, search]) => {

        const query = $(search).value.toLowerCase();

        const entries = activeEntries().filter(entry => {

            const content = [
                entry.title,
                entry.content,
                ...entry.items.map(item => item.text)
            ].join(" ").toLowerCase();

            return entry.type === type && content.includes(query);
        });

        $(container).innerHTML = entries.map(entryMarkup).join("")
            || `<p class="empty">No matching entries.</p>`;
    });

    const trash = state.entries.filter(entry => entry.deleted);

    $("trashContainer").innerHTML = trash.map(entry => `
        <article class="card entry">

            <h3>${safe(entry.title)}</h3>

            <p>${safe(entry.type)}</p>

            <div class="entry-actions">

                <button data-action="restore-entry"
                        data-id="${safe(entry.id)}">
                    Restore
                </button>

                <button class="danger"
                        data-action="permanent-delete"
                        data-id="${safe(entry.id)}">
                    Delete Forever
                </button>

            </div>

        </article>
    `).join("") || `
        <p class="empty">Your recycle bin is empty.</p>
    `;
}

["listSearch", "noteSearch", "diarySearch"].forEach(id => {
    $(id).addEventListener("input", renderEntries);
});

function recentMarkup(type) {

    const entries = activeEntries()
        .filter(entry => entry.type === type)
        .slice(0, 3);

    return entries.map(entry => `
        <button class="recent-item"
                data-action="edit-entry"
                data-id="${safe(entry.id)}">

            <strong>${safe(entry.title)}</strong>

            <small>${displayDate(entry.updatedAt)}</small>

        </button>
    `).join("") || `<p class="empty">No saved content yet.</p>`;
}


// =========================================
// DASHBOARD
// =========================================

function renderHome() {

    const date = localDate();

    const progress = dailyProgress(date);

    $("totalTasks").textContent = progress.total;

    $("completedTasks").textContent = progress.completed;

    $("pendingTasks").textContent = progress.pending;

    $("totalLists").textContent = activeEntries()
        .filter(entry => entry.type === "list").length;

    $("progressText").textContent = progress.percent + "%";

    $("progressRing").style.setProperty(
        "--progress",
        progress.percent + "%"
    );

    $("progressDescription").textContent =
        `${progress.completed} of ${progress.total} activities completed`;

    $("homeSchedule").innerHTML =
        getScheduledTasks(date).map(task =>
            dailyTaskMarkup(task, date)
        ).join("") || `
            <p class="empty">No activities scheduled today.</p>
        `;

    $("homeExtras").innerHTML =
        getExtraTasks(date).map(task =>
            dailyTaskMarkup(task, date)
        ).join("") || `
            <p class="empty">Add your extra work for today.</p>
        `;

    $("recentLists").innerHTML = recentMarkup("list");

    $("recentNotes").innerHTML = recentMarkup("note");

    $("recentDiary").innerHTML = recentMarkup("diary");

    $("homeReminders").innerHTML =
        getUpcomingReminders().slice(0, 3)
            .map(reminderMarkup).join("")
        || `<p class="empty">No upcoming reminders.</p>`;

    renderChart("homeChart", 7);
}


// =========================================
// CALENDAR
// =========================================

function changeMonth(amount) {

    calendarMonth = new Date(
        calendarMonth.getFullYear(),
        calendarMonth.getMonth() + amount,
        1
    );

    renderCalendar();
}

function openCalendarDate(date) {

    $("todayDate").value = date;

    showPage("today");
}

function renderCalendar() {

    const year = calendarMonth.getFullYear();

    const month = calendarMonth.getMonth();

    $("calendarTitle").textContent =
        calendarMonth.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });

    const start = (
        new Date(year, month, 1).getDay() + 6
    ) % 7;

    const count = new Date(year, month + 1, 0).getDate();

    let html = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        .map(day =>
            `<div class="calendar-heading">${day}</div>`
        ).join("");

    html += "<div></div>".repeat(start);

    for (let day = 1; day <= count; day++) {

        const date = localDate(new Date(year, month, day));

        const progress = dailyProgress(date);

        html += `
            <button class="calendar-day
                    ${date === localDate() ? "current-day" : ""}
                    ${progress.total ? "has-tasks" : ""}
                    ${progress.total && progress.percent === 100
                        ? "all-done" : ""}"
                    data-action="calendar-date"
                    data-date="${date}">

                <strong>${day}</strong>

                ${progress.total ? `
                    <small>${progress.total} tasks</small>

                    <small>
                        ${date <= localDate()
                            ? progress.percent + "%" : "Planned"}
                    </small>
                ` : ""}

            </button>
        `;
    }

    $("calendarGrid").innerHTML = html;
}


// =========================================
// ANALYTICS
// =========================================

function renderChart(container, count) {

    const today = localDate();

    const data = Array.from({ length: count }, (_, index) => {

        const date = addDays(today, -(count - 1 - index));

        return {
            date,
            ...dailyProgress(date)
        };
    });

    $(container).innerHTML = data.map((day, index) => {

        const label = count === 7
            ? new Date(day.date + "T12:00:00")
                .toLocaleDateString(undefined, {
                    weekday: "short"
                })
            : String(Number(day.date.slice(-2)));

        return `
            <div class="bar-column"
                 title="${displayDate(day.date)}:
                    ${day.completed}/${day.total} completed">

                ${count === 7 ? `
                    <small>${day.percent}%</small>
                ` : ""}

                <div class="bar"
                     style="height:${day.percent * 1.6}px">
                </div>

                <small>
                    ${count === 7 || index % 5 === 0
                        ? label : "&nbsp;"}
                </small>

            </div>
        `;
    }).join("");
}

function progressMarkup(name, done, total) {

    const percent = percentage(done, total);

    return `
        <div class="progress-item">

            <div class="progress-label">

                <span>${safe(name)}</span>

                <strong>${percent}%</strong>

            </div>

            <div class="progress-track">

                <div class="progress-fill"
                     style="width:${percent}%">
                </div>

            </div>

            <small class="muted">${done} of ${total} completed</small>

        </div>
    `;
}

function renderAnalytics() {

    const lastSeven = Array.from({ length: 7 }, (_, index) =>
        dailyProgress(addDays(localDate(), -index))
    );

    const total = lastSeven.reduce((sum, day) =>
        sum + day.total, 0
    );

    const completed = lastSeven.reduce((sum, day) =>
        sum + day.completed, 0
    );

    const stats = [
        ["Weekly Activities", total],
        ["Weekly Completed", completed],
        ["Weekly Pending", total - completed],
        ["Completion Rate", percentage(completed, total) + "%"]
    ];

    $("analyticsStats").innerHTML = stats.map(([label, value], i) => `
        <article class="card stat ${i === 1 ? "green-card" : ""}">
            <p>${label}</p>
            <h2>${value}</h2>
        </article>
    `).join("");

    renderChart("weeklyChart", 7);

    renderChart("monthlyChart", 30);

    const lists = activeEntries()
        .filter(entry => entry.format === "checklist");

    $("listProgress").innerHTML = lists.map(entry =>
        progressMarkup(
            entry.title,
            entry.items.filter(item => item.done).length,
            entry.items.length
        )
    ).join("") || `<p class="empty">Create checklists to track progress.</p>`;

    const plans = state.planner.plans;

    $("planProgress").innerHTML = plans.map(plan => {

        let done = 0;
        let total = 0;

        for (let index = 0; index < 30; index++) {

            const date = addDays(localDate(), -index);

            const tasks = getScheduledTasks(date)
                .filter(task => task.planId === plan.id);

            total += tasks.length;

            done += tasks.filter(task =>
                dailyTaskDone(date, task.key)
            ).length;
        }

        return progressMarkup(
            plan.versions.at(-1).name + " — Last 30 Days",
            done,
            total
        );
    }).join("") || `<p class="empty">Create a timetable to see its progress.</p>`;
}


// =========================================
// REMINDERS
// =========================================

function getUpcomingReminders() {

    return state.planner.extras
        .filter(task =>
            task.date >= localDate()
            && !dailyTaskDone(task.date, `extra:${task.id}`)
        )
        .sort((a, b) =>
            `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
        );
}

function reminderMarkup(task) {

    return `
        <button class="recent-item"
                data-action="edit-extra"
                data-id="${safe(task.id)}">

            <strong>${safe(task.name)}</strong>

            <small>
                ${displayDate(task.date)}
                · ${safe(formatTime(task.time))}
            </small>

        </button>
    `;
}

function renderReminders() {

    $("reminderContainer").innerHTML =
        getUpcomingReminders().map(task => `
            <article class="card entry">

                <span class="priority ${task.priority.toLowerCase()}">
                    ${task.priority}
                </span>

                <h3>${safe(task.name)}</h3>

                <p>${safe(task.description)}</p>

                <small>
                    ${displayDate(task.date)}
                    · ${safe(formatTime(task.time))}
                </small>

                <small>
                    ${task.reminder >= 0
                        ? `Reminder: ${task.reminder} minutes before`
                        : "No timed alert"}
                </small>

                <div class="entry-actions">

                    <button data-action="edit-extra"
                            data-id="${safe(task.id)}">
                        Edit
                    </button>

                    <button class="danger"
                            data-action="delete-extra"
                            data-id="${safe(task.id)}">
                        Delete
                    </button>

                </div>

            </article>
        `).join("") || `
            <p class="empty">No upcoming reminders.</p>
        `;
}

function checkReminders() {

    const now = Date.now();

    getUpcomingReminders().forEach(task => {

        if (task.reminder < 0 || !task.time) return;

        const time = new Date(
            `${task.date}T${task.time}:00`
        ).getTime();

        const alertTime = time - task.reminder * 60000;

        const key = `${task.id}:${alertTime}`;

        if (now >= alertTime
            && now <= time + 60000
            && !notified.has(key)) {

            notified.add(key);

            notify(`Reminder: ${task.name} at ${formatTime(task.time)}`);
        }
    });
}


// =========================================
// THEME CUSTOMIZATION
// =========================================

function applyTheme() {

    const theme = state.theme;

    const variables = [
        "--bg",
        "--card",
        "--primary",
        "--accent",
        "--text"
    ];

    const inputs = [
        "backgroundColor",
        "cardColor",
        "primaryColor",
        "accentColor",
        "textColor"
    ];

    variables.forEach((variable, index) => {

        document.documentElement.style.setProperty(
            variable,
            theme.colors[index]
        );

        $(inputs[index]).value = theme.colors[index];
    });

    document.documentElement.style.setProperty(
        "--radius",
        theme.radius + "px"
    );

    document.documentElement.style.setProperty(
        "--font-size",
        theme.fontSize + "px"
    );

    document.documentElement.style.setProperty(
        "--font",
        `${theme.font}, sans-serif`
    );

    $("radiusInput").value = theme.radius;

    $("fontSizeInput").value = theme.fontSize;

    $("fontSelect").value = theme.font;

    $("patternSelect").value = theme.pattern;

    $("animationInput").checked = theme.animations;

    document.body.dataset.pattern = theme.pattern;

    document.body.classList.toggle(
        "no-animation",
        !theme.animations
    );
}

function selectTheme(name) {

    if (!Object.hasOwn(themes, name)) return;

    state.theme.colors = [...themes[name]];

    applyTheme();
    persist();
    renderAll();

    notify(`${name} theme applied.`);
}

function resetTheme() {

    state.theme = structuredClone(defaultTheme);

    applyTheme();
    persist();
    renderAll();

    notify("Default theme restored.");
}

function renderThemes() {

    $("themeContainer").innerHTML = Object.entries(themes)
        .map(([name, colors]) => `

            <button class="theme-option"
                    data-action="select-theme"
                    data-id="${safe(name)}">

                <div class="theme-preview"
                     style="background:${colors[0]}">

                    ${colors.slice(1).map(color => `
                        <div style="background:${color}"></div>
                    `).join("")}

                </div>

                <strong>${safe(name)}</strong>

            </button>
        `).join("");
}

[
    "backgroundColor",
    "cardColor",
    "primaryColor",
    "accentColor",
    "textColor"
].forEach((id, index) => {

    $(id).addEventListener("input", event => {

        state.theme.colors[index] = event.target.value;

        applyTheme();

        persist();

        renderEntries();
    });
});

$("radiusInput").addEventListener("input", event => {

    state.theme.radius = Number(event.target.value);

    applyTheme();
    persist();
});

$("fontSizeInput").addEventListener("input", event => {

    state.theme.fontSize = Number(event.target.value);

    applyTheme();
    persist();
});

$("fontSelect").addEventListener("change", event => {

    state.theme.font = event.target.value;

    applyTheme();
    persist();
});

$("patternSelect").addEventListener("change", event => {

    state.theme.pattern = event.target.value;

    applyTheme();
    persist();
});

$("animationInput").addEventListener("change", event => {

    state.theme.animations = event.target.checked;

    applyTheme();
    persist();
});


// =========================================
// BACKUP AND RESTORE
// =========================================

function exportData() {

    const blob = new Blob(
        [JSON.stringify(state, null, 2)],
        { type: "application/json" }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = `taskverse-backup-${localDate()}.json`;

    link.click();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

    notify("Complete backup exported.");
}

$("importFile").addEventListener("change", async event => {

    const file = event.target.files[0];

    if (!file) return;

    try {

        const data = normalizeData(
            JSON.parse(await file.text())
        );

        if (!confirm(
            "Replace your current TaskVerse data with this backup?"
        )) return;

        state = data;

        applyTheme();

        updateProfile();

        persist();

        renderAll();

        notify("Backup restored.");

    } catch {

        notify("Invalid or unsupported backup file.");

    } finally {

        event.target.value = "";
    }
});


// =========================================
// BUTTON EVENT HANDLING
// =========================================

document.addEventListener("click", event => {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;

    const id = button.dataset.id;

    switch (action) {

        case "add-slot":
            addPlanSlot(Number(button.dataset.day));
            break;

        case "remove-slot":
            button.closest(".planner-slot").remove();
            break;

        case "edit-plan":
            openPlanEditor(id);
            break;

        case "pause-plan":
            togglePlanPause(id);
            break;

        case "delete-plan":
            deletePlan(id);
            break;

        case "duplicate-plan":
            duplicatePlan(id);
            break;

        case "edit-extra":
            openTaskEditor(id);
            break;

        case "delete-extra":
            deleteExtraTask(id);
            break;

        case "edit-entry":
            editEntry(id);
            break;

        case "delete-entry":
            deleteEntry(id);
            break;

        case "restore-entry":
            restoreEntry(id);
            break;

        case "permanent-delete":
            permanentDelete(id);
            break;

        case "duplicate-entry":
            duplicateEntry(id);
            break;

        case "pin-entry":
            pinEntry(id);
            break;

        case "select-theme":
            selectTheme(id);
            break;

        case "calendar-date":
            openCalendarDate(button.dataset.date);
            break;
    }
});

document.addEventListener("change", event => {

    const input = event.target;

    if (input.matches("[data-daily-key]")) {

        toggleDailyTask(
            input.dataset.date,
            input.dataset.dailyKey
        );
    }

    if (input.matches("[data-entry-id][data-item-id]")) {

        toggleEntryTask(
            input.dataset.entryId,
            input.dataset.itemId
        );
    }
});


// =========================================
// RENDER THE COMPLETE APPLICATION
// =========================================

function renderAll() {

    renderHome();

    renderToday();

    renderPlans();

    renderEntries();

    renderCalendar();

    renderAnalytics();

    renderReminders();

    icons();
}


// =========================================
// AUTOMATIC DAILY RESET
// =========================================

setInterval(() => {

    const today = localDate();

    if (today !== lastDay) {

        if ($("todayDate").value === lastDay) {
            $("todayDate").value = today;
        }

        lastDay = today;

        updateProfile();

        renderAll();
    }

    checkReminders();

}, 15000);


// =========================================
// INITIALIZE TASKVERSE
// =========================================

applyTheme();

updateProfile();

renderThemes();

renderAll();

// =========================================
// PERMANENT LIGHT / DARK MODE SWITCH
// =========================================

const darkToggle = document.getElementById("darkModeToggle");

const lightPaletteKey = "taskverse-light-palette";

// Check whether Midnight theme is active

function isDarkMode() {

    return state.theme.colors[0].toLowerCase()
        === themes["Midnight"][0].toLowerCase();

}

// Update the switch without removing it

function updateDarkModeSwitch() {

    if (!darkToggle) return;

    darkToggle.checked = isDarkMode();

}

// Save the current light theme

function rememberLightTheme() {

    try {

        localStorage.setItem(
            lightPaletteKey,
            JSON.stringify(state.theme.colors)
        );

    } catch (error) {

        console.warn("Unable to save light theme.");

    }

}

// Restore previous light theme

function getPreviousLightTheme() {

    try {

        const saved = JSON.parse(
            localStorage.getItem(lightPaletteKey)
        );

        if (
            Array.isArray(saved) &&
            saved.length === 5 &&
            saved.every(color =>
                /^#[0-9a-f]{6}$/i.test(color)
            )
        ) {

            return saved;

        }

    } catch (error) {

        console.warn("Using default light theme.");

    }

    return [...themes["Lavender & Sage"]];

}

// Handle ON and OFF switching

function switchDarkMode(enabled) {

    if (enabled) {

        if (!isDarkMode()) {

            rememberLightTheme();

        }

        state.theme.colors = [...themes["Midnight"]];

    } else {

        state.theme.colors = getPreviousLightTheme();

    }

    applyTheme();

    persist();

    renderAll();

    updateDarkModeSwitch();

    notify(
        enabled
            ? "Dark Mode enabled."
            : "Light Mode enabled."
    );

}

// Listen for switch changes

if (darkToggle) {

    darkToggle.addEventListener("change", function () {

        switchDarkMode(this.checked);

    });

}

// Synchronize with Theme Studio

const originalApplyTheme = applyTheme;

applyTheme = function () {

    originalApplyTheme();

    if (!isDarkMode()) {

        rememberLightTheme();

    }

    updateDarkModeSwitch();

};

// Initialize the switch

if (!isDarkMode()) {

    rememberLightTheme();

}

updateDarkModeSwitch();
