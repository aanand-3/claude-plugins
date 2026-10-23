import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "./Studio";
import "../styles/tokens.css";
import "../styles/base.css";
import "../styles/components.css";
import "./studio.css";
import "./preview.css";

createRoot(document.getElementById("root")!).render(<StrictMode><Studio /></StrictMode>);
