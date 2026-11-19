
const API_BASE = "http://127.0.0.1:8000/api/";

const notesGrid = document.getElementById("notesGrid");
const noteForm = document.getElementById("noteForm");
const noteModal = document.getElementById("noteModal");
const noteDetailsModal = document.getElementById("noteDetailsModal");

const noteSearch = document.getElementById("noteSearch");
const noteTypeFilter = document.getElementById("noteTypeFilter");
const noteType = document.getElementById("noteType");

const paperLinkGroup = document.getElementById("paperLinkGroup");
const projectLinkGroup = document.getElementById("projectLinkGroup");
const notePaper = document.getElementById("notePaper");
const noteProject = document.getElementById("noteProject");

const noteTitleInput = document.getElementById("noteTitle");
const noteContentInput = document.getElementById("noteContent");
const saveNoteButton = document.getElementById("saveNoteButton");

let notes = [];
let projects = [];
let papers = [];
let editingNoteId = null;

let isLoading = false;

// =========================================
// AUTHENTICATION
// =========================================

function getAccessToken() {
    return localStorage.getItem("rm_access_token");
}

async function refreshAccessToken() {
    const refreshToken = localStorage.getItem("rm_refresh_token");

    if (!refreshToken) {
        return false;
    }

    try {
        const response = await fetch(API_BASE + "token/refresh/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                refresh: refreshToken
            })
        });

        const data = await response.json();

        if (!response.ok || !data.access) {
            return false;
        }

        localStorage.setItem("rm_access_token", data.access);

        if (data.refresh) {
            localStorage.setItem("rm_refresh_token", data.refresh);
        }

        return true;
    } catch (error) {
        console.error("Token refresh error:", error);
        return false;
    }
}

async function apiRequest(endpoint, options = {}, retry = true) {
    const token = getAccessToken();

    if (!token) {
        throw new Error("You are not logged in. Please sign in again.");
    }

    const headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    let response = await fetch(API_BASE + endpoint, {
        ...options,
        headers
    });

    if (response.status === 401 && retry) {
        const refreshed = await refreshAccessToken();

        if (refreshed) {
            return apiRequest(endpoint, options, false);
        }

        throw new Error("Your session has expired. Please sign in again.");
    }

    const contentType = response.headers.get("content-type") || "";
    let data = null;

    if (contentType.includes("application/json")) {
        data = await response.json();
    } else {
        data = await response.text();
    }

    if (!response.ok) {
        let message = "Request failed.";

        if (data && typeof data === "object") {
            message =
                data.detail ||
                data.message ||
                Object.entries(data)
                    .map(([key, value]) => {
                        return `${key}: ${Array.isArray(value) ? value.join(", ") : value}`;
                    })
                    .join("\n") ||
                message;
        } else if (data) {
            message = data;
        }

        throw new Error(message);
    }

    return data;
}

// =========================================
// HELPERS
// =========================================

function makeElement(tag, className, text) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined && text !== null) {
        element.textContent = text;
    }

    return element;
}

function showModal(modal) {
    modal.hidden = false;
}

function hideModal(modal) {
    modal.hidden = true;
}

function getNoteType(note) {
    return note.note_type || note.type || "general";
}

function getNoteDate(note) {
    return note.updated_at || note.created_at || note.updatedAt || "";
}

function getTypeLabel(type) {
    if (type === "paper") return "Paper Note";
    if (type === "project") return "Project Note";
    return "General Note";
}

