import "./index-output.css";
import ProgressBar from "./routes/ProgressBar";
import Day from "./routes/Day";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import { AuthProvider } from "./hooks/useAuth";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProgressBar />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/day-view" element={<Day />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
