
const API_BASE = "http://127.0.0.1:8000/api/";

// =====================================
// DOM Elements
// =====================================

const projectsGrid = document.getElementById("projectsGrid");
const projectModal = document.getElementById("projectModal");
const detailsModal = document.getElementById("detailsModal");
const projectForm = document.getElementById("projectForm");

const searchInput = document.getElementById("projectSearch");
const statusFilter = document.getElementById("statusFilter");
const emptyProjects = document.getElementById("emptyProjects");

const openProjectFormButton = document.getElementById("openProjectForm");
const closeProjectFormButton = document.getElementById("closeProjectForm");
const cancelProjectFormButton = document.getElementById("cancelProjectForm");

const titleInput = document.getElementById("projectTitle");
const fieldInput = document.getElementById("projectField");
const abstractInput = document.getElementById("projectAbstract");
const objectivesInput = document.getElementById("projectObjectives");
const keywordsInput = document.getElementById("projectKeywords");
const statusInput = document.getElementById("projectStatus");

let projects = [];
let editingProjectId = null;

let accessToken = localStorage.getItem("rm_access_token");
let refreshToken = localStorage.getItem("rm_refresh_token");


// =====================================
// Authentication
// =====================================

if (!accessToken || !refreshToken) {
    window.location.replace("index.html");
}


// =====================================
// API Helper
// =====================================

async function refreshAccessToken() {

    if (!refreshToken) {
        throw new Error("Session expired. Please log in again.");
    }

    const response = await fetch(`${API_BASE}token/refresh/`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            refresh: refreshToken
        })
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data.access) {
        throw new Error("Session expired. Please log in again.");
    }

    accessToken = data.access;

    localStorage.setItem("rm_access_token", accessToken);

    return accessToken;
}


async function apiRequest(endpoint, options = {}, retry = true) {

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
            ...(options.headers || {})
        }
    });

    if (response.status === 401 && retry) {
        await refreshAccessToken();
        return apiRequest(endpoint, options, false);
    }

    if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
    }

    if (response.status === 204) {
        return null;
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {

        let message = "Something went wrong.";

        if (data) {
            message = Object.entries(data)
                .map(([key, value]) => {
                    return `${key}: ${Array.isArray(value) ? value.join(", ") : value}`;
                })
                .join("\n");
        }

        throw new Error(message);
    }

    return data;
}


function handleSessionError(error) {

    if (error.message.includes("Session expired")) {

        localStorage.removeItem("rm_access_token");
        localStorage.removeItem("rm_refresh_token");

        alert("Your session has expired. Please log in again.");

        window.location.replace("index.html");

        return true;
    }

    return false;
}


// =====================================
// Utility Functions
// =====================================

function getList(data) {

    if (Array.isArray(data)) return data;

    if (data && Array.isArray(data.results)) {
        return data.results;
    }

    return [];
}


function getProjectInitials(title) {

    const words = String(title || "").trim().split(/\s+/);

    if (!words.length || !words[0]) return "RP";

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return (words[0][0] + words[1][0]).toUpperCase();
}


function getStatus(progress) {

    const value = Number(progress) || 0;

    if (value >= 100) return "Completed";
    if (value <= 0) return "Planning";

    return "In Progress";
}


function getStatusClass(status) {

    if (status === "Completed") return "status-completed";
    if (status === "Planning") return "status-planning";

    return "status-progress";
}


function getProjectColor(status) {

    if (status === "Completed") return "green";
    if (status === "Planning") return "orange";

    return "blue";
}


function getProgressFromStatus(status) {

    if (status === "Completed") return 100;
    if (status === "Planning") return 0;

    return 10;
}


// =====================================
// Progress Slider
// =====================================

// HTML পরিবর্তন না করেই Progress Slider তৈরি করা হচ্ছে।

const statusContainer = statusInput.closest(".mb-4");

const progressContainer = document.createElement("div");
progressContainer.className = "mb-4";

