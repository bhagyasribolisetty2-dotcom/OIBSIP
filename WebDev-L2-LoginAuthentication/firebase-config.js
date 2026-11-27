
// =========================================
// AUTHVERSE - FIREBASE CONFIGURATION
// =========================================

import { initializeApp }
from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";

import { getAuth, GoogleAuthProvider }
from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";

// Your Firebase Configuration

const firebaseConfig = {

    apiKey: "AIzaSyAuFS5jmO-ZiCPPrZChSem8LA8L2ECviWM",

    authDomain: "authverse-a84dd.firebaseapp.com",

    projectId: "authverse-a84dd",

    storageBucket: "authverse-a84dd.firebasestorage.app",

    messagingSenderId: "196574968166",

    appId: "1:196574968166:web:58e4e9309b83ea2d9430a7"

};

// Initialize Firebase

const app = initializeApp(firebaseConfig);

// Initialize Authentication

const auth = getAuth(app);

// Initialize Google Authentication

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({

    prompt: "select_account"

});

// Export Firebase Services

export { app, auth, googleProvider };
