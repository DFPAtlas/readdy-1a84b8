import { useNavigate, type NavigateFunction } from "react-router-dom";
import { createBrowserRouter, Outlet } from "react-router-dom";
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

function RouteFrame() {
  const navigate = useNavigate();
  useEffect(() => {
    window.REACT_APP_NAVIGATE = navigate;
    navigateResolver(window.REACT_APP_NAVIGATE);
  });
  return createElement(ErrorBoundary, null, createElement(Fragment, null, createElement(CookieConsentBanner), createElement(Outlet)));
}

export const appRouter = createBrowserRouter([{ element: createElement(RouteFrame), children: routes }], { basename: __BASE_PATH__ });