progressContainer.innerHTML = `
    <label for="projectProgress" class="form-label">
        Research Progress
    </label>

    <div class="d-flex align-items-center gap-3">
        <input
            type="range"
            id="projectProgress"
            class="form-range flex-grow-1"
            min="0"
            max="100"
            step="5"
            value="0"
        >

        <strong id="progressValue">0%</strong>
    </div>

    <small class="form-help">
        Update your research progress from 0% to 100%.
    </small>
`;

projectForm.insertBefore(progressContainer, statusContainer);

const progressInput = document.getElementById("projectProgress");
const progressValue = document.getElementById("progressValue");


function updateProgressLabel() {
    progressValue.textContent = `${progressInput.value}%`;
}


progressInput.addEventListener("input", function () {

    updateProgressLabel();

    statusInput.value = getStatus(Number(progressInput.value));

});


statusInput.addEventListener("change", function () {

    progressInput.value = getProgressFromStatus(statusInput.value);

    updateProgressLabel();

});


// =====================================
// Modal Functions
// =====================================

function openModal(modal) {
    modal.hidden = false;
}


function closeModal(modal) {
    modal.hidden = true;
}


function resetProjectForm() {

    projectForm.reset();

    editingProjectId = null;

    progressInput.value = 0;

    updateProgressLabel();

    document.getElementById("modalTitle").textContent =
        "Create New Project";

    projectForm.querySelector('button[type="submit"]').textContent =
        "Create Project";
}


openProjectFormButton.addEventListener("click", function () {

    resetProjectForm();

    openModal(projectModal);

    titleInput.focus();

});


closeProjectFormButton.addEventListener("click", function () {
    closeModal(projectModal);
});


cancelProjectFormButton.addEventListener("click", function () {
    closeModal(projectModal);
});


document.getElementById("closeDetails").addEventListener("click", function () {
    closeModal(detailsModal);
});


document.getElementById("closeDetailsButton").addEventListener("click", function () {
    closeModal(detailsModal);
});


[projectModal, detailsModal].forEach(function (modal) {

    modal.addEventListener("click", function (event) {

        if (event.target === modal) {
            closeModal(modal);
        }

    });

});


document.addEventListener("keydown", function (event) {

    if (event.key === "Escape") {
        closeModal(projectModal);
        closeModal(detailsModal);
    }

});


// =====================================
// Project Statistics
// =====================================

function updateStatistics() {

    const total = projects.length;

    const completed = projects.filter(project => {
        return getStatus(project.progress_percent) === "Completed";
    }).length;

    const active = projects.filter(project => {
        return getStatus(project.progress_percent) === "In Progress";
    }).length;


    document.getElementById("totalProjects").textContent = total;

    document.getElementById("activeProjects").textContent = active;

    document.getElementById("completedProjects").textContent = completed;

}


// =====================================
// Project Rendering
// =====================================

