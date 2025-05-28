import ProgressBar from "./routes/ProgressBar";
import Day from "./routes/Day";
import Settings from "./routes/BarSettings";
import CategorySettings from "./routes/CategorySettings";
import RangeView from "./routes/Range-view";
import Login from "./routes/Login";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    // Query Defaults
    queries: {
      staleTime: 1000 * 60 * 60 * 24, // Stale after a day
    },
    // Mutation Defaults
    mutations: {
      retry: 0,
      onError: (error, variables, context) => {
        console.error("Mutation failed:", error);
      },
      onSuccess: (data, variables, context) => {
        console.log("Mutation successful:", data);
      },
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}

export default App;
