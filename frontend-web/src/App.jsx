import "./index-output.css";
import ProgressBar from "./routes/ProgressBar";
import Day from "./routes/Day";
import Settings from "./routes/BarSettings";
import CategorySettings from "./routes/CategorySettings";
import RangeView from "./routes/Range-view";

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
          <Route path="/settings" element={<Settings />} />
          <Route path="/day-view/settings" element={<CategorySettings />} />
          <Route path="/login" element={<Login />} />
          <Route path="/day-view" element={<Day />} />
          <Route path="/range-view" element={<RangeView />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
