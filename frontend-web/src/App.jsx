import "./index-output.css";
import ProgressBar from "./ProgressBar";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import Day from "./routes/Day";
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
          <Route path="/day" element={<Day />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
