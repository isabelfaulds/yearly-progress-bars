import React from "react";
import "firebase/auth";
import {
  signInWithRedirect,
  signInWithPopup,
  GoogleAuthProvider,
  getRedirectResult,
  browserLocalPersistence,
  onAuthStateChanged,
  setPersistence,
} from "firebase/auth";
import { app, auth } from "../firebase.js";

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.email");
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.profile");
googleProvider.addScope("openid");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/tasks.readonly");

const currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("user logged in");
    currentUser = user.email;
  } else {
    console.log("none logged in");
  }
});

const handleGoogleSignIn = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result) {
      const user_token_data_log_response = await fetch(
        import.meta.env.VITE_API_GATEWAY_USER_TOKEN,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: result.user.email,
            token: result._tokenResponse.oauthAccessToken,
            refresh_token: result._tokenResponse.refreshToken,
          }),
        }
      );
    }
  } catch (error) {
    console.log("Error signing in:", error);
  }
};

const Login = () => {
  return (
    <div className="bg-[#f2f5f4] bg-cover bg-center w-screen min-h-screen m-0 flex flex-col items-start pt-10 pl-1 sm:pt-12 sm:pl-20 px-4 sm:px-20">
      Do More with Progress Bars Personal Assistant
      <p> • Manage time with time usage analysis </p>
      <p> • Intelligent event categorization </p>
      <p> • Sync daily journals </p>
      <button
        onClick={handleGoogleSignIn()}
        className="ml-5 mt-6 p-3 text-gray rounded-full rounded-full shadow-lg focus:outline-none hover:border-2"
      >
        Sign In with Google
      </button>
    </div>
  );
};

export default Login;
