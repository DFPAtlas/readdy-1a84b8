import { lazy, Suspense } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { isDemoMode } from "@/demo/demoConfig";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import { AuthProvider } from "@/context/AuthProvider";
import { ActiveWeddingProvider } from "@/context/ActiveWeddingProvider";


// The demo dataset is only needed when the build runs in demo mode, so real
// customers never download it.
const DemoDataProvider = lazy(() =>
  import("@/demo/DemoDataProvider").then((module) => ({ default: module.DemoDataProvider })),
);

function App() {
  if (isDemoMode) {
    return (
      <ErrorBoundary>
        <Suspense fallback={null}>
        <DemoDataProvider>
          <I18nextProvider i18n={i18n}>
            <AuthProvider>
              <BrowserRouter basename={__BASE_PATH__}>
                <AppRoutes />
              </BrowserRouter>
            </AuthProvider>
          </I18nextProvider>
        </DemoDataProvider>
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <ActiveWeddingProvider>
            <BrowserRouter basename={__BASE_PATH__}>
              <AppRoutes />
            </BrowserRouter>
          </ActiveWeddingProvider>
        </AuthProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;