function formatDate(dateString) {
    if (!dateString) return "Not available";

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function getLinkedItem(note) {
    const type = getNoteType(note);

    if (type === "paper") {
        const paperId = note.paper?.id ?? note.paper;
        const paper = papers.find(item => Number(item.id) === Number(paperId));

        return paper?.title || note.paper_title || "Linked research paper";
    }

    if (type === "project") {
        const projectId = note.project?.id ?? note.project;
        const project = projects.find(item => Number(item.id) === Number(projectId));

        return project?.title || note.project_title || "Linked research project";
    }

    return "";
}

function showError(message) {
    alert(message || "Something went wrong. Please try again.");
}

// =========================================
// LOAD PROJECTS AND PAPERS
// =========================================

function populateSelect(select, items, placeholder) {
    select.replaceChildren();

    const firstOption = makeElement("option", "", placeholder);
    firstOption.value = "";
    select.appendChild(firstOption);

    items.forEach(item => {
        const option = makeElement("option", "", item.title);
        option.value = item.id;
        select.appendChild(option);
    });
}

async function loadProjectsAndPapers() {
    const results = await Promise.allSettled([
        apiRequest("projects/"),
        apiRequest("papers/")
    ]);

    if (results[0].status === "fulfilled") {
        projects = Array.isArray(results[0].value)
            ? results[0].value
            : results[0].value.results || [];
    } else {
        projects = [];
        console.error("Projects loading error:", results[0].reason);
    }

    if (results[1].status === "fulfilled") {
        papers = Array.isArray(results[1].value)
            ? results[1].value
            : results[1].value.results || [];
    } else {
        papers = [];
        console.error("Papers loading error:", results[1].reason);
    }

    populateSelect(notePaper, papers, "Choose a paper");
    populateSelect(noteProject, projects, "Choose a project");

    notePaper.disabled = papers.length === 0;
    noteProject.disabled = projects.length === 0;
}

// =========================================
// NOTE LINK FIELDS
// =========================================

function updateLinkFields() {
    const type = noteType.value;

    paperLinkGroup.hidden = type !== "paper";
    projectLinkGroup.hidden = type !== "project";

    notePaper.required = type === "paper";
    noteProject.required = type === "project";

    notePaper.disabled = type !== "paper" || papers.length === 0;
    noteProject.disabled = type !== "project" || projects.length === 0;
}

noteType.addEventListener("change", updateLinkFields);

// =========================================
// MODAL CONTROLS
// =========================================

function openCreateNote() {
    editingNoteId = null;
    noteForm.reset();

    document.getElementById("noteModalTitle").textContent =
        "Create Research Note";

    saveNoteButton.textContent = "Save Note";
    saveNoteButton.disabled = false;

    updateLinkFields();
    showModal(noteModal);
    noteTitleInput.focus();
}

document.getElementById("addNoteButton").addEventListener(
    "click",
    openCreateNote
);

document.getElementById("closeNoteModal").addEventListener(
    "click",
    () => hideModal(noteModal)
);

document.getElementById("cancelNote").addEventListener(
    "click",
    () => hideModal(noteModal)
);

document.getElementById("closeNoteDetails").addEventListener(
    "click",
    () => hideModal(noteDetailsModal)
);

document.getElementById("closeNoteDetailsButton").addEventListener(
    "click",
    () => hideModal(noteDetailsModal)
);

[noteModal, noteDetailsModal].forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            hideModal(modal);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        hideModal(noteModal);
        hideModal(noteDetailsModal);
    }
});

// =========================================
// RENDER NOTES
// =========================================

