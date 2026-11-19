
const API_BASE = "http://127.0.0.1:8000/api/";

// ================================
// Helper Functions
// ================================

function getErrorMessage(data) {
    if (!data) {
        return "Something went wrong. Please try again.";
    }

    if (typeof data === "string") {
        return data;
    }

    if (data.detail) {
        return data.detail;
    }

    const messages = [];

    for (const [field, errors] of Object.entries(data)) {
        if (Array.isArray(errors)) {
            messages.push(`${field}: ${errors.join(", ")}`);
        } else if (typeof errors === "string") {
            messages.push(`${field}: ${errors}`);
        }
    }

    return messages.length
        ? messages.join("\n")
        : "Something went wrong. Please try again.";
}

async function readApiResponse(response) {
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        throw new Error(getErrorMessage(data));
    }

    return data;
}


// ================================
// Login
// ================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const username = document.getElementById("username")?.value.trim();
        const password = document.getElementById("password")?.value;

        if (!username || !password) {
            alert("Please enter your username and password.");
            return;
        }

        const submitButton = loginForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch(`${API_BASE}login/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            });

            const data = await readApiResponse(response);

            if (!data.access || !data.refresh) {
                throw new Error("Authentication tokens were not received.");
            }

            localStorage.setItem("rm_access_token", data.access);
            localStorage.setItem("rm_refresh_token", data.refresh);

            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Login error:", error);
            alert(error.message || "Login failed. Please try again.");

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}


// ================================
// Registration
// ================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {
    registerForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const fullName =
            document.getElementById("name")?.value.trim();

        const username =
            document.getElementById("username")?.value.trim();

        const email =
            document.getElementById("registerEmail")?.value.trim();

        const university =
            document.getElementById("university")?.value.trim();

        const department =
            document.getElementById("department")?.value.trim();

        const password =
            document.getElementById("registerPassword")?.value;

        const confirmPassword =
            document.getElementById("confirmPassword")?.value;

        if (
            !fullName ||
            !username ||
            !email ||
            !university ||
            !department ||
            !password ||
            !confirmPassword
        ) {
            alert("Please fill in all fields.");
            return;
        }

        if (password !== confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        const submitButton = registerForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (submitButton) {
            submitButton.disabled = true;
        }

        try {
            const response = await fetch(`${API_BASE}register/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    email: email,
                    password: password,
                    full_name: fullName,
                    university: university,
                    department: department
                })
            });

            await readApiResponse(response);

            alert("Registration successful! Please log in.");

            window.location.href = "index.html";

        } catch (error) {
            console.error("Registration error:", error);
            alert(error.message || "Registration failed. Please try again.");

        } finally {
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    });
}
