import React, { createContext, useState, useEffect } from "react";
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

const AuthContext = createContext();

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.email");
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.profile");
googleProvider.addScope("openid");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/tasks.readonly");

function getCookieValue(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  // initial set access token
  useEffect(() => {
    const accessToken = getCookieValue("accessToken");
    setIsSignedIn(!!accessToken);
  }, []);

  // sign in func
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result) {
        console.log("result", result);

        const authResponse = await fetch(
          import.meta.env.VITE_API_GATEWAY_USER_TOKEN,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
            body: JSON.stringify({
              userID: result.user.email,
              email: result.user.email,
              token: result._tokenResponse.idToken,
              gapiToken: result._tokenResponse.oauthAccessToken,
              refreshToken: result._tokenResponse.refreshToken,
              datetime: new Date().toISOString(),
              expiresIn: result._tokenResponse.expires_in,
            }),
          }
        );
        if (authResponse.status === 200) {
          setIsSignedIn(true);
          console.log("Auth Login Success");
        } else {
          const errorResponse = await authResponse.text();
          console.error(
            "Auth failed with status:",
            authResponse.status,
            "Response:",
            errorResponse
          );
        }
      }
    } catch (error) {
      console.log("Error signing in:", error);
    }
  };

  // sign out func
  const handleSignOut = async () => {
    const authResponse = await fetch(import.meta.env.VITE_API_GATEWAY_LOGOUT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    if (authResponse) {
      console.log("logout result", authResponse);
    }
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{ isSignedIn, handleGoogleSignIn, handleSignOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return React.useContext(AuthContext);
}
