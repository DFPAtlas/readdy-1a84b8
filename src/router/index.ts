import { useNavigate, useRoutes, type NavigateFunction } from "react-router-dom";
import { createElement, Fragment, useEffect } from "react";
import { CookieConsentBanner } from "@/components/feature/CookieConsentBanner";
import { ErrorBoundary } from "@/components/base/ErrorBoundary";
import routes from "./config";

let navigateResolver: (navigate: ReturnType<typeof useNavigate>) => void;

declare global {
  interface Window {
    REACT_APP_NAVIGATE: ReturnType<typeof useNavigate>;
  }
}

export const navigatePromise = new Promise<NavigateFunction>((resolve) => {
  navigateResolver = resolve;
});

export function AppRoutes() {
  const navigate = useNavigate();
  const element = useRoutes(routes);

  useEffect(() => {
    window.REACT_APP_NAVIGATE = navigate;
    navigateResolver(navigate);
  });

  return createElement(
    ErrorBoundary,
    null,
    createElement(Fragment, null, createElement(CookieConsentBanner), element),
  );
}