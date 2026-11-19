
/* =========================================================
   ResearchMate - Paper Library
   Backend API Integration
========================================================= */

const API_BASE = "http://127.0.0.1:8000/api/";

let papers = [];
let projects = [];
let currentPaperId = null;

/* =========================================================
   DOM ELEMENTS
========================================================= */

const papersGrid = document.getElementById("papersGrid");
const paperForm = document.getElementById("paperForm");

const uploadModal = document.getElementById("uploadModal");
const paperDetailsModal = document.getElementById("paperDetailsModal");

const openUploadModal = document.getElementById("openUploadModal");
const closeUploadModal = document.getElementById("closeUploadModal");
const cancelUpload = document.getElementById("cancelUpload");

const closePaperDetails = document.getElementById("closePaperDetails");
const closePaperDetailsButton = document.getElementById("closePaperDetailsButton");

const paperSearch = document.getElementById("paperSearch");
const yearFilter = document.getElementById("yearFilter");
const bookmarkFilter = document.getElementById("bookmarkFilter");

const emptyPapers = document.getElementById("emptyPapers");

const totalPapersElement = document.getElementById("totalPapers");
const bookmarkedPapersElement = document.getElementById("bookmarkedPapers");
const pdfPapersElement = document.getElementById("pdfPapers");

const paperResultCount = document.getElementById("paperResultCount");

const paperProjectSelect = document.getElementById("paperProject");

/* =========================================================
   AUTHENTICATION
========================================================= */

function getAccessToken() {
    return localStorage.getItem("rm_access_token");
}

function getRefreshToken() {
    return localStorage.getItem("rm_refresh_token");
}

function redirectToLogin() {
    alert("Your session has expired. Please log in again.");
    window.location.href = "index.html";
}

async function refreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        redirectToLogin();
        throw new Error("No refresh token available.");
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

    if (!response.ok) {
        localStorage.removeItem("rm_access_token");
        localStorage.removeItem("rm_refresh_token");

        redirectToLogin();
        throw new Error("Session expired.");
    }

    const data = await response.json();

    localStorage.setItem("rm_access_token", data.access);

    return data.access;
}

/* =========================================================
   API REQUEST HANDLER
========================================================= */

