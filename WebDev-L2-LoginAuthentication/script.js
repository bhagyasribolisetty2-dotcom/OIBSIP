
// =========================================
// AUTHVERSE - AUTHENTICATION SYSTEM
// =========================================

import { auth, googleProvider }
from "./firebase-config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    sendPasswordResetEmail,
    sendEmailVerification,
    updateProfile,
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    reload
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";


// =========================================
// DOM ELEMENTS
// =========================================

const $ = id => document.getElementById(id);

const authContainer = $("authContainer");

const loginForm = $("loginForm");
const registerForm = $("registerForm");

const loginPanel = $("loginPanel");
const registerPanel = $("registerPanel");

const loginWelcome = $("loginWelcome");
const registerWelcome = $("registerWelcome");

const forgotModal = $("forgotPasswordModal");
const verificationModal = $("verificationModal");

let toastTimer;
let busy = false;


// =========================================
// LOGIN AND SIGN UP ANIMATION
// =========================================

function showRegister() {

    authContainer.classList.add("active");

    loginPanel.inert = true;
    loginWelcome.inert = true;

    registerPanel.inert = false;
    registerWelcome.inert = false;

}

function showLogin() {

    authContainer.classList.remove("active");

    loginPanel.inert = false;
    loginWelcome.inert = false;

    registerPanel.inert = true;
    registerWelcome.inert = true;

}

$("showRegister").addEventListener(
    "click", showRegister
);

$("showLogin").addEventListener(
    "click", showLogin
);


// =========================================



// =========================================
// TOAST NOTIFICATIONS
// =========================================

function notify(message, type = "info") {

    const toast = $("toast");

    $("toastMessage").textContent = message;

    toast.className = `toast ${type} show`;

    $("toastIcon").className =
        type === "success"
        ? "fa-solid fa-circle-check"
        : type === "error"
        ? "fa-solid fa-circle-exclamation"
        : "fa-solid fa-circle-info";

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {

        toast.classList.remove("show");

    }, 4500);

}


// =========================================
// LOADING ANIMATION
// =========================================

function setLoading(status) {

    busy = status;

    $("loadingOverlay").hidden = !status;

    document.querySelectorAll(
        "button[type='submit'], " +
        "#googleLogin, #googleRegister, " +
        "#checkVerification, " +
        "#resendVerification, #verificationLogout"
    ).forEach(button => {

        button.disabled = status;

    });

}


// =========================================
// PASSWORD STRENGTH INDICATOR
// =========================================

$("registerPassword").addEventListener(
    "input",
    event => {

        const password = event.target.value;

        const bar = $("strengthBar");
        const text = $("strengthText");

        let score = 0;

        if (password.length >= 8) score++;

        if (password.length >= 12) score++;

        if (/[A-Z]/.test(password)) score++;

        if (/[a-z]/.test(password)) score++;

        if (/[0-9]/.test(password)) score++;

        if (/[^A-Za-z0-9]/.test(password)) score++;

        if (!password) {

            bar.style.width = "0%";

            text.textContent =
                "Use at least 8 characters";

            text.style.color = "var(--muted)";

            return;

        }

        bar.style.width = `${score / 6 * 100}%`;

        if (password.length < 8 || score <= 2) {

            bar.style.background = "#ff5577";

            text.textContent = "Weak password";

            text.style.color = "#ff5577";

        } else if (score <= 4) {

            bar.style.background = "#ffbf47";

            text.textContent = "Medium password";

            text.style.color = "#ffbf47";

        } else {

            bar.style.background = "#43e69a";

            text.textContent = "Strong password";

            text.style.color = "#43e69a";

        }

    }
);


// =========================================
// FIREBASE ERROR MESSAGES
// =========================================

function getErrorMessage(error) {

    console.error(error.code || error.message);

    const messages = {

        "auth/invalid-email":
            "Please enter a valid email address.",

        "auth/email-already-in-use":
            "Unable to create account. Try signing in.",

        "auth/weak-password":
            "Please choose a stronger password.",

        "auth/password-does-not-meet-requirements":
            "Password does not meet the requirements.",

        "auth/user-not-found":
            "Invalid email or password.",

        "auth/wrong-password":
            "Invalid email or password.",

        "auth/invalid-credential":
            "Invalid email or password.",

        "auth/network-request-failed":
            "Check your internet connection.",

        "auth/too-many-requests":
            "Too many attempts. Try again later.",

        "auth/popup-closed-by-user":
            "Google sign-in was cancelled.",

        "auth/popup-blocked":
            "Allow browser popups and try again.",

        "auth/unauthorized-domain":
            "Add this domain to Firebase Authorized Domains.",

        "auth/operation-not-allowed":
            "Enable this sign-in method in Firebase.",

        "auth/invalid-api-key":
            "Check your Firebase configuration.",

        "auth/account-exists-with-different-credential":
            "Sign in using your original sign-in method.",

        "auth/user-disabled":
            "Unable to sign in to this account."

    };

    return messages[error.code]
        || "Something went wrong. Please try again.";

}


// =========================================
// AUTHENTICATION STATE
// =========================================

function handleUser(user) {

    if (!user) {

        if (verificationModal.open) {

            verificationModal.close();

        }

        return;

    }

    if (user.emailVerified) {

        window.location.replace("dashboard.html");

    } else {

        if (!verificationModal.open) {

            verificationModal.showModal();

        }

    }

}

