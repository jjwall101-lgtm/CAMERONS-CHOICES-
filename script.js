document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "cameronCoinsAppDataV3";
  const OLD_STORAGE_KEYS = [
    "cameronCoinsAppDataV2",
    "cameronCoinsAppDataV1"
  ];

  const RED_PENALTY = -50;
  const GREEN_REWARD = 50;
  const GOAL = 1000;

  const messages = {
    red: {
      emoji: "🔴",
      main: "RED: OOPS LEVEL",
      sub: "Today was hard. 50 coins lost, but tomorrow is a brand new level."
    },
    amber: {
      emoji: "🟡",
      main: "AMBER: TRYING LEVEL",
      sub: "Amber is safe. No coins are added or taken away."
    },
    green: {
      emoji: "⭐",
      main: "GREEN: SUPER LEVEL",
      sub: "Super effort today. 50 coins earned!"
    }
  };

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
      let saved = JSON.parse(localStorage.getItem(STORAGE_KEY));

      // Bring older saved data over once, so you don't lose existing coins/history.
      if (!saved) {
        for (const oldKey of OLD_STORAGE_KEYS) {
          const oldSaved = JSON.parse(localStorage.getItem(oldKey));

          if (oldSaved) {
            saved = oldSaved;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
            break;
          }
        }
      }

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
    data.history = data.history.slice(0, 160);
  }

  function getTodayEntry(data) {
    const today = getToday();
    return data.history.find(item => item.type === "day" && item.date === today);
  }

  function getDayNetCoinChange(entry) {
    if (!entry) {
      return 0;
    }

    let total = 0;

    if (entry.greenAwarded) {
      total += GREEN_REWARD;
    }

    if (entry.redPenaltyApplied) {
      total += RED_PENALTY;
    }

    return total;
  }

  function canMoveToColour(currentColour, newColour) {
    if (currentColour === newColour) {
      return true;
    }

    // Cameron must go amber before green.
    // So: no status -> green is blocked. Red -> green is blocked.
    if (newColour === "green" && currentColour !== "amber") {
      return false;
    }

    // Green can go straight to red.
    // Amber is always allowed and does not remove coins.
    return true;
  }

  function showLockedGreenMessage() {
    document.getElementById("message").textContent = "AMBER FIRST";
    document.getElementById("subMessage").textContent = "Cameron needs to go amber before he can move up to green.";
  }

  function setDay(colour, options = {}) {
    const today = getToday();
    const data = getData();
    const existingToday = getTodayEntry(data);
    const currentColour = existingToday?.colour || null;

    if (!options.force && !canMoveToColour(currentColour, colour)) {
      showLockedGreenMessage();
      return;
    }

    let greenAwarded = Boolean(existingToday?.greenAwarded);
    let redPenaltyApplied = Boolean(existingToday?.redPenaltyApplied);
    let coinChange = 0;

    // Amber/orange is neutral. It NEVER takes coins away.
    if (colour === "amber") {
      coinChange = 0;
    }

    // Green adds 50 once per day.
    if (colour === "green" && !greenAwarded) {
      coinChange = GREEN_REWARD;
      greenAwarded = true;
    }

    // Red removes 50 once per day.
    if (colour === "red" && !redPenaltyApplied) {
      coinChange = RED_PENALTY;
      redPenaltyApplied = true;
    }

    data.coinTotal = clampCoins(data.coinTotal + coinChange);

    data.history = data.history.filter(item => !(item.type === "day" && item.date === today));

    addHistoryEntry(data, {
      type: "day",
      date: today,
      colour,
      text: messages[colour].main,
      emoji: messages[colour].emoji,
      coinChange: getDayNetCoinChange({ greenAwarded, redPenaltyApplied }),
      lastMoveCoinChange: coinChange,
      coinsAfter: data.coinTotal,
      greenAwarded,
      redPenaltyApplied,
      automatic: options.automatic || false,
      savedAt: new Date().toISOString()
    });

    saveData(data);
    updateDisplay();
  }

  function ensureTodayStartsAmber() {
    const data = getData();
    const today = getToday();
    const existingToday = data.history.find(item => item.type === "day" && item.date === today);

    if (existingToday) {
      return;
    }

    addHistoryEntry(data, {
      type: "day",
      date: today,
      colour: "amber",
      text: messages.amber.main,
      emoji: messages.amber.emoji,
      coinChange: 0,
      lastMoveCoinChange: 0,
      coinsAfter: data.coinTotal,
      greenAwarded: false,
      redPenaltyApplied: false,
      automatic: true,
      savedAt: new Date().toISOString()
    });

    saveData(data);
  }

  function scheduleMidnightAmberReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(now.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);

    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(() => {
      ensureTodayStartsAmber();
      updateDisplay();
      scheduleMidnightAmberReset();
    }, msUntilMidnight + 1000);
  }

  function resetToday() {
    const today = getToday();
    const data = getData();

    const existingToday = getTodayEntry(data);
    const oldNetCoinChange = getDayNetCoinChange(existingToday);

    // Reset today back to amber and undo today's green/red coin movement.
    data.coinTotal = clampCoins(data.coinTotal - oldNetCoinChange);

    data.history = data.history.filter(item => !(item.type === "day" && item.date === today));

    addHistoryEntry(data, {
      type: "day",
      date: today,
      colour: "amber",
      text: messages.amber.main,
      emoji: messages.amber.emoji,
      coinChange: 0,
      lastMoveCoinChange: -oldNetCoinChange,
      coinsAfter: data.coinTotal,
      greenAwarded: false,
      redPenaltyApplied: false,
      automatic: false,
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
      lastMoveCoinChange: actualChange,
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
      lastMoveCoinChange: -oldTotal,
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

    // After clearing history, put today back to amber.
    ensureTodayStartsAmber();
    updateDisplay();
  }

  function updateDisplay() {
    const data = getData();
    const todayEntry = getTodayEntry(data);

    document.querySelectorAll(".light").forEach(light => {
      light.classList.remove("active");
    });

    if (todayEntry) {
      const activeLight = document.querySelector("." + todayEntry.colour);

      if (activeLight) {
        activeLight.classList.add("active");
      }

      document.getElementById("message").textContent = messages[todayEntry.colour].main;

      if (todayEntry.colour === "amber" && todayEntry.greenAwarded) {
        document.getElementById("subMessage").textContent = "Back on amber. No coins removed.";
      } else {
        document.getElementById("subMessage").textContent = messages[todayEntry.colour].sub;
      }
    } else {
      document.getElementById("message").textContent = "AMBER START";
      document.getElementById("subMessage").textContent = "Each new day starts on amber.";
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
      const autoText = item.automatic ? " - auto" : "";

      div.textContent = `${item.emoji || ""} ${item.date} - ${item.text}${autoText} - ${coinText} - ${totalText}`;

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
    ensureTodayStartsAmber();
    updateDisplay();
    scheduleMidnightAmberReset();
  } catch (error) {
    console.error(error);
    alert("Button error - check script.js upload");
  }
});
