import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter } from "react-router-dom"; // 👈 هذا هو الأهم لحل مشكلتك
import { WishlistProvider } from "./context/WishlistContext";

import "bootstrap/dist/css/bootstrap.min.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import "./index.css";

const GOOGLE_CLIENT_ID =
  "1071453603250-mk6iico2nr4lqelvibkj9fmgog8jp7ub.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <WishlistProvider>
          <App />
        </WishlistProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
