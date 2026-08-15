"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    setIsLight(document.documentElement.classList.contains("light"));
  }, []);

  function toggle() {
    const next = !isLight;
    setIsLight(next);
    document.documentElement.classList.toggle("light", next);
    localStorage.setItem("igTheme", next ? "light" : "dark");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-sm"
    >
      {isLight ? "🌙" : "☀️"}
    </button>
  );
}
