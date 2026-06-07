import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { PaperModeProvider } from "./contexts/PaperModeContext";
import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { DashboardPage } from "./pages/Dashboard";
import { StrategiesPage } from "./pages/Strategies";
import { StrategyCreatePage } from "./pages/StrategyCreate";
import { StrategyEditPage } from "./pages/StrategyEdit";
import { TradesPage } from "./pages/Trades";
import { AnalyticsPage } from "./pages/Analytics";
import { BacktestPage } from "./pages/Backtest";
import { AuditLogPage } from "./pages/AuditLog";
import { NewsCalendarPage } from "./pages/NewsCalendar";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-400">
        Loading...
      </div>
    );
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center text-surface-400">
        Loading...
      </div>
    );
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/strategies"
        element={
          <ProtectedRoute>
            <StrategiesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/strategies/new"
        element={
          <ProtectedRoute>
            <StrategyCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/strategies/:id/edit"
        element={
          <ProtectedRoute>
            <StrategyEditPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/trades"
        element={
          <ProtectedRoute>
            <TradesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <AnalyticsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/backtest"
        element={
          <ProtectedRoute>
            <BacktestPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/audit"
        element={
          <ProtectedRoute>
            <AuditLogPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/news"
        element={
          <ProtectedRoute>
            <NewsCalendarPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <PaperModeProvider>
            <AppRoutes />
          </PaperModeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
