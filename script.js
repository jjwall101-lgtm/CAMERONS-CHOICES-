import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  /*
    FIREBASE SETUP NEEDED

    Replace the values below with your Firebase web app config.

    Firebase Console > Project settings > General > Your apps > Web app
  */
  const firebaseConfig = {
    apiKey: "AIzaSyD6a8UsUhqSZlRV2gs4FUUIGJJBS8kX3wk",
    authDomain: "cameronsapp-9d08a.firebaseapp.com",
    projectId: "cameronsapp-9d08a",
    storageBucket: "cameronsapp-9d08a.firebasestorage.app",
    messagingSenderId: "664203865452",
    appId: "1:664203865452:web:b19f0e1d2ce170503d1749",
    measurementId: "G-DQ3WVXEN1C"
  };

  const FAMILY_RECORD_ID = "cameron-shared-family-app";

  const LOCAL_STORAGE_KEY = "cameronCoinsAppDataV5SyncBackup";
  const OLD_STORAGE_KEYS = [
    "cameronCoinsAppDataV4",
    "cameronCoinsAppDataV3",
    "cameronCoinsAppDataV2",
    "cameronCoinsAppDataV1"
  ];

  const RED_PENALTY = -50;
  const GREEN_REWARD = 50;
  const GOAL = 1000;

  let db = null;
  let appDoc = null;
  let isFirebaseReady = false;
  let currentData = getLocalData();

  const messages = {
    red: {
      emoji: "🔴",
      main: "RED: OOPS LEVEL",
      sub: "Red removes 50 coins when Cameron moves onto red."
    },
    amber: {
      emoji: "🟡",
      main: "AMBER: TRYING LEVEL",
      sub: "Amber is safe. No coins are added or taken away."
    },
    green: {
      emoji: "⭐",
      main: "GREEN: SUPER LEVEL",
      sub: "Amber to green earns 50 coins. Pressing green again adds nothing."
    }
  };

  const syncStatus = document.getElementById("syncStatus");
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

  function firebaseIsConfigured() {
    return !Object.values(firebaseConfig).some(value => String(value).includes("PASTE_YOUR"));
  }

  function setSyncStatus(text, statusClass) {
    syncStatus.textContent = text;
    syncStatus.className = `sync-status ${statusClass}`;
  }

  function getToday() {
    return new Date().toLocaleDateString("en-GB");
  }

  function getLocalData() {
    try {
      let saved = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

      if (!saved) {
        for (const oldKey of OLD_STORAGE_KEYS) {
          const oldSaved = JSON.parse(localStorage.getItem(oldKey));

          if (oldSaved) {
            saved = oldSaved;
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(saved));
            break;
          }
        }
      }

      return normalizeData(saved);
    } catch {
      return normalizeData(null);
    }
  }

  function saveLocalData(data) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalizeData(data)));
  }

  function normalizeData(data) {
    return {
      coinTotal: Math.max(0, Number(data?.coinTotal) || 0),
      history: Array.isArray(data?.history) ? data.history : []
    };
  }

  async function getLatestData() {
    if (!isFirebaseReady || !appDoc) {
      return normalizeData(currentData);
    }

    try {
      const snapshot = await getDoc(appDoc);

      if (snapshot.exists()) {
        return normalizeData(snapshot.data());
      }

      return normalizeData(currentData);
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync read failed - using this phone", "error");
      return normalizeData(currentData);
    }
  }

  async function saveData(data) {
    const cleanData = normalizeData(data);
    currentData = cleanData;
    saveLocalData(cleanData);
    updateDisplay();

    if (!isFirebaseReady || !appDoc) {
      return;
    }

    try {
      await setDoc(appDoc, {
        ...cleanData,
        lastUpdatedAt: new Date().toISOString(),
        serverUpdatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync write failed - saved on this phone", "error");
    }
  }

  function clampCoins(amount) {
    return Math.max(0, Number(amount) || 0);
  }

  function addHistoryEntry(data, entry) {
    data.history.unshift(entry);
    data.history = data.history.slice(0, 200);
  }

  function getTodayEntry(data) {
    const today = getToday();
    return data.history.find(item => item.type === "day" && item.date === today);
  }

  function canMoveToColour(currentColour, newColour) {
    if (currentColour === newColour) {
      return true;
    }

    if (newColour === "green" && currentColour !== "amber") {
      return false;
    }

    return true;
  }

  function showLockedGreenMessage() {
    document.getElementById("message").textContent = "AMBER FIRST";
    document.getElementById("subMessage").textContent = "Cameron needs to go amber before he can move up to green.";
  }

  function getCoinChangeForMove(currentColour, newColour) {
    if (currentColour === "amber" && newColour === "green") {
      return GREEN_REWARD;
    }

    if (currentColour !== "red" && newColour === "red") {
      return RED_PENALTY;
    }

    return 0;
  }

  async function setDay(colour, options = {}) {
    const today = getToday();
    const data = await getLatestData();

    ensureTodayStartsAmberInData(data);

    const existingToday = getTodayEntry(data);
    const currentColour = existingToday?.colour || null;

    if (!options.force && !canMoveToColour(currentColour, colour)) {
      showLockedGreenMessage();
      return;
    }

    const coinChange = options.automatic ? 0 : getCoinChangeForMove(currentColour, colour);

    data.coinTotal = clampCoins(data.coinTotal + coinChange);

    data.history = data.history.filter(item => !(item.type === "day" && item.date === today));

    const previousDailyMoves = Array.isArray(existingToday?.moves) ? existingToday.moves : [];
    const newMove = {
      from: currentColour || "none",
      to: colour,
      coinChange,
      time: new Date().toISOString()
    };

    addHistoryEntry(data, {
      type: "day",
      date: today,
      colour,
      text: messages[colour].main,
      emoji: messages[colour].emoji,
      coinChange: (Number(existingToday?.coinChange) || 0) + coinChange,
      lastMoveCoinChange: coinChange,
      coinsAfter: data.coinTotal,
      moves: [...previousDailyMoves, newMove],
      automatic: options.automatic || false,
      savedAt: new Date().toISOString()
    });

    await saveData(data);
  }

  function ensureTodayStartsAmberInData(data) {
    const today = getToday();
    const existingToday = data.history.find(item => item.type === "day" && item.date === today);

    if (existingToday) {
      return false;
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
      moves: [
        {
          from: "new day",
          to: "amber",
          coinChange: 0,
          time: new Date().toISOString()
        }
      ],
      automatic: true,
      savedAt: new Date().toISOString()
    });

    return true;
  }

  async function ensureTodayStartsAmber() {
    const data = await getLatestData();
    const changed = ensureTodayStartsAmberInData(data);

    if (changed) {
      await saveData(data);
    } else {
      currentData = data;
      saveLocalData(data);
      updateDisplay();
    }
  }

  function scheduleMidnightAmberReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setDate(now.getDate() + 1);
    midnight.setHours(0, 0, 0, 0);

    const msUntilMidnight = midnight.getTime() - now.getTime();

    setTimeout(async () => {
      await ensureTodayStartsAmber();
      scheduleMidnightAmberReset();
    }, msUntilMidnight + 1000);
  }

  async function resetToday() {
    const today = getToday();
    const data = await getLatestData();

    const existingToday = getTodayEntry(data);
    const oldNetCoinChange = Number(existingToday?.coinChange) || 0;

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
      moves: [
        {
          from: existingToday?.colour || "none",
          to: "amber",
          coinChange: -oldNetCoinChange,
          time: new Date().toISOString()
        }
      ],
      automatic: false,
      savedAt: new Date().toISOString()
    });

    await saveData(data);
  }

  async function adjustCoins(amount, reason) {
    const data = await getLatestData();

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

    await saveData(data);
  }

  async function resetCoins() {
    const data = await getLatestData();

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

    await saveData(data);
  }

  async function clearHistory() {
    const confirmed = confirm("Clear the saved history? Coin total will stay the same.");

    if (!confirmed) {
      return;
    }

    const data = await getLatestData();
    data.history = [];

    ensureTodayStartsAmberInData(data);
    await saveData(data);
  }

  function updateDisplay() {
    const data = normalizeData(currentData);
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

      if (todayEntry.lastMoveCoinChange === GREEN_REWARD) {
        document.getElementById("subMessage").textContent = "Amber to green. 50 coins earned!";
      } else if (todayEntry.lastMoveCoinChange === RED_PENALTY) {
        document.getElementById("subMessage").textContent = "Moved onto red. 50 coins lost.";
      } else if (todayEntry.colour === "green") {
        document.getElementById("subMessage").textContent = "Already green. No extra coins added.";
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

  async function startFirebaseSync() {
    if (!firebaseIsConfigured()) {
      isFirebaseReady = false;
      setSyncStatus("Set up Firebase to sync phones", "offline");
      await ensureTodayStartsAmber();
      return;
    }

    try {
      const app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      appDoc = doc(db, "families", FAMILY_RECORD_ID);
      isFirebaseReady = true;

      setSyncStatus("Sync connected", "online");

      const snapshot = await getDoc(appDoc);

      if (!snapshot.exists()) {
        const data = getLocalData();
        ensureTodayStartsAmberInData(data);
        await setDoc(appDoc, {
          ...data,
          lastUpdatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp()
        }, { merge: true });
      }

      onSnapshot(
        appDoc,
        snapshot => {
          if (snapshot.exists()) {
            currentData = normalizeData(snapshot.data());
            saveLocalData(currentData);
            updateDisplay();
            setSyncStatus("Sync connected", "online");
          }
        },
        error => {
          console.error(error);
          setSyncStatus("Sync error - using this phone", "error");
          currentData = getLocalData();
          updateDisplay();
        }
      );

      await ensureTodayStartsAmber();
    } catch (error) {
      console.error(error);
      isFirebaseReady = false;
      setSyncStatus("Sync failed - check Firebase config", "error");
      await ensureTodayStartsAmber();
    }
  }

  try {
    connectButtons();
    updateDisplay();
    startFirebaseSync();
    scheduleMidnightAmberReset();
  } catch (error) {
    console.error(error);
    alert("Button error - check script.js upload");
  }
});
