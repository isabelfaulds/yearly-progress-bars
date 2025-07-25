import ProgressBar from "./routes/ProgressBar";
import Day from "./routes/Day";
import Settings from "./routes/BarSettings";
import CategorySettings from "./routes/CategorySettings";
import RangeView from "./routes/Range-view";
import CategoryView from "./routes/Category-view";
import Login from "./routes/Login";
import TermsService from "./routes/about/Terms-Service";
import PrivacyPolicy from "./routes/about/Privacy-Policy";
import CategoriesRoot from "./routes/Categories-root";
import Milestones from "./routes/Milestones";

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./hooks/useAuth";
import { Toaster } from "@/components/ui/sonner.jsx";

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
            <Route path="/categories/settings" element={<CategorySettings />} />
            <Route path="/login" element={<Login />} />
            <Route path="/day-view" element={<Day />} />
            <Route path="/range-view" element={<RangeView />} />
            <Route path="/categories" element={<CategoriesRoot />} />
            <Route path="/milestones" element={<Milestones />} />
            <Route
              path="/categories/:categorySlug"
              element={<CategoryView />}
            />
            <Route path="/about/terms-of-service" element={<TermsService />} />
            <Route path="/about/privacy-policy" element={<PrivacyPolicy />} />
          </Routes>
        </Router>
        <Toaster richColors theme="dark" position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
