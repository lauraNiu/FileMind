import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import App from "./App";
import { initThemeWatcher } from "./lib/theme";
import "./styles/globals.css";

initThemeWatcher();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(17, 19, 26, 0.95)",
            border: "1px solid #2b2f42",
            color: "#f4f5f8",
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>,
);
