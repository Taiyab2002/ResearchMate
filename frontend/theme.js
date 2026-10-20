(() => {
  const themes = [
    { id: "dark", label: "Dark Futuristic" },
    { id: "light", label: "Light Premium" },
    { id: "hybrid", label: "Hybrid" }
  ];
  const saved = localStorage.getItem("researchmate-theme") || "hybrid";
  document.documentElement.dataset.theme = themes.some(t => t.id === saved) ? saved : "hybrid";
  const addSwitcher = () => {
    if (document.querySelector(".rm-theme-switcher")) return;
    const wrap = document.createElement("div");
    wrap.className = "rm-theme-switcher";
    wrap.innerHTML = '<span class="rm-theme-label">THEME</span><select aria-label="Choose interface theme"><option value="dark">◈ Dark Futuristic</option><option value="light">☼ Light Premium</option><option value="hybrid">◐ Hybrid</option></select>';
    const select = wrap.querySelector("select");
    select.value = document.documentElement.dataset.theme;
    select.addEventListener("change", () => {
      document.documentElement.dataset.theme = select.value;
      localStorage.setItem("researchmate-theme", select.value);
    });
    document.body.appendChild(wrap);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", addSwitcher);
  else addSwitcher();
})();