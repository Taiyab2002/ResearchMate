
const API_BASE_URL = "http://127.0.0.1:8000/api";

const profileForm = document.getElementById("profileForm");
const profileMessage = document.getElementById("profileMessage");
const preferencesMessage = document.getElementById("preferencesMessage");
const saveProfileButton = document.getElementById("saveProfileButton");

let originalProfile = {
    full_name: "",
    university: "",
    department: ""
};


// ========================================
// Authentication
// ========================================

function getAccessToken() {
    return localStorage.getItem("rm_access_token");
}

function getRefreshToken() {
    return localStorage.getItem("rm_refresh_token");
}

function redirectToLogin() {
    localStorage.removeItem("rm_access_token");
    localStorage.removeItem("rm_refresh_token");

    window.location.href = "index.html";
}


// ========================================
// Refresh Access Token
// ========================================

async function refreshAccessToken() {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
        redirectToLogin();
        throw new Error("Session expired. Please login again.");
    }

    try {
        const response = await fetch(
            `${API_BASE_URL}/token/refresh/`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    refresh: refreshToken
                })
            }
        );

        if (!response.ok) {
            redirectToLogin();
            throw new Error("Session expired. Please login again.");
        }

        const data = await response.json();

        localStorage.setItem("rm_access_token", data.access);

        if (data.refresh) {
            localStorage.setItem("rm_refresh_token", data.refresh);
        }

        return data.access;

    } catch (error) {
        console.error("Token refresh error:", error);
        throw error;
    }
}


// ========================================
// Authenticated API Request
// ========================================

async function authenticatedRequest(url, options = {}) {
    let accessToken = getAccessToken();

    if (!accessToken) {
        redirectToLogin();
        throw new Error("Please login to access your profile.");
    }

    const requestOptions = {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        }
    };

    let response = await fetch(url, requestOptions);

    if (response.status === 401) {
        accessToken = await refreshAccessToken();

        requestOptions.headers.Authorization =
            `Bearer ${accessToken}`;

        response = await fetch(url, requestOptions);
    }

    return response;
}


// ========================================
// Profile Preview
// ========================================

function updateProfilePreview() {
    const name = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const university = document.getElementById("university").value.trim();
    const department = document.getElementById("department").value.trim();

    document.getElementById("profileNamePreview").textContent =
        name || "Your Name";

    document.getElementById("profileEmailPreview").textContent =
        email || "Email unavailable";

    const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0].toUpperCase())
        .join("");

    document.getElementById("avatarPreview").textContent =
        initials || "?";

    const complete = Boolean(name && university && department);

    const status = document.getElementById("profileStatus");

    status.textContent = complete ? "Complete" : "Incomplete";

    status.className = complete
        ? "badge text-bg-success"
        : "badge text-bg-warning";
}


// ========================================
// Load Profile From Backend
// ========================================

async function loadProfile() {
    profileMessage.textContent = "Loading your profile...";
    profileMessage.className = "text-secondary small mt-3 mb-0";

    try {
        const response = await authenticatedRequest(
            `${API_BASE_URL}/profile/`,
            {
                method: "GET"
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            throw new Error(
                errorData.detail || "Unable to load profile information."
            );
        }

        const data = await response.json();

        originalProfile = {
            full_name: data.full_name || "",
            university: data.university || "",
            department: data.department || ""
        };

        document.getElementById("fullName").value =
            originalProfile.full_name;

        document.getElementById("university").value =
            originalProfile.university;

        document.getElementById("department").value =
            originalProfile.department;

        // Current Backend serializer does not expose email.
        document.getElementById("email").value = "";

        updateProfilePreview();

        profileMessage.textContent =
            "Profile loaded successfully.";

        profileMessage.className =
            "text-success small mt-3 mb-0";

    } catch (error) {
        console.error("Profile loading error:", error);

        profileMessage.textContent =
            error.message || "Unable to load your profile.";

        profileMessage.className =
            "text-danger small mt-3 mb-0";
    }
}


// ========================================
// Save Profile To Backend
// ========================================

profileForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!profileForm.reportValidity()) {
        return;
    }

    const fullName =
        document.getElementById("fullName").value.trim();

    const university =
        document.getElementById("university").value.trim();

    const department =
        document.getElementById("department").value.trim();

    const profileData = {
        full_name: fullName,
        university: university,
        department: department
    };

    saveProfileButton.disabled = true;
    saveProfileButton.textContent = "Saving...";

    profileMessage.textContent = "Updating your profile...";
    profileMessage.className =
        "text-secondary small mt-3 mb-0";

    try {
        const response = await authenticatedRequest(
            `${API_BASE_URL}/profile/`,
            {
                method: "PATCH",
                body: JSON.stringify(profileData)
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));

            const errorMessage = Object.values(errorData)
                .flat()
                .join(" ");

            throw new Error(
                errorMessage || "Unable to update your profile."
            );
        }

        const updatedData = await response.json();

        originalProfile = {
            full_name: updatedData.full_name || fullName,
            university: updatedData.university || university,
            department: updatedData.department || department
        };

        updateProfilePreview();

        profileMessage.textContent =
            "Successfully saved to Backend: Full Name, University and Department. Student ID, Study Level and About Me are not saved yet.";

        profileMessage.className =
            "text-success small mt-3 mb-0";

    } catch (error) {
        console.error("Profile update error:", error);

        profileMessage.textContent =
            error.message || "Unable to update your profile.";

        profileMessage.className =
            "text-danger small mt-3 mb-0";

    } finally {
        saveProfileButton.disabled = false;
        saveProfileButton.textContent = "Save Changes";
    }
});


// ========================================
// Reset Profile Form
// ========================================

profileForm.addEventListener("reset", function () {
    setTimeout(() => {
        document.getElementById("fullName").value =
            originalProfile.full_name;

        document.getElementById("university").value =
            originalProfile.university;

        document.getElementById("department").value =
            originalProfile.department;

        updateProfilePreview();

        profileMessage.textContent =
            "Form restored to the last saved profile information.";

        profileMessage.className =
            "text-secondary small mt-3 mb-0";

    }, 0);
});


// ========================================
// Preferences
// ========================================

document.getElementById("savePreferences").addEventListener("click", function () {
    preferencesMessage.textContent =
        "Preferences cannot be saved yet because Backend support is not available.";

    preferencesMessage.className =
        "text-warning small mt-3 mb-0";
});


// ========================================
// Initial Setup
// ========================================

document.addEventListener("DOMContentLoaded", function () {
    loadProfile();
});
