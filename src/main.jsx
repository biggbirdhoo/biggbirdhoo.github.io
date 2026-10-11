import "@fontsource/caveat/500.css";
import "@fontsource/caveat/700.css";
import "@fontsource/zcool-kuaile/400.css";
import { createRoot } from "react-dom/client";
import "./index.scss";
import App from "./App.jsx";
import { BrowserRouter } from "react-router";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);
