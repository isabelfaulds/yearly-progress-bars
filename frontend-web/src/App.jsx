import { useState } from "react";
import "./index-output.css";
import ProgressBar from "./ProgressBar";
import Settings from "./routes/Settings";
import Login from "./routes/Login";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Link, useLocation } from "react-router-dom";

function App() {
  return (
    <Router>
      <div></div>
      <Routes>
        <Route path="/" element={<ProgressBar />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;
