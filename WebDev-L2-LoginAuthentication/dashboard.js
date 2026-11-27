
// =========================================
// AUTHVERSE - USER DASHBOARD
// =========================================

import { auth } from "./firebase-config.js";

import {

    onAuthStateChanged,
    signOut,
    updateProfile,
    sendPasswordResetEmail,
    reload

} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";


// =========================================
// DOM ELEMENTS
// =========================================

const $ = id => document.getElementById(id);

const profileModal = $("editProfileModal");

let toastTimer;
let currentUser = null;


// =========================================
// NOTIFICATIONS
// =========================================

function notify(message, type = "info") {

    $("toastMessage").textContent = message;

    $("toast").className = `toast ${type} show`;

    $("toastIcon").className =

        type === "success"
        ? "fa-solid fa-circle-check"

        : type === "error"
        ? "fa-solid fa-circle-exclamation"

        : "fa-solid fa-circle-info";

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        $("toast").classList.remove("show");

    }, 4500);

}


// =========================================
// FORMAT ACCOUNT DATES
// =========================================

function formatDate(value) {

    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

        return "Not available";

    }

    return date.toLocaleString(undefined, {

        day: "numeric",

        month: "short",

        year: "numeric",

        hour: "numeric",

        minute: "2-digit"

    });

}


// =========================================
// GET AUTHENTICATION PROVIDER
// =========================================

function getProvider(user) {

    const providers = user.providerData.map(
        provider => provider.providerId
    );

    const names = {

        "google.com": "Google",

        "password": "Email / Password",

        "phone": "Phone",

        "github.com": "GitHub"

    };

    return providers.map(
        provider => names[provider] || provider
    ).join(", ") || "Firebase";

}


// =========================================
// DISPLAY USER INFORMATION
// =========================================

function displayUser(user) {

    const name = user.displayName || "User";

    $("userName").textContent = name;

    $("fullName").textContent = name;

    $("userEmail").textContent =
        user.email || "Not available";

    $("userId").textContent = user.uid;

    $("emailStatus").textContent =
        user.emailVerified
            ? "Verified"
            : "Not Verified";

    $("verificationStatus").textContent =
        user.emailVerified
            ? "Verified"
            : "Not Verified";

    $("loginProvider").textContent =
        getProvider(user);

    $("accountCreated").textContent =
        formatDate(user.metadata.creationTime);

    $("lastLogin").textContent =
        formatDate(user.metadata.lastSignInTime);

    $("editName").value =
        user.displayName || "";

    const avatar = $("profileAvatar");

    avatar.textContent = "";

    if (user.photoURL) {

        const image = document.createElement("img");

        image.src = user.photoURL;

        image.alt = "Profile picture";

        image.referrerPolicy = "no-referrer";

        image.addEventListener("error", () => {

            avatar.textContent =
                name.charAt(0).toUpperCase();

        });

        avatar.appendChild(image);

    } else {

        avatar.textContent =
            name.charAt(0).toUpperCase();

    }

    // Password reset applies to password accounts.

    const hasPassword = user.providerData.some(
        provider => provider.providerId === "password"
    );

    $("resetPasswordButton").disabled =
        !hasPassword || !user.email;

    $("resetPasswordButton").title = hasPassword
        ? ""
        : "Manage your password through your sign-in provider.";

}


// =========================================
// CHECK AUTHENTICATION STATE
// =========================================

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.replace("index.html");

        return;

    }

    try {

        await reload(user);

        if (!user.emailVerified) {

            window.location.replace("index.html");

            return;

        }

        currentUser = user;

        displayUser(user);

        $("dashboardLoading").hidden = true;

        $("dashboardContent").hidden = false;

    } catch (error) {

        console.error(error.code || error.message);

        $("dashboardContent").hidden = true;

        $("dashboardLoading").hidden = true;

        alert(
            "Unable to verify your session. " +
            "Please sign in again."
        );

        await signOut(auth).catch(() => {});

        window.location.replace("index.html");

    }

});


// =========================================
// LOGOUT
// =========================================

async function logout() {

    const confirmed = confirm(
        "Are you sure you want to sign out?"
    );

    if (!confirmed) return;

    $("logoutButton").disabled = true;

    $("securityLogout").disabled = true;

    try {

        await signOut(auth);

        window.location.replace("index.html");

    } catch (error) {

        notify(
            "Unable to sign out. Please try again.",
            "error"
        );

        $("logoutButton").disabled = false;

        $("securityLogout").disabled = false;

    }

}

$("logoutButton").addEventListener(
    "click", logout
);

$("securityLogout").addEventListener(
    "click", logout
);


// =========================================
// EDIT PROFILE
// =========================================

$("editProfileButton").addEventListener(
    "click",
    () => {

        if (!currentUser) return;

        $("editName").value =
            currentUser.displayName || "";

        profileModal.showModal();

    }
);

$("closeProfileModal").addEventListener(
    "click",
    () => {

        profileModal.close();

    }
);

$("editProfileForm").addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        const name = $("editName").value.trim();

        if (!name || !currentUser) return;

        const button =
            event.target.querySelector(
                "button[type='submit']"
            );

        button.disabled = true;

        try {

            await updateProfile(currentUser, {

                displayName: name

            });

            displayUser(currentUser);

            profileModal.close();

            notify(
                "Profile updated successfully!",
                "success"
            );

        } catch (error) {

            profileModal.close();

            notify(
                "Unable to update your profile.",
                "error"
            );

        } finally {

            button.disabled = false;

        }

    }
);


// =========================================
// COPY USER ID
// =========================================

$("copyUserId").addEventListener(
    "click",
    async () => {

        if (!currentUser) return;

        try {

            await navigator.clipboard.writeText(
                currentUser.uid
            );

            notify(
                "User ID copied!",
                "success"
            );

        } catch (error) {

            notify(
                "Unable to copy User ID.",
                "error"
            );

        }

    }
);


// =========================================
// RESET PASSWORD
// =========================================

$("resetPasswordButton").addEventListener(
    "click",
    async () => {

        if (!currentUser?.email) return;

        const confirmed = confirm(

            "Send a password reset link to " +

            currentUser.email + "?"

        );

        if (!confirmed) return;

        const button = $("resetPasswordButton");

        button.disabled = true;

        try {

            await sendPasswordResetEmail(

                auth,

                currentUser.email

            );

            notify(

                "Password reset link sent. Check your email.",

                "success"

            );

        } catch (error) {

            notify(

                "Unable to send the reset link. Try again later.",

                "error"

            );

        } finally {

            button.disabled = false;

        }

    }
);
