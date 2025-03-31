import "./index-output.css";
import ProgressBar from "./routes/ProgressBar";
import Day from "./routes/Day";
import Settings from "./routes/Settings";
import Login from "./routes/Login";
import { AuthProvider } from "./hooks/useAuth";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import NavButton from "./components/NavButton";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<ProgressBar />} />
          <Route path="/settingss" element={<Settings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/day-view" element={<Day />} />
        </Routes>
        {/* <NavButton /> */}
      </Router>
    </AuthProvider>
  );
}

export default App;
