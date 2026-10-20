
const projectsGrid = document.getElementById("projectsGrid");
const projectModal = document.getElementById("projectModal");
const detailsModal = document.getElementById("detailsModal");
const projectForm = document.getElementById("projectForm");

const searchInput = document.getElementById("projectSearch");
const statusFilter = document.getElementById("statusFilter");
const emptyProjects = document.getElementById("emptyProjects");

const openProjectFormButton =
    document.getElementById("openProjectForm");

const closeProjectFormButton =
    document.getElementById("closeProjectForm");

const cancelProjectFormButton =
    document.getElementById("cancelProjectForm");

let nextProjectId = 1;

function openModal(modal) {
    modal.hidden = false;
}

function closeModal(modal) {
    modal.hidden = true;
}

openProjectFormButton.addEventListener("click", function () {
    openModal(projectModal);
    document.getElementById("projectTitle").focus();
});

closeProjectFormButton.addEventListener("click", function () {
    closeModal(projectModal);
});

cancelProjectFormButton.addEventListener("click", function () {
    closeModal(projectModal);
});

document.getElementById("closeDetails").addEventListener(
    "click",
    function () {
        closeModal(detailsModal);
    }
);

document.getElementById("closeDetailsButton").addEventListener(
    "click",
    function () {
        closeModal(detailsModal);
    }
);

// Close a modal when clicking outside its card.
[projectModal, detailsModal].forEach(function (modal) {
    modal.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
});

// Close the open modal with Escape.
document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") {
        closeModal(projectModal);
        closeModal(detailsModal);
    }
});

function getProjectCards() {
    return Array.from(
        projectsGrid.querySelectorAll(".project-card")
    );
}

function getProjectInitials(title) {
    const words = title.trim().split(/\s+/);

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return (words[0][0] + words[1][0]).toUpperCase();
}

function getStatusClass(status) {
    if (status === "Completed") {
        return "status-completed";
    }

    if (status === "Planning") {
        return "status-planning";
    }

    return "status-progress";
}

function getProjectColor(status) {
    if (status === "Completed") {
        return "green";
    }

    if (status === "Planning") {
        return "orange";
    }

    return "blue";
}

function getProgress(status) {
    if (status === "Completed") {
        return 100;
    }

    if (status === "Planning") {
        return 0;
    }

    return 10;
}

function updateStatistics() {
    const cards = getProjectCards();

    const completed = cards.filter(function (card) {
        return card.dataset.status === "Completed";
    }).length;

    const active = cards.filter(function (card) {
        return card.dataset.status === "In Progress";
    }).length;

    document.getElementById("totalProjects").textContent =
        cards.length;

    document.getElementById("activeProjects").textContent =
        active;

    document.getElementById("completedProjects").textContent =
        completed;
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
            selectedStatus === "all" ||
            status === selectedStatus;

        const visible = matchesSearch && matchesStatus;

        card.hidden = !visible;

        if (visible) {
            visibleCount++;
        }
    });

    emptyProjects.hidden = visibleCount !== 0;
}

searchInput.addEventListener("input", filterProjects);
statusFilter.addEventListener("change", filterProjects);

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
        card.dataset.progress + "%";

    document.getElementById("detailsProgressBar").style.width =
        card.dataset.progress + "%";

    document.getElementById("detailsObjectives").textContent =
        card.dataset.objectives || "Not provided yet.";

    document.getElementById("detailsKeywords").textContent =
        card.dataset.keywords || "Not provided yet.";

    openModal(detailsModal);
}

projectsGrid.addEventListener("click", function (event) {
    const button = event.target.closest('[data-action="view"]');

    if (!button) {
        return;
    }

    const card = button.closest(".project-card");

    if (card) {
        openProjectDetails(card);
    }
});

projectForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title =
        document.getElementById("projectTitle").value.trim();

    const field =
        document.getElementById("projectField").value.trim();

    const abstract =
        document.getElementById("projectAbstract").value.trim();

    const objectives =
        document.getElementById("projectObjectives").value.trim();

    const keywords =
        document.getElementById("projectKeywords").value.trim();

    const status =
        document.getElementById("projectStatus").value;

    if (!title || !field) {
        alert("Please enter the project title and research field.");
        return;
    }

    const duplicate = getProjectCards().some(function (card) {
        return card.dataset.title.toLowerCase() === title.toLowerCase();
    });

    if (duplicate) {
        alert("A project with this title already exists.");
        return;
    }

    const progress = getProgress(status);
    const color = getProjectColor(status);
    const statusClass = getStatusClass(status);
    const initials = getProjectInitials(title);

    const card = document.createElement("article");

    card.className = "project-card";

    card.dataset.title = title;
    card.dataset.field = field;
    card.dataset.status = status;
    card.dataset.progress = progress;
    card.dataset.abstract = abstract;
    card.dataset.objectives = objectives;
    card.dataset.keywords = keywords;
    card.dataset.projectId = nextProjectId++;

    // Use textContent for user-provided values to avoid HTML injection.
    const top = document.createElement("div");
    top.className = "project-card-top";

    const mark = document.createElement("div");
    mark.className = "project-mark " + color;
    mark.textContent = initials;

    const badge = document.createElement("span");
    badge.className = "status-badge " + statusClass;
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
    metaValue.textContent = progress + "%";

    meta.append(metaLabel, metaValue);

    const track = document.createElement("div");
    track.className = "progress-track";

    const fill = document.createElement("div");
    fill.className = "progress-fill";

    if (status === "Completed") {
        fill.classList.add("green-fill");
    }

    fill.style.width = progress + "%";
    track.appendChild(fill);

    const footer = document.createElement("div");
    footer.className = "project-card-footer";

    const footerLabel = document.createElement("span");
    footerLabel.textContent = "Research project";

    const detailsButton = document.createElement("button");
    detailsButton.type = "button";
    detailsButton.className = "project-view-btn";
    detailsButton.dataset.action = "view";
    detailsButton.textContent = "View details →";

    footer.append(footerLabel, detailsButton);

    card.append(
        top,
        fieldText,
        heading,
        description,
        meta,
        track,
        footer
    );

    projectsGrid.prepend(card);

    projectForm.reset();
    closeModal(projectModal);

    updateStatistics();
    filterProjects();

    alert("Project added to the list successfully!");
});

updateStatistics();
filterProjects();
