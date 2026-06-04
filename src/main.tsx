import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ToastProvider } from "./components/Toast";
import { ContextMenuProvider } from "./components/ContextMenu";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ToastProvider>
      <ContextMenuProvider>
        <App />
      </ContextMenuProvider>
    </ToastProvider>
  </React.StrictMode>
);
