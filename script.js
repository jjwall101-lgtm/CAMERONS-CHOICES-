document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "cameronCoinsAppDataV1";
  const GREEN_REWARD = 50;
  const GOAL = 1000;

  const messages = {
    red: {
      emoji: "🔴",
      main: "RED: OOPS LEVEL",
      sub: "Today was hard. No green coins today, but tomorrow is a brand new level."
    },
    amber: {
      emoji: "🟡",
      main: "AMBER: TRYING LEVEL",
      sub: "Today had good moments and tricky moments. Keep going!"
    },
    green: {
      emoji: "⭐",
      main: "GREEN: SUPER LEVEL",
      sub: "Super effort today. 50 coins earned!"
    }
  };

  const appStatus = document.getElementById("appStatus");
  const coinTotalTop = document.getElementById("coinTotalTop");
  const coinTotalMain = document.getElementById("coinTotalMain");
  const coinProgress = document.getElementById("coinProgress");
  const treatCard = document.getElementById("treatCard");

  const redLight = document.getElementById("redLight");
  const amberLight = document.getElementById("amberLight");
  const greenLight = document.getElementById("greenLight");
  const redLabel = document.getElementById("redLabel");
  const amberLabel = document.getElementById("amberLabel");
  const greenLabel = document.getElementById("greenLabel");

  const deduct10Button = document.getElementById("deduct10Button");
  const deduct50Button = document.getElementById("deduct50Button");
  const add50Button = document.getElementById("add50Button");
  const resetCoinsButton = document.getElementById("resetCoinsButton");
  const resetTodayButton = document.getElementById("resetTodayButton");
  const clearHistoryButton = document.getElementById("clearHistoryButton");

  function getToday() {
    return new Date().toLocaleDateString("en-GB");
  }

  function getData() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      return {
        coinTotal: Number(saved?.coinTotal) || 0,
        history: Array.isArray(saved?.history) ? saved.history : []
      };
    } catch {
      return {
        coinTotal: 0,
        history: []
      };
    }
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function clampCoins(amount) {
    return Math.max(0, Number(amount) || 0);
  }

  function addHistoryEntry(data, entry) {
    data.history.unshift(entry);
    data.history = data.history.slice(0, 120);
  }

  function setDay(colour) {
    const today = getToday();
    const data = getData();

    const existingToday = data.history.find(item => item.type === "day" && item.date === today);
    const alreadyHadGreenToday = existingToday?.colour === "green";

    let coinChange = 0;

    if (colour === "green" && !alreadyHadGreenToday) {
      coinChange = GREEN_REWARD;
    }

    if (colour !== "green" && alreadyHadGreenToday) {
      coinChange = -GREEN_REWARD;
    }

    data.coinTotal = clampCoins(data.coinTotal + coinChange);

    data.history = data.history.filter(item => !(item.type === "day" && item.date === today));

    addHistoryEntry(data, {
      type: "day",
      date: today,
      colour,
      text: messages[colour].main,
      emoji: messages[colour].emoji,
      coinChange,
      coinsAfter: data.coinTotal,
      savedAt: new Date().toISOString()
    });

    saveData(data);
    updateDisplay();
  }

  function resetToday() {
    const today = getToday();
    const data = getData();

    const existingToday = data.history.find(item => item.type === "day" && item.date === today);

    if (existingToday?.colour === "green") {
      data.coinTotal = clampCoins(data.coinTotal - GREEN_REWARD);
    }

    data.history = data.history.filter(item => !(item.type === "day" && item.date === today));

    addHistoryEntry(data, {
      type: "note",
      date: today,
      text: "Today reset",
      emoji: "↩️",
      coinChange: existingToday?.colour === "green" ? -GREEN_REWARD : 0,
      coinsAfter: data.coinTotal,
      savedAt: new Date().toISOString()
    });

    saveData(data);
    updateDisplay();
  }

  function adjustCoins(amount, reason) {
    const data = getData();

    const oldTotal = data.coinTotal;
    data.coinTotal = clampCoins(data.coinTotal + amount);
    const actualChange = data.coinTotal - oldTotal;

    addHistoryEntry(data, {
      type: "coins",
      date: getToday(),
      text: reason,
      emoji: actualChange >= 0 ? "🪙" : "➖",
      coinChange: actualChange,
      coinsAfter: data.coinTotal,
      savedAt: new Date().toISOString()
    });

    saveData(data);
    updateDisplay();
  }

  function resetCoins() {
    const data = getData();

    const oldTotal = data.coinTotal;
    data.coinTotal = 0;

    addHistoryEntry(data, {
      type: "coins",
      date: getToday(),
      text: "Coin total reset",
      emoji: "🔄",
      coinChange: -oldTotal,
      coinsAfter: 0,
      savedAt: new Date().toISOString()
    });

    saveData(data);
    updateDisplay();
  }

  function clearHistory() {
    const confirmed = confirm("Clear the saved history? Coin total will stay the same.");

    if (!confirmed) {
      return;
    }

    const data = getData();
    data.history = [];

    saveData(data);
    updateDisplay();
  }

  function updateDisplay() {
    const today = getToday();
    const data = getData();
    const todayEntry = data.history.find(item => item.type === "day" && item.date === today);

    document.querySelectorAll(".light").forEach(light => {
      light.classList.remove("active");
    });

    if (todayEntry) {
      const activeLight = document.querySelector("." + todayEntry.colour);

      if (activeLight) {
        activeLight.classList.add("active");
      }

      document.getElementById("message").textContent = messages[todayEntry.colour].main;
      document.getElementById("subMessage").textContent = messages[todayEntry.colour].sub;
    } else {
      document.getElementById("message").textContent = "TAP A LIGHT TO CHOOSE TODAY";
      document.getElementById("subMessage").textContent = "Green earns 50 coins. Reach 1000 coins for a special treat.";
    }

    coinTotalTop.textContent = data.coinTotal;
    coinTotalMain.textContent = data.coinTotal;

    const progress = Math.min(100, (data.coinTotal / GOAL) * 100);
    coinProgress.style.width = `${progress}%`;

    if (data.coinTotal >= GOAL) {
      treatCard.classList.add("show");
    } else {
      treatCard.classList.remove("show");
    }

    updateHistoryList(data.history);
  }

  function formatCoinChange(value) {
    if (!value) {
      return "0 coins";
    }

    return value > 0 ? `+${value} coins` : `${value} coins`;
  }

  function updateHistoryList(history) {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = "";

    if (!history || history.length === 0) {
      historyList.innerHTML = "<p class='empty-history'>No saved history yet.</p>";
      return;
    }

    history.forEach(item => {
      const div = document.createElement("div");
      div.className = "history-item";

      const coinText = formatCoinChange(item.coinChange);
      const totalText = `Total: ${item.coinsAfter ?? 0}`;

      div.textContent = `${item.emoji || ""} ${item.date} - ${item.text} - ${coinText} - ${totalText}`;

      historyList.appendChild(div);
    });
  }

  function connectButtons() {
    redLight.addEventListener("click", () => setDay("red"));
    amberLight.addEventListener("click", () => setDay("amber"));
    greenLight.addEventListener("click", () => setDay("green"));

    redLabel.addEventListener("click", () => setDay("red"));
    amberLabel.addEventListener("click", () => setDay("amber"));
    greenLabel.addEventListener("click", () => setDay("green"));

    deduct10Button.addEventListener("click", () => adjustCoins(-10, "10 coins deducted"));
    deduct50Button.addEventListener("click", () => adjustCoins(-50, "50 coins deducted"));
    add50Button.addEventListener("click", () => adjustCoins(50, "50 coins added manually"));
    resetCoinsButton.addEventListener("click", resetCoins);

    resetTodayButton.addEventListener("click", resetToday);
    clearHistoryButton.addEventListener("click", clearHistory);
  }

  try {
    connectButtons();
    updateDisplay();

    appStatus.textContent = "Buttons ready - saved on this phone";
    appStatus.classList.add("ready");
  } catch (error) {
    console.error(error);
    appStatus.textContent = "Button error - check script.js upload";
    appStatus.classList.add("error");
  }
});