function renderProjects() {

    projectsGrid.innerHTML = "";

    if (!projects.length) {

        projectsGrid.innerHTML = `
            <div class="activity-note">
                You haven't created any research projects yet.
                Create your first project to get started.
            </div>
        `;

        updateStatistics();

        filterProjects();

        return;
    }


    projects.forEach(function (project) {

        const title = project.title || "Untitled Project";
        const field = project.field || "Research Project";
        const abstract = project.abstract || "";
        const objectives = project.objectives || "";
        const keywords = project.keywords || "";

        const progress = Math.min(
            100,
            Math.max(0, Number(project.progress_percent) || 0)
        );

        const status = getStatus(progress);
        const color = getProjectColor(status);
        const statusClass = getStatusClass(status);
        const initials = getProjectInitials(title);


        const card = document.createElement("article");

        card.className = "project-card";

        card.dataset.projectId = project.id;
        card.dataset.title = title;
        card.dataset.field = field;
        card.dataset.status = status;
        card.dataset.progress = progress;
        card.dataset.abstract = abstract;
        card.dataset.objectives = objectives;
        card.dataset.keywords = keywords;


        const top = document.createElement("div");
        top.className = "project-card-top";


        const mark = document.createElement("div");
        mark.className = `project-mark ${color}`;
        mark.textContent = initials;


        const badge = document.createElement("span");
        badge.className = `status-badge ${statusClass}`;
        badge.textContent = status;


        top.append(mark, badge);


        const fieldText = document.createElement("p");
        fieldText.className = "project-field";
        fieldText.textContent = field;


        const heading = document.createElement("h2");
        heading.textContent = title;


        const description = document.createElement("p");
        description.className = "project-description";
        description.textContent = abstract || "No abstract provided yet.";


        const meta = document.createElement("div");
        meta.className = "project-meta";


        const metaLabel = document.createElement("span");
        metaLabel.textContent = "Research progress";


        const metaValue = document.createElement("strong");
        metaValue.textContent = `${progress}%`;


        meta.append(metaLabel, metaValue);


        const track = document.createElement("div");
        track.className = "progress-track";


        const fill = document.createElement("div");
        fill.className = "progress-fill";

        if (status === "Completed") {
            fill.classList.add("green-fill");
        }

        fill.style.width = `${progress}%`;

        track.appendChild(fill);


        const footer = document.createElement("div");
        footer.className = "project-card-footer";


        const footerLabel = document.createElement("span");
        footerLabel.textContent = "Research project";


        const actions = document.createElement("div");
        actions.className = "d-flex flex-wrap gap-2";


        const detailsButton = document.createElement("button");
        detailsButton.type = "button";
        detailsButton.className = "project-view-btn";
        detailsButton.dataset.action = "view";
        detailsButton.textContent = "View details →";


        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "project-view-btn";
        editButton.dataset.action = "edit";
        editButton.textContent = "Edit";


        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "project-view-btn";
        deleteButton.dataset.action = "delete";
        deleteButton.textContent = "Delete";


        actions.append(detailsButton, editButton, deleteButton);

        footer.append(footerLabel, actions);


        card.append(
            top,
            fieldText,
            heading,
            description,
            meta,
            track,
            footer
        );


        projectsGrid.appendChild(card);

    });


    updateStatistics();

    filterProjects();

}


// =====================================
// Search and Filter
// =====================================

function getProjectCards() {

    return Array.from(
        projectsGrid.querySelectorAll(".project-card")
    );

}


function filterProjects() {

    const query = searchInput.value.trim().toLowerCase();

    const selectedStatus = statusFilter.value;

    let visibleCount = 0;


    getProjectCards().forEach(function (card) {

        const title = card.dataset.title.toLowerCase();
        const field = card.dataset.field.toLowerCase();
        const status = card.dataset.status;


        const matchesSearch =
            title.includes(query) || field.includes(query);

        const matchesStatus =
            selectedStatus === "all" || status === selectedStatus;


        const visible = matchesSearch && matchesStatus;

        card.hidden = !visible;

        if (visible) visibleCount++;

    });


    emptyProjects.hidden = visibleCount !== 0;

}


searchInput.addEventListener("input", filterProjects);

statusFilter.addEventListener("change", filterProjects);


// =====================================
// Project Details
// =====================================

function openProjectDetails(card) {

    document.getElementById("detailsTitle").textContent =
        card.dataset.title;

    document.getElementById("detailsField").textContent =
        card.dataset.field;

    document.getElementById("detailsAbstract").textContent =
        card.dataset.abstract || "No abstract provided.";

    document.getElementById("detailsStatus").textContent =
        card.dataset.status;

    document.getElementById("detailsProgress").textContent =
        `${card.dataset.progress}%`;

    document.getElementById("detailsProgressBar").style.width =
        `${card.dataset.progress}%`;

    document.getElementById("detailsObjectives").textContent =
        card.dataset.objectives || "Not provided yet.";

    document.getElementById("detailsKeywords").textContent =
        card.dataset.keywords || "Not provided yet.";


    openModal(detailsModal);

}


// =====================================
// Edit Project
// =====================================