async function apiRequest(endpoint, options = {}, retry = true) {
    let token = getAccessToken();

    if (!token) {
        redirectToLogin();
        throw new Error("Authentication required.");
    }

    const headers = {
        ...(options.headers || {}),
        "Authorization": `Bearer ${token}`
    };

    if (!(options.body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
    }

    let response;

    try {
        response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
    } catch (error) {
        throw new Error(
            "Cannot connect to the backend. Make sure Django server is running."
        );
    }

    if (response.status === 401 && retry) {
        token = await refreshAccessToken();

        return apiRequest(endpoint, options, false);
    }

    if (response.status === 401) {
        redirectToLogin();
        throw new Error("Authentication failed.");
    }

    if (!response.ok) {
        let errorMessage = "Something went wrong.";

        try {
            const errorData = await response.json();

            errorMessage = Object.entries(errorData)
                .map(([field, messages]) => {
                    const message = Array.isArray(messages)
                        ? messages.join(", ")
                        : messages;

                    return `${field}: ${message}`;
                })
                .join("\n");

        } catch (error) {
            errorMessage = `Server error: ${response.status}`;
        }

        throw new Error(errorMessage);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", initializePaperLibrary);

async function initializePaperLibrary() {
    if (!getAccessToken()) {
        redirectToLogin();
        return;
    }

    setupEventListeners();

    try {
        await loadProjects();
        await loadPapers();
    } catch (error) {
        console.error("Paper Library initialization error:", error);
        showError(error.message);
    }
}

/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    openUploadModal?.addEventListener("click", () => {
        openModal(uploadModal);
    });

    closeUploadModal?.addEventListener("click", () => {
        closeModal(uploadModal);
    });

    cancelUpload?.addEventListener("click", () => {
        closeModal(uploadModal);
    });

    closePaperDetails?.addEventListener("click", () => {
        closeModal(paperDetailsModal);
    });

    closePaperDetailsButton?.addEventListener("click", () => {
        closeModal(paperDetailsModal);
    });

    uploadModal?.addEventListener("click", (event) => {
        if (event.target === uploadModal) {
            closeModal(uploadModal);
        }
    });

    paperDetailsModal?.addEventListener("click", (event) => {
        if (event.target === paperDetailsModal) {
            closeModal(paperDetailsModal);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeModal(uploadModal);
            closeModal(paperDetailsModal);
        }
    });

    paperSearch?.addEventListener("input", renderPapers);
    yearFilter?.addEventListener("change", renderPapers);
    bookmarkFilter?.addEventListener("change", renderPapers);

    paperForm?.addEventListener("submit", handleAddPaper);
}

/* =========================================================
   MODAL FUNCTIONS
========================================================= */

function openModal(modal) {
    if (!modal) return;

    modal.hidden = false;
    document.body.classList.add("modal-open");
}

function closeModal(modal) {
    if (!modal) return;

    modal.hidden = true;

    if (
        uploadModal?.hidden !== false &&
        paperDetailsModal?.hidden !== false
    ) {
        document.body.classList.remove("modal-open");
    }
}

/* =========================================================
   LOAD PROJECTS FROM BACKEND
========================================================= */

async function loadProjects() {
    if (!paperProjectSelect) return;

    paperProjectSelect.innerHTML = `
        <option value="">Loading projects...</option>
    `;

    try {
        const data = await apiRequest("projects/");

        projects = Array.isArray(data)
            ? data
            : data.results || [];

        populateProjectDropdown();

    } catch (error) {
        paperProjectSelect.innerHTML = `
            <option value="">Unable to load projects</option>
        `;

        throw error;
    }
}

function populateProjectDropdown() {
    if (!paperProjectSelect) return;

    paperProjectSelect.innerHTML = "";

    if (projects.length === 0) {
        paperProjectSelect.innerHTML = `
            <option value="">No projects available</option>
        `;

        paperProjectSelect.disabled = true;

        return;
    }

    paperProjectSelect.disabled = false;

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Select a research project";

    paperProjectSelect.appendChild(placeholder);

    projects.forEach(project => {
        const option = document.createElement("option");

        option.value = project.id;
        option.textContent = project.title;

        paperProjectSelect.appendChild(option);
    });
}

/* =========================================================
   LOAD PAPERS FROM BACKEND
========================================================= */

async function loadPapers() {
    const data = await apiRequest("papers/");

    papers = Array.isArray(data)
        ? data
        : data.results || [];

    papers.sort((a, b) => {
        return new Date(b.created_at || 0) -
               new Date(a.created_at || 0);
    });

    refreshYearFilter();
    updateStatistics();
    renderPapers();
}

/* =========================================================
   STATISTICS
========================================================= */

function updateStatistics() {
    if (totalPapersElement) {
        totalPapersElement.textContent = papers.length;
    }

    const bookmarkedCount = papers.filter(
        paper => paper.bookmarked
    ).length;

    if (bookmarkedPapersElement) {
        bookmarkedPapersElement.textContent = bookmarkedCount;
    }

    /*
       The current backend does not have a PDF field.
       Therefore, PDF count cannot be retrieved from the API.
    */

    if (pdfPapersElement) {
        pdfPapersElement.textContent = "—";
    }
}

/* =========================================================
   YEAR FILTER
========================================================= */

function refreshYearFilter() {
    if (!yearFilter) return;

    const selectedYear = yearFilter.value;

    const years = [
        ...new Set(
            papers
                .map(paper => Number(paper.year))
                .filter(year => Number.isFinite(year))
        )
    ].sort((a, b) => b - a);

    yearFilter.innerHTML = `
        <option value="all">All Years</option>
    `;

    years.forEach(year => {
        const option = document.createElement("option");

        option.value = year;
        option.textContent = year;

        yearFilter.appendChild(option);
    });

    if (years.includes(Number(selectedYear))) {
        yearFilter.value = selectedYear;
    }
}

/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

/* =========================================================
   PROJECT NAME HELPER
========================================================= */

function getProjectName(projectId) {
    const project = projects.find(
        item => String(item.id) === String(projectId)
    );

    return project ? project.title : "Unknown Project";
}

/* =========================================================
   RENDER PAPERS
========================================================= */

function renderPapers() {
    if (!papersGrid) return;

    const searchTerm = paperSearch
        ? paperSearch.value.toLowerCase().trim()
        : "";

    const selectedYear = yearFilter
        ? yearFilter.value
        : "all";

    const selectedBookmark = bookmarkFilter
        ? bookmarkFilter.value
        : "all";

    const filteredPapers = papers.filter(paper => {

        const searchableText = [
            paper.title,
            paper.authors,
            paper.journal,
            paper.keywords
        ].join(" ").toLowerCase();

        const matchesSearch = searchableText.includes(searchTerm);

        const matchesYear =
            selectedYear === "all" ||
            String(paper.year) === selectedYear;

        const matchesBookmark =
            selectedBookmark === "all" ||
            paper.bookmarked === true;

        return matchesSearch && matchesYear && matchesBookmark;
    });

    papersGrid.innerHTML = "";

    if (paperResultCount) {
        paperResultCount.textContent =
            `${filteredPapers.length} ${filteredPapers.length === 1 ? "paper" : "papers"}`;
    }

    if (emptyPapers) {
        emptyPapers.hidden = filteredPapers.length !== 0;
    }

    filteredPapers.forEach(paper => {
        const card = document.createElement("article");

        card.className = "paper-card";

        const projectName = getProjectName(paper.project);

        const keywords = paper.keywords
            ? paper.keywords.split(",").map(keyword => keyword.trim())
            : [];

        card.innerHTML = `
            <div class="paper-card-header">
                <span class="paper-year">
                    ${escapeHTML(paper.year)}
                </span>

                <button
                    type="button"
                    class="bookmark-btn ${paper.bookmarked ? "active" : ""}"
                    data-bookmark-id="${paper.id}"
                    aria-label="Toggle bookmark"
                    title="Toggle bookmark">
                    ${paper.bookmarked ? "★" : "☆"}
                </button>
            </div>

            <div class="paper-card-content">
                <h3>${escapeHTML(paper.title)}</h3>

                <p class="paper-authors">
                    ${escapeHTML(paper.authors)}
                </p>

                <p class="paper-journal">
                    ${escapeHTML(paper.journal || "Journal not specified")}
                </p>

                <div class="paper-keywords">
                    ${keywords.map(keyword => `
                        <span class="keyword-tag">
                            ${escapeHTML(keyword)}
                        </span>
                    `).join("")}
                </div>

                <p class="paper-project">
                    <strong>Project:</strong>
                    ${escapeHTML(projectName)}
                </p>
            </div>

            <div class="paper-card-footer">
                <button
                    type="button"
                    class="view-paper-btn"
                    data-details-id="${paper.id}">
                    View Details
                </button>
            </div>
        `;

        papersGrid.appendChild(card);
    });

    attachCardEventListeners();
}

/* =========================================================
   CARD EVENT LISTENERS
========================================================= */

function attachCardEventListeners() {

    document.querySelectorAll("[data-bookmark-id]").forEach(button => {

        button.addEventListener("click", async () => {
            const paperId = button.dataset.bookmarkId;

            await toggleBookmark(paperId);
        });
    });

    document.querySelectorAll("[data-details-id]").forEach(button => {

        button.addEventListener("click", () => {
            const paperId = button.dataset.detailsId;

            showPaperDetails(paperId);
        });
    });
}

/* =========================================================
   BOOKMARK TOGGLE - BACKEND
========================================================= */

async function toggleBookmark(paperId) {
    const paper = papers.find(
        item => String(item.id) === String(paperId)
    );

    if (!paper) return;

    const newBookmarkStatus = !paper.bookmarked;

    try {
        await apiRequest(`papers/${paperId}/`, {
            method: "PATCH",
            body: JSON.stringify({
                bookmarked: newBookmarkStatus
            })
        });

        paper.bookmarked = newBookmarkStatus;

        updateStatistics();
        renderPapers();

    } catch (error) {
        console.error("Bookmark error:", error);
        showError(error.message);
    }
}

/* =========================================================
   PAPER DETAILS MODAL
========================================================= */

function showPaperDetails(paperId) {
    const paper = papers.find(
        item => String(item.id) === String(paperId)
    );

    if (!paper) return;

    currentPaperId = paper.id;

    const titleElement = document.getElementById("paperDetailsTitle");
    const contentElement = document.getElementById("paperDetailsContent");

    if (titleElement) {
        titleElement.textContent = paper.title;
    }

    if (contentElement) {
        contentElement.innerHTML = `
            <div class="paper-details">

                <div class="detail-item">
                    <strong>Authors</strong>
                    <p>${escapeHTML(paper.authors)}</p>
                </div>

                <div class="detail-item">
                    <strong>Publication Year</strong>
                    <p>${escapeHTML(paper.year)}</p>
                </div>

                <div class="detail-item">
                    <strong>Journal / Conference</strong>
                    <p>${escapeHTML(paper.journal || "Not specified")}</p>
                </div>

                <div class="detail-item">
                    <strong>Keywords</strong>
                    <p>${escapeHTML(paper.keywords || "No keywords added")}</p>
                </div>

                <div class="detail-item">
                    <strong>Linked Project</strong>
                    <p>${escapeHTML(getProjectName(paper.project))}</p>
                </div>

                <div class="detail-item">
                    <strong>Bookmark</strong>
                    <p>${paper.bookmarked ? "★ Bookmarked" : "☆ Not bookmarked"}</p>
                </div>

                <div class="detail-item">
                    <strong>PDF</strong>
                    <p>PDF upload is not currently supported by the backend.</p>
                </div>

            </div>
        `;
    }

    openModal(paperDetailsModal);
}

/* =========================================================
   ADD NEW PAPER - BACKEND
========================================================= */

async function handleAddPaper(event) {
    event.preventDefault();

    if (!paperForm) return;

    if (projects.length === 0) {
        showError("You need to create a research project before adding a paper.");
        return;
    }

    const title = document.getElementById("paperTitle").value.trim();
    const authors = document.getElementById("paperAuthors").value.trim();

    const year = Number(
        document.getElementById("paperYear").value
    );

    const journal = document.getElementById("paperJournal").value.trim();

    const keywords = document.getElementById("paperKeywords").value.trim();

    const projectId = paperProjectSelect.value;

    const paperFile = document.getElementById("paperFile");

    if (!title || !authors || !year || !projectId) {
        showError("Please fill in all required fields.");
        return;
    }

    if (!Number.isInteger(year) || year < 1900) {
        showError("Please enter a valid publication year.");
        return;
    }

    if (!projects.some(project => String(project.id) === String(projectId))) {
        showError("Please select a valid research project.");
        return;
    }

    if (paperFile?.files.length > 0) {
        const file = paperFile.files[0];

        if (file.type !== "application/pdf") {
            showError("Please select a valid PDF file.");
            return;
        }
    }

    const submitButton = paperForm.querySelector(
        'button[type="submit"]'
    );

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Saving...";
    }

    const paperData = {
        title: title,
        authors: authors,
        year: year,
        journal: journal,
        keywords: keywords,
        project: Number(projectId),
        bookmarked: false
    };

    try {
        await apiRequest("papers/", {
            method: "POST",
            body: JSON.stringify(paperData)
        });

        paperForm.reset();

        closeModal(uploadModal);

        await loadPapers();

        alert("Research paper added successfully!");

    } catch (error) {
        console.error("Add paper error:", error);
        showError(error.message);

    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = "Add Paper";
        }
    }
}

/* =========================================================
   ERROR HANDLING
========================================================= */

function showError(message) {
    alert(message || "Something went wrong. Please try again.");
}
