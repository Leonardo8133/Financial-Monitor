import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_PREFS, applyPrefsToDocument, readPrefs, resolveTheme, writePrefs } from "./prefs.js";

const PrefsContext = createContext({
  prefs: DEFAULT_PREFS,
  setPref: () => {},
  resolvedTheme: "light",
});

export function PrefsProvider({ children }) {
  const [prefs, setPrefs] = useState(() => readPrefs());
  const [systemDark, setSystemDark] = useState(() => resolveTheme("system") === "dark");

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (event) => setSystemDark(event.matches);
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, []);

  useEffect(() => {
    applyPrefsToDocument(prefs);
    writePrefs(prefs);
  }, [prefs, systemDark]);

  const setPref = useCallback((key, value) => {
    setPrefs((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }, []);

  const resolvedTheme = prefs.theme === "system" ? (systemDark ? "dark" : "light") : prefs.theme;

  const value = useMemo(() => ({ prefs, setPref, resolvedTheme }), [prefs, setPref, resolvedTheme]);
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  return useContext(PrefsContext);
}
