
const API_BASE = "http://127.0.0.1:8000/api/";


// =====================================
// Authentication
// =====================================

let accessToken = localStorage.getItem("rm_access_token");
const refreshToken = localStorage.getItem("rm_refresh_token");

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


async function apiRequest(endpoint, retry = true) {

    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    });

    if (response.status === 401 && retry) {

        await refreshAccessToken();

        return apiRequest(endpoint, false);
    }

    if (response.status === 401) {
        throw new Error("Session expired. Please log in again.");
    }

    if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
    }

    return response.json();
}


// =====================================
// Utility Functions
// =====================================

function getList(data) {

    if (Array.isArray(data)) {
        return data;
    }

    if (data && Array.isArray(data.results)) {
        return data.results;
    }

    return [];
}


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


function formatDate(dateValue) {

    if (!dateValue) {
        return "Recently";
    }

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Recently";
    }

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}


function getProjectInitials(title) {

    if (!title) {
        return "RP";
    }

    const words = title.trim().split(/\s+/);

    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }

    return (
        words[0][0] + words[1][0]
    ).toUpperCase();
}


function getProgressColor(index) {

    const colors = [
        "blue",
        "purple",
        "green"
    ];

    return colors[index % colors.length];
}


function getProgressFillClass(index) {

    const classes = [
        "",
        "purple-fill",
        "green-fill"
    ];

    return classes[index % classes.length];
}


// =====================================
// Dashboard Summary
// =====================================

function updateSummary(projects, papers) {

    const activeProjects = projects.length;

    const savedPapers = papers.length;

    document.getElementById("activeProjectsCount").textContent =
        activeProjects;

    document.getElementById("savedPapersCount").textContent =
        savedPapers;


    // Calculate average project progress

    let averageProgress = 0;

    if (projects.length > 0) {

        const totalProgress = projects.reduce((total, project) => {

            const progress = Number(project.progress_percent) || 0;

            return total + Math.min(100, Math.max(0, progress));

        }, 0);

        averageProgress = Math.round(
            totalProgress / projects.length
        );
    }


    document.getElementById("overallProgress").textContent =
        `${averageProgress}%`;

    document.getElementById("overallProgressBar").style.width =
        `${averageProgress}%`;

}


// =====================================
// Display Projects
// =====================================

function renderProjects(projects) {

    const container = document.getElementById("dashboardProjects");

    if (!projects.length) {

        container.innerHTML = `
            <div class="activity-note">
                You haven't created any research projects yet.
                <a href="projects.html">Create your first project</a>.
            </div>
        `;

        return;
    }


    const recentProjects = projects.slice(0, 3);

    container.innerHTML = recentProjects.map((project, index) => {

        const title = escapeHTML(project.title || "Untitled Project");

        const field = escapeHTML(project.field || "Research Project");

        const progress = Math.min(
            100,
            Math.max(0, Number(project.progress_percent) || 0)
        );

        const color = getProgressColor(index);

        const fillClass = getProgressFillClass(index);

        const initials = getProjectInitials(project.title);

        return `

            <div class="project-item">

                <div class="project-mark ${color}">
                    ${escapeHTML(initials)}
                </div>

                <div class="project-info">

                    <h3>${title}</h3>

                    <p>${field}</p>

                    <div class="progress-track">

                        <div
                            class="progress-fill ${fillClass}"
                            style="width: ${progress}%"
                        ></div>

                    </div>

                    <small>${progress}% complete</small>

                </div>

            </div>

        `;

    }).join("");

}


// =====================================
// Recent Activity
// =====================================

function renderActivity(projects, papers) {

    const container = document.getElementById("dashboardActivity");

    const activities = [];


    // Project activities

    projects.forEach(project => {

        activities.push({

            title: "Project created",

            description: project.title || "A new research project",

            date: project.created_at,

            type: "project"

        });

    });


    // Paper activities

    papers.forEach(paper => {

        activities.push({

            title: "Paper added",

            description: paper.title || "A new academic paper",

            date: paper.created_at,

            type: "paper"

        });

    });


    // Sort by creation date

    activities.sort((a, b) => {

        return new Date(b.date || 0) - new Date(a.date || 0);

    });


    const recentActivities = activities.slice(0, 5);


    if (!recentActivities.length) {

        container.innerHTML = `
            <div class="activity-note">
                No research activity yet.
                Your projects and saved papers will appear here.
            </div>
        `;

        return;
    }


    container.innerHTML = recentActivities.map(activity => {

        const isProject = activity.type === "project";

        const dotClass = isProject ? "purple-dot" : "blue-dot";

        return `

            <div class="activity-item">

                <span class="activity-dot ${dotClass}"></span>

                <div>

                    <h3>${escapeHTML(activity.title)}</h3>

                    <p>${escapeHTML(activity.description)}</p>

                    <small>${formatDate(activity.date)}</small>

                </div>

            </div>

        `;

    }).join("");

}


// =====================================
// Load Dashboard Data
// =====================================

async function loadDashboard() {

    const projectsContainer =
        document.getElementById("dashboardProjects");

    const activityContainer =
        document.getElementById("dashboardActivity");


    try {

        const [projectsResponse, papersResponse] = await Promise.all([

            apiRequest("projects/"),

            apiRequest("papers/")

        ]);


        const projects = getList(projectsResponse);

        const papers = getList(papersResponse);


        updateSummary(projects, papers);

        renderProjects(projects);

        renderActivity(projects, papers);


    } catch (error) {

        console.error("Dashboard loading error:", error);

        if (
            error.message.includes("Session expired") ||
            error.message.includes("log in")
        ) {

            localStorage.removeItem("rm_access_token");

            localStorage.removeItem("rm_refresh_token");

            alert("Your session has expired. Please log in again.");

            window.location.replace("index.html");

            return;
        }


        projectsContainer.innerHTML = `
            <div class="activity-note">
                Unable to load projects.
                Please check your backend server and try again.
            </div>
        `;

        activityContainer.innerHTML = `
            <div class="activity-note">
                Unable to load recent activity.
            </div>
        `;

    }

}


// =====================================
// Sign Out
// =====================================

const logoutButton = document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", function () {

        localStorage.removeItem("rm_access_token");

        localStorage.removeItem("rm_refresh_token");

    });

}


// =====================================
// Initialize Dashboard
// =====================================

if (accessToken && refreshToken) {

    loadDashboard();

}
