import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "@fontsource/press-start-2p";
import App from "./App";
import { ToastProvider } from "./components/Toast";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
