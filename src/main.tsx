import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import "./i18n";
import "./styles.css";
import { supabase, initialRecovery } from "./lib/supabase";
import { AuthProvider, Protected } from "./app/Auth";
import { Layout } from "./components/Layout";
import { AuthPage } from "./pages/AuthPage";
import { Dashboard } from "./pages/Dashboard";
import { Lessons, CreateLesson } from "./pages/Lessons";
import { Lesson } from "./pages/Lesson";
import { Quiz } from "./pages/Quiz";
import { Results } from "./pages/Results";
import { History } from "./pages/History";
import { Settings } from "./pages/Settings";
const Import = lazy(() =>
  import("./pages/Import").then((m) => ({ default: m.Import })),
);
const Prompt = lazy(() =>
  import("./pages/Prompt").then((m) => ({ default: m.Prompt })),
);
document.documentElement.dataset.theme =
  localStorage.getItem("studylab:theme") || "light";
// Consume authentication fragments before HashRouter can change the URL.
if (supabase) {
  await supabase.auth.getSession();
  if (initialRecovery) location.hash = "/reset-password";
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <Suspense
          fallback={
            <div className="loading" aria-busy="true">
              AI StudyLab…
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<AuthPage mode="login" />} />
            <Route path="/register" element={<AuthPage mode="register" />} />
            <Route
              path="/forgot-password"
              element={<AuthPage mode="forgot" />}
            />
            <Route
              path="/reset-password"
              element={
                <Protected>
                  <AuthPage mode="reset" />
                </Protected>
              }
            />
            <Route
              element={
                <Protected>
                  <Layout />
                </Protected>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="lessons" element={<Lessons />} />
              <Route path="create" element={<CreateLesson />} />
              <Route path="prompt" element={<Prompt />} />
              <Route path="import" element={<Import />} />
              <Route path="lessons/:id" element={<Lesson />} />
              <Route path="quiz/:id" element={<Quiz />} />
              <Route path="results/:id" element={<Results />} />
              <Route path="history" element={<History />} />
              <Route path="notebook" element={<History notebook />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
);
