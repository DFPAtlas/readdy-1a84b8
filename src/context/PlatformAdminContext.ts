import { createContext, useContext } from "react";
export const PlatformAdminContext = createContext(false);
export const usePlatformAdminAccess = () => useContext(PlatformAdminContext);
