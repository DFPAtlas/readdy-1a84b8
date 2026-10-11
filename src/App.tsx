import { RouterProvider } from "react-router-dom";
import { appRouter } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { isDemoMode } from "@/demo/demoConfig";
import { DemoDataProvider } from "@/demo/useDemoData";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import { AuthProvider } from "@/context/AuthProvider";
import { ActiveWeddingProvider } from "@/context/ActiveWeddingProvider";



function App() {
  if (isDemoMode) {
    return (
      <ErrorBoundary>
        <DemoDataProvider>
          <I18nextProvider i18n={i18n}>
            <AuthProvider>
              <RouterProvider router={appRouter} />
            </AuthProvider>
          </I18nextProvider>
        </DemoDataProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AuthProvider>
          <ActiveWeddingProvider>
            <RouterProvider router={appRouter} />
          </ActiveWeddingProvider>
        </AuthProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;