function editProject(project) {

    editingProjectId = project.id;

    titleInput.value = project.title || "";
    fieldInput.value = project.field || "";
    abstractInput.value = project.abstract || "";
    objectivesInput.value = project.objectives || "";
    keywordsInput.value = project.keywords || "";

    const progress = Number(project.progress_percent) || 0;

    progressInput.value = progress;

    updateProgressLabel();

    statusInput.value = getStatus(progress);


    document.getElementById("modalTitle").textContent =
        "Edit Project";


    projectForm.querySelector('button[type="submit"]').textContent =
        "Save Changes";


    openModal(projectModal);

    titleInput.focus();

}


// =====================================
// Delete Project
// =====================================

async function deleteProject(project) {

    const confirmed = confirm(
        `Are you sure you want to delete "${project.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;


    try {

        await apiRequest(`projects/${project.id}/`, {
            method: "DELETE"
        });


        await loadProjects();

        alert("Project deleted successfully!");


    } catch (error) {

        console.error("Project deletion error:", error);

        if (handleSessionError(error)) return;

        alert(`Unable to delete project:\n${error.message}`);

    }

}


// =====================================
// Project Card Actions
// =====================================

projectsGrid.addEventListener("click", function (event) {

    const button = event.target.closest("[data-action]");

    if (!button) return;

    const card = button.closest(".project-card");

    if (!card) return;

    const projectId = Number(card.dataset.projectId);

    const project = projects.find(item => item.id === projectId);

    if (!project) return;


    const action = button.dataset.action;


    if (action === "view") {
        openProjectDetails(card);
    }

    if (action === "edit") {
        editProject(project);
    }

    if (action === "delete") {
        deleteProject(project);
    }

});


// =====================================
// Create / Update Project
// =====================================

projectForm.addEventListener("submit", async function (event) {

    event.preventDefault();


    const title = titleInput.value.trim();
    const field = fieldInput.value.trim();

    const abstract = abstractInput.value.trim();
    const objectives = objectivesInput.value.trim();
    const keywords = keywordsInput.value.trim();

    const progress = Number(progressInput.value);


    if (!title || !field) {

        alert("Please enter the project title and research field.");

        return;
    }


    const duplicate = projects.some(project => {

        return (
            project.title.toLowerCase() === title.toLowerCase() &&
            project.id !== editingProjectId
        );

    });


    if (duplicate) {

        alert("A project with this title already exists.");

        return;
    }


    const payload = {
        title,
        field,
        abstract,
        objectives,
        keywords,
        progress_percent: progress
    };


    const submitButton = projectForm.querySelector(
        'button[type="submit"]'
    );

    submitButton.disabled = true;

    submitButton.textContent = "Saving...";


    try {

        if (editingProjectId !== null) {

            await apiRequest(`projects/${editingProjectId}/`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });

        } else {

            await apiRequest("projects/", {
                method: "POST",
                body: JSON.stringify(payload)
            });

        }


        closeModal(projectModal);

        resetProjectForm();

        await loadProjects();


        alert(
            editingProjectId === null
                ? "Project created successfully!"
                : "Project updated successfully!"
        );


    } catch (error) {

        console.error("Project save error:", error);

        if (handleSessionError(error)) return;

        alert(`Unable to save project:\n${error.message}`);


    } finally {

        submitButton.disabled = false;

        submitButton.textContent =
            editingProjectId !== null
                ? "Save Changes"
                : "Create Project";

    }

});


// =====================================
// Load Projects from Backend
// =====================================

async function loadProjects() {

    projectsGrid.innerHTML = `
        <p>Loading your research projects...</p>
    `;

    try {

        const response = await apiRequest("projects/");

        projects = getList(response);

        renderProjects();


    } catch (error) {

        console.error("Project loading error:", error);

        if (handleSessionError(error)) return;


        projectsGrid.innerHTML = `
            <div class="activity-note">
                Unable to load your projects.
                Please check your backend server and try again.
            </div>
        `;

    }

}


// =====================================
// Initialize
// =====================================

if (accessToken && refreshToken) {
    loadProjects();
}
