import { BrowserRouter } from "react-router-dom";
import { AppRoutes } from "./router";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";
import { isDemoMode } from "@/demo/demoConfig";
import { DemoDataProvider } from "@/demo/useDemoData";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import { AuthProvider } from "@/context/AuthProvider";
import { ActiveWeddingProvider } from "@/context/ActiveWeddingProvider";
import { CookieConsentBanner } from "@/components/feature/CookieConsentBanner";


function App() {
  if (isDemoMode) {
    return (
      <ErrorBoundary>
        <DemoDataProvider>
          <I18nextProvider i18n={i18n}>
            <AuthProvider>
              <BrowserRouter basename={__BASE_PATH__}>
                <CookieConsentBanner />
                <AppRoutes />
              </BrowserRouter>
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
            <BrowserRouter basename={__BASE_PATH__}>
              <CookieConsentBanner />
              <AppRoutes />
            </BrowserRouter>
          </ActiveWeddingProvider>
        </AuthProvider>
      </I18nextProvider>
    </ErrorBoundary>
  );
}

export default App;