function renderNotes() {
    notesGrid.replaceChildren();

    const query = noteSearch.value.trim().toLowerCase();
    const selectedType = noteTypeFilter.value;

    const filteredNotes = notes.filter(note => {
        const type = getNoteType(note);
        const linkedItem = getLinkedItem(note);

        const searchableText = [
            note.title,
            note.content,
            linkedItem,
            getTypeLabel(type)
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(query);
        const matchesType =
            selectedType === "all" || type === selectedType;

        return matchesSearch && matchesType;
    });

    filteredNotes.forEach(note => {
        notesGrid.appendChild(createNoteCard(note));
    });

    document.getElementById("emptyNotes").hidden =
        filteredNotes.length > 0;

    document.getElementById("noteResultCount").textContent =
        `${filteredNotes.length} ${filteredNotes.length === 1 ? "note" : "notes"}`;

    updateStatistics();
}

function createNoteCard(note) {
    const card = makeElement("article", "note-card");

    const type = getNoteType(note);
    const linkedItemName = getLinkedItem(note);

    const top = makeElement("div", "note-card-top");

    const badge = makeElement(
        "span",
        "note-type-badge " + type,
        getTypeLabel(type)
    );

    const date = makeElement(
        "span",
        "note-date",
        formatDate(getNoteDate(note))
    );

    top.append(badge, date);

    const title = makeElement("h3", "", note.title);
    const preview = makeElement("p", "note-preview", note.content);

    const linkedItem = makeElement(
        "p",
        "note-linked-item",
        linkedItemName
            ? "Linked to: " + linkedItemName
            : "Not linked to a paper or project"
    );

    const footer = makeElement("div", "note-card-footer");

    const viewButton = makeElement("button", "note-action primary", "View");
    viewButton.type = "button";
    viewButton.addEventListener("click", () => viewNote(note));

    const editButton = makeElement("button", "note-action", "Edit");
    editButton.type = "button";
    editButton.addEventListener("click", () => editNote(note));

    const deleteButton = makeElement("button", "note-action delete", "Delete");
    deleteButton.type = "button";
    deleteButton.addEventListener("click", () => deleteNote(note.id));

    footer.append(viewButton, editButton, deleteButton);
    card.append(top, title, preview, linkedItem, footer);

    return card;
}

function updateStatistics() {
    document.getElementById("totalNotes").textContent = notes.length;

    document.getElementById("paperNotesCount").textContent =
        notes.filter(note => getNoteType(note) === "paper").length;

    document.getElementById("projectNotesCount").textContent =
        notes.filter(note => getNoteType(note) === "project").length;
}

// =========================================
// VIEW NOTE
// =========================================

function viewNote(note) {
    const type = getNoteType(note);
    const linkedItem = getLinkedItem(note);

    document.getElementById("noteDetailsTitle").textContent = note.title;

    document.getElementById("noteDetailsMeta").textContent =
        getTypeLabel(type) +
        " · " +
        (linkedItem || "No linked item") +
        " · Created " +
        formatDate(getNoteDate(note));

    document.getElementById("noteDetailsContent").textContent =
        note.content || "";

    showModal(noteDetailsModal);
}

// =========================================
// EDIT NOTE
// =========================================

function editNote(note) {
    editingNoteId = note.id;

    noteTitleInput.value = note.title || "";
    noteContentInput.value = note.content || "";

    noteType.value = getNoteType(note);
    updateLinkFields();

    const paperId = note.paper?.id ?? note.paper ?? "";
    const projectId = note.project?.id ?? note.project ?? "";

    notePaper.value = paperId ? String(paperId) : "";
    noteProject.value = projectId ? String(projectId) : "";

    document.getElementById("noteModalTitle").textContent =
        "Edit Research Note";

    saveNoteButton.textContent = "Update Note";
    saveNoteButton.disabled = false;

    showModal(noteModal);
}

// =========================================
// CREATE / UPDATE NOTE
// =========================================

function buildNotePayload() {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    const type = noteType.value;

    if (!title || !content) {
        throw new Error("Please enter both a note title and content.");
    }

    const payload = {
        title,
        content,
        note_type: type,
        project: null,
        paper: null
    };

    if (type === "paper") {
        if (!notePaper.value) {
            throw new Error("Please select a research paper.");
        }

        payload.paper = Number(notePaper.value);
    }

    if (type === "project") {
        if (!noteProject.value) {
            throw new Error("Please select a research project.");
        }

        payload.project = Number(noteProject.value);
    }

    return payload;
}

noteForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (isLoading) return;

    let payload;

    try {
        payload = buildNotePayload();
    } catch (error) {
        showError(error.message);
        return;
    }

    isLoading = true;
    saveNoteButton.disabled = true;
    saveNoteButton.textContent = editingNoteId !== null
        ? "Updating..."
        : "Saving...";

    try {
        if (editingNoteId !== null) {
            await apiRequest(`notes/${editingNoteId}/`, {
                method: "PATCH",
                body: JSON.stringify(payload)
            });
        } else {
            await apiRequest("notes/", {
                method: "POST",
                body: JSON.stringify(payload)
            });
        }

        hideModal(noteModal);
        noteForm.reset();
        editingNoteId = null;

        await loadNotes();

    } catch (error) {
        console.error("Note save error:", error);
        showError(error.message);
    } finally {
        isLoading = false;
        saveNoteButton.disabled = false;
        saveNoteButton.textContent = editingNoteId !== null
            ? "Update Note"
            : "Save Note";

        updateLinkFields();
    }
});

// =========================================
// DELETE NOTE
// =========================================

async function deleteNote(id) {
    const note = notes.find(item => Number(item.id) === Number(id));

    if (!note) return;

    const confirmed = confirm(
        `Are you sure you want to delete "${note.title}"?`
    );

    if (!confirmed) return;

    try {
        await apiRequest(`notes/${id}/`, {
            method: "DELETE"
        });

        await loadNotes();

    } catch (error) {
        console.error("Note delete error:", error);
        showError(error.message);
    }
}

// =========================================
// LOAD NOTES FROM BACKEND
// =========================================

async function loadNotes() {
    try {
        const response = await apiRequest("notes/");

        notes = Array.isArray(response)
            ? response
            : response.results || [];

        renderNotes();

    } catch (error) {
        console.error("Notes loading error:", error);

        notes = [];
        renderNotes();

        document.getElementById("emptyNotes").textContent =
            error.message;

        showError("Could not load your research notes.\n\n" + error.message);
    }
}

// =========================================
// SEARCH AND FILTER
// =========================================

noteSearch.addEventListener("input", renderNotes);
noteTypeFilter.addEventListener("change", renderNotes);

// =========================================
// INITIALIZE
// =========================================

async function initializeNotes() {
    updateLinkFields();

    try {
        await loadProjectsAndPapers();
        await loadNotes();
    } catch (error) {
        console.error("Notes initialization error:", error);
    }
}

initializeNotes();
