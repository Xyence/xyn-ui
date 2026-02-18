import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { NotificationsProvider } from "./app/state/notificationsStore";
import "./styles/base.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <NotificationsProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </NotificationsProvider>
  </React.StrictMode>
);