onAuthStateChanged(auth, user => {

    if (!busy) {

        handleUser(user);

    }

});


// =========================================
// CREATE NEW ACCOUNT
// =========================================

registerForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (busy) return;

        const name = $("registerName").value.trim();

        const email = $("registerEmail").value.trim();

        const password = $("registerPassword").value;

        const confirmPassword =
            $("confirmPassword").value;

        if (!name) {

            notify("Please enter your name.", "error");

            return;

        }

        if (password.length < 8) {

            notify(
                "Password must contain at least 8 characters.",
                "error"
            );

            return;

        }

        if (password !== confirmPassword) {

            notify("Passwords do not match.", "error");

            return;

        }

        setLoading(true);

        try {

            await setPersistence(
                auth,
                browserSessionPersistence
            );

            const credential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            await updateProfile(credential.user, {

                displayName: name

            });

            await sendEmailVerification(
                credential.user
            );

            registerForm.reset();

            $("strengthBar").style.width = "0%";

            $("strengthText").textContent =
                "Use at least 8 characters";

            $("strengthText").style.color =
                "var(--muted)";

            notify(
                "Account created! Check your email.",
                "success"
            );

        } catch (error) {

            notify(getErrorMessage(error), "error");

        } finally {

            setLoading(false);

            handleUser(auth.currentUser);

        }

    }
);


// =========================================
// LOGIN WITH EMAIL AND PASSWORD
// =========================================

loginForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (busy) return;

        const email = $("loginEmail").value.trim();

        const password = $("loginPassword").value;

        const remember = $("rememberMe").checked;

        setLoading(true);

        try {

            await setPersistence(
                auth,
                remember
                    ? browserLocalPersistence
                    : browserSessionPersistence
            );

            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

            loginForm.reset();

        } catch (error) {

            notify(getErrorMessage(error), "error");

        } finally {

            setLoading(false);

            handleUser(auth.currentUser);

        }

    }
);


// =========================================
// GOOGLE SIGN-IN
// =========================================

async function googleSignIn(remember = false) {

    if (busy) return;

    setLoading(true);

    try {

        await setPersistence(
            auth,
            remember
                ? browserLocalPersistence
                : browserSessionPersistence
        );

        await signInWithPopup(
            auth,
            googleProvider
        );

    } catch (error) {

        notify(getErrorMessage(error), "error");

    } finally {

        setLoading(false);

        handleUser(auth.currentUser);

    }

}

$("googleLogin").addEventListener("click", () => {

    googleSignIn($("rememberMe").checked);

});

$("googleRegister").addEventListener("click", () => {

    googleSignIn(false);

});


// =========================================
// FORGOT PASSWORD POPUP
// =========================================

$("forgotPasswordButton").addEventListener(
    "click",
    () => {

        $("resetEmail").value =
            $("loginEmail").value.trim();

        forgotModal.showModal();

    }
);

$("closeForgotModal").addEventListener(
    "click",
    () => {

        forgotModal.close();

    }
);


// =========================================
// SEND PASSWORD RESET EMAIL
// =========================================

$("forgotPasswordForm").addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        if (busy) return;

        const email = $("resetEmail").value.trim();

        setLoading(true);

        try {

            await sendPasswordResetEmail(
                auth,
                email
            );

            forgotModal.close();

            notify(
                "If an account exists, a reset link has been sent.",
                "success"
            );

        } catch (error) {

            forgotModal.close();

            if (error.code === "auth/user-not-found") {

                notify(
                    "If an account exists, a reset link has been sent.",
                    "success"
                );

            } else {

                notify(
                    getErrorMessage(error),
                    "error"
                );

            }

        } finally {

            setLoading(false);

        }

    }
);


// =========================================
// CHECK EMAIL VERIFICATION
// =========================================

$("checkVerification").addEventListener(
    "click",
    async () => {

        if (busy) return;

        const user = auth.currentUser;

        if (!user) {

            verificationModal.close();

            return;

        }

        setLoading(true);

        try {

            await reload(user);

            if (user.emailVerified) {

                await user.getIdToken(true);

                verificationModal.close();

                window.location.replace(
                    "dashboard.html"
                );

            } else {

                alert(
                    "Your email is not verified yet. " +
                    "Please check your inbox."
                );

            }

        } catch (error) {

            alert(getErrorMessage(error));

        } finally {

            setLoading(false);

        }

    }
);


// =========================================
// RESEND VERIFICATION EMAIL
// =========================================

$("resendVerification").addEventListener(
    "click",
    async () => {

        if (busy || !auth.currentUser) return;

        setLoading(true);

        try {

            await sendEmailVerification(
                auth.currentUser
            );

            alert(
                "Verification email sent. " +
                "Check your inbox and spam folder."
            );

        } catch (error) {

            alert(getErrorMessage(error));

        } finally {

            setLoading(false);

        }

    }
);


// =========================================
// RETURN TO LOGIN
// =========================================

$("verificationLogout").addEventListener(
    "click",
    async () => {

        if (busy) return;

        setLoading(true);

        try {

            await signOut(auth);

            verificationModal.close();

            showLogin();

            notify(
                "Please verify your email before signing in.",
                "info"
            );

        } catch (error) {

            alert(getErrorMessage(error));

        } finally {

            setLoading(false);

        }

    }
);


// Prevent accidental verification dismissal

verificationModal.addEventListener(
    "cancel",
    event => {

        event.preventDefault();

    }
);
