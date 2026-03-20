import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import PageNotFound from "./lib/PageNotFound";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import UserNotRegisteredError from "@/components/UserNotRegisteredError";

import AppLayout from "@/components/layout/AppLayout";
import Home from "@/pages/Home";
import Onboarding from "@/pages/Onboarding";
import DataSources from "@/pages/DataSources";
import Datasets from "@/pages/Datasets";
import KPIs from "@/pages/KPIs";
import Dashboards from "@/pages/Dashboards";
import Helios from "@/pages/Helios";

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } =
    useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
            <span className="text-slate-950 font-black text-lg">A</span>
          </div>
          <div className="w-8 h-8 border-2 border-slate-800 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === "user_not_registered") {
      return <UserNotRegisteredError />;
    } else if (authError.type === "auth_required") {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/Home" replace />} />
      <Route path="/Onboarding" element={<Onboarding />} />
      <Route element={<AppLayout />}>
        <Route path="/Home" element={<Home />} />
        <Route path="/DataSources" element={<DataSources />} />
        <Route path="/Datasets" element={<Datasets />} />
        <Route path="/KPIs" element={<KPIs />} />
        <Route path="/Dashboards" element={<Dashboards />} />
        <Route path="/Helios" element={<Helios />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;
