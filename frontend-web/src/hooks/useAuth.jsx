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

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.email");
googleProvider.addScope("https://www.googleapis.com/auth/userinfo.profile");
googleProvider.addScope("openid");
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
googleProvider.addScope("https://www.googleapis.com/auth/tasks.readonly");

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isSignedIn, setIsSignedIn] = useState(false);

  const checkLoginCookie = async () => {
    try {
      const authCheckResponse = await fetch(
        import.meta.env.VITE_CLOUDFRONT_AUTH_CHECK,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
        }
      );
      if (authCheckResponse.status === 200) {
        setIsSignedIn(true);
      } else {
        setIsSignedIn(false);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
    }
  };

  // initial set access token
  useEffect(() => {
    checkLoginCookie();
  }, []);

  // sign in func
  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result) {
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
          checkLoginCookie();
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

  const handleSignOut = async () => {
    const authResponse = await fetch(import.meta.env.VITE_API_GATEWAY_LOGOUT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });
    setIsSignedIn(false);
  };

  return (
    <AuthContext.Provider
      value={{
        isSignedIn,
        handleGoogleSignIn,
        handleSignOut,
        checkLoginCookie,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return React.useContext(AuthContext);
}
