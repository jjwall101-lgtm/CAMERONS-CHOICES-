document.addEventListener("DOMContentLoaded", () => {
  const THEME_KEY = "cameronSelectedTheme";
  const themeSelect = document.getElementById("themeSelect");
  const root = document.documentElement;

  const themeHeaderIcon = document.getElementById("themeHeaderIcon");
  const coinTitle = document.getElementById("coinTitle");
  const todayTitle = document.getElementById("todayTitle");
  const historyTitle = document.getElementById("historyTitle");
  const treatBoxIcon = document.getElementById("treatBoxIcon");
  const treatSubtitle = document.getElementById("treatSubtitle");
  const amberLabelText = document.getElementById("amberLabelText");
  const greenLabelText = document.getElementById("greenLabelText");

  const themeText = {
    mario: {
      header: "⭐ CAMERON",
      coinTitle: "COIN BANK",
      todayTitle: "TODAY'S LEVEL",
      historyTitle: "LEVEL HISTORY",
      treatIcon: "?",
      treatSubtitle: "1000 coins reached!",
      amber: "Trying level",
      green: "+50 coins",
      themeColor: "#4ab7ff"
    },
    space: {
      header: "🚀 CAMERON",
      coinTitle: "SPACE COIN BANK",
      todayTitle: "TODAY'S MISSION",
      historyTitle: "MISSION HISTORY",
      treatIcon: "🚀",
      treatSubtitle: "1000 coins reached! Mission complete!",
      amber: "Orbit mode",
      green: "Launch +50",
      themeColor: "#090b2f"
    },
    minecraft: {
      header: "⛏️ CAMERON",
      coinTitle: "BLOCK BANK",
      todayTitle: "TODAY'S BUILD",
      historyTitle: "BUILD HISTORY",
      treatIcon: "💎",
      treatSubtitle: "1000 coins reached! Diamond reward unlocked!",
      amber: "Crafting",
      green: "Diamond +50",
      themeColor: "#5cae40"
    }
  };

  function applyTheme(theme) {
    const safeTheme = themeText[theme] ? theme : "mario";
    const text = themeText[safeTheme];

    root.setAttribute("data-theme", safeTheme);

    if (themeSelect) themeSelect.value = safeTheme;
    if (themeHeaderIcon) themeHeaderIcon.textContent = text.header;
    if (coinTitle) coinTitle.textContent = text.coinTitle;
    if (todayTitle) todayTitle.textContent = text.todayTitle;
    if (historyTitle) historyTitle.textContent = text.historyTitle;
    if (treatBoxIcon) treatBoxIcon.textContent = text.treatIcon;
    if (treatSubtitle) treatSubtitle.textContent = text.treatSubtitle;
    if (amberLabelText) amberLabelText.textContent = text.amber;
    if (greenLabelText) greenLabelText.textContent = text.green;

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute("content", text.themeColor);

    localStorage.setItem(THEME_KEY, safeTheme);
  }

  const savedTheme = localStorage.getItem(THEME_KEY) || "mario";
  applyTheme(savedTheme);

  if (themeSelect) {
    themeSelect.addEventListener("change", event => {
      applyTheme(event.target.value);
    });
  }
});
