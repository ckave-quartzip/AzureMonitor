import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { ThemeProvider } from "@/components/ThemeProvider";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import ClientDetail from "./pages/ClientDetail";
import Resources from "./pages/Resources";
import Alerts from "./pages/Alerts";
import Incidents from "./pages/Incidents";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import ResourceDetail from "./pages/ResourceDetail";
import AzureOverview from "./pages/AzureOverview";
import AzureResourceDetail from "./pages/AzureResourceDetail";
import AzureHealthIssues from "./pages/AzureHealthIssues";
import AzureCostReport from "./pages/AzureCostReport";
import QueryDetail from "./pages/QueryDetail";
import ApiDocs from "./pages/ApiDocs";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute>
                  <ClientDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources"
              element={
                <ProtectedRoute>
                  <Resources />
                </ProtectedRoute>
              }
            />
            <Route
              path="/resources/:id"
              element={
                <ProtectedRoute>
                  <ResourceDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/azure"
              element={
                <ProtectedRoute>
                  <AzureOverview />
                </ProtectedRoute>
              }
            />
            <Route
              path="/azure/health"
              element={
                <ProtectedRoute>
                  <AzureHealthIssues />
                </ProtectedRoute>
              }
            />
            <Route
              path="/azure/costs"
              element={
                <ProtectedRoute>
                  <AzureCostReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/azure/resources/:id"
              element={
                <ProtectedRoute>
                  <AzureResourceDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/azure/queries/:id"
              element={
                <ProtectedRoute>
                  <QueryDetail />
                </ProtectedRoute>
              }
            />
            <Route
              path="/incidents"
              element={
                <ProtectedRoute>
                  <Incidents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <Admin />
                </ProtectedRoute>
              }
            />
            <Route path="/api-docs" element={<ApiDocs />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
