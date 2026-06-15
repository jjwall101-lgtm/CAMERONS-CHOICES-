import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
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

  const LOCAL_STORAGE_KEY = "cameronCoinsAppDataV6SyncBackup";
  const OLD_STORAGE_KEYS = [
    "cameronCoinsAppDataV5SyncBackup",
    "cameronCoinsAppDataV4",
    "cameronCoinsAppDataV3",
    "cameronCoinsAppDataV2",
    "cameronCoinsAppDataV1"
  ];

  const PARENT_PIN_KEY = "cameronParentPinV1";
  const DEFAULT_PARENT_PIN = "1234";
  const LAST_NOTIFICATION_KEY = "cameronLastCoinNotificationV1";
  const NOTE_AUTHOR_KEY = "cameronParentNoteAuthorV1";

  const RED_PENALTY = -50;
  const GREEN_REWARD = 50;
  const GOAL = 1000;

  let db = null;
  let appDoc = null;
  let isFirebaseReady = false;
  let currentData = getLocalData();
  let parentUnlocked = false;
  let notificationsReady = false;
  let currentCelebrationId = "";
  let celebrationTimer = null;

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
  const progressCharacter = document.getElementById("progressCharacter");
  const treatCard = document.getElementById("treatCard");
  const treatBoxIcon = document.getElementById("treatBoxIcon");
  const specialTreatText = document.getElementById("specialTreatText");
  const treatSubtitle = document.getElementById("treatSubtitle");
  const treatResetNote = document.getElementById("treatResetNote");
  const prizeDrop = document.getElementById("prizeDrop");
  const prizeDropIcon = document.getElementById("prizeDropIcon");
  const prizeDropName = document.getElementById("prizeDropName");
  const collectPrizeButton = document.getElementById("collectPrizeButton");

  const streakCount = document.getElementById("streakCount");
  const bestStreak = document.getElementById("bestStreak");
  const streakMessage = document.getElementById("streakMessage");

  const redLight = document.getElementById("redLight");
  const amberLight = document.getElementById("amberLight");
  const greenLight = document.getElementById("greenLight");
  const redLabel = document.getElementById("redLabel");
  const amberLabel = document.getElementById("amberLabel");
  const greenLabel = document.getElementById("greenLabel");

  const deduct10Button = document.getElementById("deduct10Button");
  const deduct50Button = document.getElementById("deduct50Button");
  const add10Button = document.getElementById("add10Button");
  const add50Button = document.getElementById("add50Button");
  const resetCoinsButton = document.getElementById("resetCoinsButton");
  const unlockControlsButton = document.getElementById("unlockControlsButton");
  const lockControlsButton = document.getElementById("lockControlsButton");
  const changePinButton = document.getElementById("changePinButton");
  const resetTodayButton = document.getElementById("resetTodayButton");
  const clearHistoryButton = document.getElementById("clearHistoryButton");
  const enableNotificationsButton = document.getElementById("enableNotificationsButton");
  const notificationStatus = document.getElementById("notificationStatus");

  const parentNotesCard = document.getElementById("parentNotesCard");
  const noteAuthor = document.getElementById("noteAuthor");
  const parentNoteText = document.getElementById("parentNoteText");
  const addParentNoteButton = document.getElementById("addParentNoteButton");
  const parentNotesList = document.getElementById("parentNotesList");

  function firebaseIsConfigured() {
    return !Object.values(firebaseConfig).some(value => String(value).includes("PASTE_YOUR"));
  }

  function setSyncStatus(text, statusClass) {
    if (!syncStatus) return;
    syncStatus.textContent = text;
    syncStatus.className = `sync-status ${statusClass}`;
  }

  function getToday() {
    return new Date().toLocaleDateString("en-GB");
  }

  function getDateISO(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function getYesterdayISO() {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return getDateISO(yesterday);
  }

  function dateTextToISO(dateText) {
    if (!dateText) return "";

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateText)) {
      return dateText;
    }

    const parts = String(dateText).split("/");

    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    return "";
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
    const history = Array.isArray(data?.history) ? data.history : [];

    return {
      coinTotal: Math.max(0, Number(data?.coinTotal) || 0),
      history,
      streak: normalizeStreak(data?.streak, history),
      celebration: normalizeCelebration(data?.celebration),
      parentNotes: normalizeParentNotes(data?.parentNotes)
    };
  }

  function normalizeParentNotes(parentNotes) {
    if (!Array.isArray(parentNotes)) {
      return [];
    }

    return parentNotes
      .filter(note => note && typeof note === "object")
      .map(note => ({
        id: note.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author: String(note.author || "Parent").slice(0, 40),
        text: String(note.text || "").slice(0, 1200),
        dateText: note.dateText || "",
        dateISO: note.dateISO || "",
        savedAt: note.savedAt || ""
      }))
      .filter(note => note.text.trim().length > 0)
      .slice(0, 100);
  }

  function normalizeCelebration(celebration) {
    return {
      active: Boolean(celebration?.active),
      id: celebration?.id || "",
      theme: celebration?.theme || "",
      prizeName: celebration?.prizeName || "",
      prizeEmoji: celebration?.prizeEmoji || "",
      boxIcon: celebration?.boxIcon || "",
      triggeredAt: celebration?.triggeredAt || "",
      completedAt: celebration?.completedAt || ""
    };
  }

  function normalizeStreak(streak, history) {
    if (streak && typeof streak === "object") {
      return {
        current: Math.max(0, Number(streak.current) || 0),
        best: Math.max(0, Number(streak.best) || 0),
        lastGreenDateISO: streak.lastGreenDateISO || ""
      };
    }

    return buildStreakFromHistory(history);
  }

  function dayReachedGreen(item) {
    if (!item || item.type !== "day") return false;

    if (item.colour === "green") {
      return true;
    }

    if (Array.isArray(item.moves)) {
      return item.moves.some(move => move.to === "green");
    }

    return false;
  }

  function entryToISO(item) {
    return item?.dateISO || dateTextToISO(item?.date);
  }

  function buildStreakFromHistory(history) {
    const greenDays = Array.from(
      new Set(
        history
          .filter(dayReachedGreen)
          .map(entryToISO)
          .filter(Boolean)
      )
    ).sort();

    let current = 0;
    let best = 0;
    let previousDate = null;

    greenDays.forEach(dateISO => {
      if (!previousDate) {
        current = 1;
      } else {
        const previous = new Date(previousDate + "T12:00:00");
        previous.setDate(previous.getDate() + 1);
        current = getDateISO(previous) === dateISO ? current + 1 : 1;
      }

      best = Math.max(best, current);
      previousDate = dateISO;
    });

    const lastGreenDateISO = greenDays[greenDays.length - 1] || "";

    return {
      current,
      best,
      lastGreenDateISO
    };
  }

  function getVisibleStreak(streak) {
    const todayISO = getDateISO();
    const yesterdayISO = getYesterdayISO();

    if (streak.lastGreenDateISO === todayISO || streak.lastGreenDateISO === yesterdayISO) {
      return Math.max(0, Number(streak.current) || 0);
    }

    return 0;
  }

  function updateStreakForGreen(data) {
    data.streak = normalizeStreak(data.streak, data.history);

    const todayISO = getDateISO();
    const yesterdayISO = getYesterdayISO();

    if (data.streak.lastGreenDateISO === todayISO) {
      return false;
    }

    const current = data.streak.lastGreenDateISO === yesterdayISO
      ? getVisibleStreak(data.streak) + 1
      : 1;

    data.streak.current = current;
    data.streak.best = Math.max(Number(data.streak.best) || 0, current);
    data.streak.lastGreenDateISO = todayISO;

    return true;
  }

  function recalculateStreak(data) {
    data.streak = buildStreakFromHistory(data.history || []);
  }

  function getCurrentTheme() {
    return document.documentElement.getAttribute("data-theme") || "mario";
  }

  function getPrizeDetails(themeName = "mario") {
    const prizes = {
      mario: {
        boxIcon: "?",
        prizeEmoji: "🌟",
        prizeName: "SUPER STAR PRIZE!",
        subtitle: "Goal reached! A Super Star drops in!",
        resetNote: "Press collect to reset coins back to 0 for the next run."
      },
      space: {
        boxIcon: "🚀",
        prizeEmoji: "🪐",
        prizeName: "SPACE TROPHY!",
        subtitle: "Mission complete! A space prize drops in!",
        resetNote: "Press collect to reset coins back to 0 for the next mission."
      },
      minecraft: {
        boxIcon: "💎",
        prizeEmoji: "💎",
        prizeName: "DIAMOND PRIZE!",
        subtitle: "Build complete! A diamond prize drops in!",
        resetNote: "Press collect to reset coins back to 0 for the next build."
      }
    };

    return prizes[themeName] || prizes.mario;
  }

  function setTreatTheme(themeName) {
    if (!treatCard) return;

    const prize = getPrizeDetails(themeName);
    treatCard.setAttribute("data-prize-theme", themeName);

    if (treatBoxIcon) treatBoxIcon.textContent = prize.boxIcon;
    if (specialTreatText) specialTreatText.textContent = prize.prizeName;
    if (treatSubtitle) treatSubtitle.textContent = prize.subtitle;
    if (treatResetNote) treatResetNote.textContent = prize.resetNote;
    if (prizeDropIcon) prizeDropIcon.textContent = prize.prizeEmoji;
    if (prizeDropName) prizeDropName.textContent = prize.prizeName;
  }

  function activateCelebration(data, themeName = getCurrentTheme()) {
    if (data.coinTotal < GOAL) {
      return false;
    }

    const prize = getPrizeDetails(themeName);

    data.coinTotal = GOAL;
    data.celebration = {
      active: true,
      id: `celebration-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      theme: themeName,
      prizeName: prize.prizeName,
      prizeEmoji: prize.prizeEmoji,
      boxIcon: prize.boxIcon,
      triggeredAt: new Date().toISOString(),
      completedAt: ""
    };

    addHistoryEntry(data, {
      type: "prize",
      date: getToday(),
      dateISO: getDateISO(),
      text: prize.prizeName + " unlocked",
      emoji: prize.prizeEmoji,
      coinChange: 0,
      lastMoveCoinChange: 0,
      coinsAfter: data.coinTotal,
      savedAt: new Date().toISOString()
    });

    return true;
  }

  async function finishCelebration(celebrationId) {
    if (!celebrationId) return;

    if (celebrationTimer) {
      clearTimeout(celebrationTimer);
      celebrationTimer = null;
    }

    if (!isFirebaseReady || !appDoc) {
      if (currentData.celebration?.active && currentData.celebration.id === celebrationId) {
        const data = normalizeData(currentData);
        const themeName = data.celebration.theme || getCurrentTheme();
        data.coinTotal = 0;
        data.celebration = {
          active: false,
          id: celebrationId,
          theme: themeName,
          prizeName: data.celebration.prizeName || getPrizeDetails(themeName).prizeName,
          prizeEmoji: data.celebration.prizeEmoji || getPrizeDetails(themeName).prizeEmoji,
          boxIcon: data.celebration.boxIcon || getPrizeDetails(themeName).boxIcon,
          triggeredAt: data.celebration.triggeredAt || new Date().toISOString(),
          completedAt: new Date().toISOString()
        };

        addHistoryEntry(data, {
          type: "prize-reset",
          date: getToday(),
          dateISO: getDateISO(),
          text: "Prize collected. Coins reset to 0",
          emoji: "🎁",
          coinChange: -GOAL,
          lastMoveCoinChange: -GOAL,
          coinsAfter: 0,
          savedAt: new Date().toISOString()
        });

        currentCelebrationId = "";
        await saveData(data);
      }

      return;
    }

    try {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(appDoc);

        if (!snapshot.exists()) {
          return;
        }

        const data = normalizeData(snapshot.data());

        if (!data.celebration?.active || data.celebration.id !== celebrationId) {
          return;
        }

        const themeName = data.celebration.theme || getCurrentTheme();
        data.coinTotal = 0;
        data.celebration = {
          active: false,
          id: celebrationId,
          theme: themeName,
          prizeName: data.celebration.prizeName || getPrizeDetails(themeName).prizeName,
          prizeEmoji: data.celebration.prizeEmoji || getPrizeDetails(themeName).prizeEmoji,
          boxIcon: data.celebration.boxIcon || getPrizeDetails(themeName).boxIcon,
          triggeredAt: data.celebration.triggeredAt || new Date().toISOString(),
          completedAt: new Date().toISOString()
        };

        addHistoryEntry(data, {
          type: "prize-reset",
          date: getToday(),
          dateISO: getDateISO(),
          text: "Prize collected. Coins reset to 0",
          emoji: "🎁",
          coinChange: -GOAL,
          lastMoveCoinChange: -GOAL,
          coinsAfter: 0,
          savedAt: new Date().toISOString()
        });

        transaction.set(appDoc, {
          ...data,
          lastUpdatedAt: new Date().toISOString(),
          serverUpdatedAt: serverTimestamp()
        }, { merge: true });
      });
    } catch (error) {
      console.error(error);
      setSyncStatus("Prize reset failed - try again", "error");
    }
  }

  function maybeStartCelebration(data) {
    const celebration = data.celebration || {};

    if (!celebration.active || !celebration.id) {
      if (celebrationTimer) {
        clearTimeout(celebrationTimer);
        celebrationTimer = null;
      }

      currentCelebrationId = "";
      if (prizeDrop) prizeDrop.classList.remove("animate");
      if (treatCard) treatCard.classList.remove("show");
      return;
    }

    const themeName = celebration.theme || getCurrentTheme();
    setTreatTheme(themeName);
    if (treatCard) treatCard.classList.add("show");

    if (currentCelebrationId === celebration.id) {
      return;
    }

    currentCelebrationId = celebration.id;

    if (prizeDrop) {
      prizeDrop.classList.remove("animate");
      void prizeDrop.offsetWidth;
      prizeDrop.classList.add("animate");
    }

    if (celebrationTimer) {
      clearTimeout(celebrationTimer);
      celebrationTimer = null;
    }
  }

  let serviceWorkerRegistration = null;

  function formatNoteDate(date = new Date()) {
    return date.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function loadSavedNoteAuthor() {
    if (!noteAuthor) {
      return;
    }

    noteAuthor.value = localStorage.getItem(NOTE_AUTHOR_KEY) || "";
  }

  function saveNoteAuthorName() {
    if (!noteAuthor) {
      return;
    }

    localStorage.setItem(NOTE_AUTHOR_KEY, noteAuthor.value.trim());
  }

  async function addParentNote() {
    if (!verifyParentPin("add a parent note")) {
      return;
    }

    const author = noteAuthor ? noteAuthor.value.trim() : "";
    const text = parentNoteText ? parentNoteText.value.trim() : "";

    if (!author) {
      alert("Add who wrote the note first.");
      return;
    }

    if (!text) {
      alert("Write a note first.");
      return;
    }

    saveNoteAuthorName();

    const data = await getLatestData();
    const now = new Date();

    data.parentNotes = normalizeParentNotes(data.parentNotes);

    data.parentNotes.unshift({
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      author,
      text,
      dateText: formatNoteDate(now),
      dateISO: getDateISO(now),
      savedAt: now.toISOString()
    });

    data.parentNotes = data.parentNotes.slice(0, 100);

    if (parentNoteText) {
      parentNoteText.value = "";
    }

    await saveData(data);
  }

  async function deleteParentNote(noteId) {
    if (!verifyParentPin("delete this parent note")) {
      return;
    }

    const confirmed = confirm("Delete this parent note?");

    if (!confirmed) {
      return;
    }

    const data = await getLatestData();
    data.parentNotes = normalizeParentNotes(data.parentNotes).filter(note => note.id !== noteId);

    await saveData(data);
  }

  function updateParentNotesDisplay(data) {
    if (!parentNotesList) {
      return;
    }

    if (!parentUnlocked) {
      parentNotesList.innerHTML = "<p class='empty-notes'>Unlock parent controls to view notes.</p>";
      return;
    }

    const notes = normalizeParentNotes(data?.parentNotes);

    if (notes.length === 0) {
      parentNotesList.innerHTML = "<p class='empty-notes'>No parent notes yet.</p>";
      return;
    }

    parentNotesList.innerHTML = "";

    notes.forEach(note => {
      const item = document.createElement("article");
      item.className = "parent-note-item";

      const meta = document.createElement("div");
      meta.className = "parent-note-meta";
      meta.textContent = `${note.dateText || "No date"} - ${note.author}`;

      const text = document.createElement("p");
      text.className = "parent-note-text";
      text.textContent = note.text;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete-note-button";
      deleteButton.textContent = "Delete Note";
      deleteButton.addEventListener("click", () => deleteParentNote(note.id));

      item.appendChild(meta);
      item.appendChild(text);
      item.appendChild(deleteButton);
      parentNotesList.appendChild(item);
    });
  }

  function notificationSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  async function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    try {
      serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js?v=1");
      await navigator.serviceWorker.ready;
      return serviceWorkerRegistration;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function updateNotificationStatus() {
    if (!notificationStatus || !enableNotificationsButton) {
      return;
    }

    if (!notificationSupported()) {
      notificationStatus.textContent = "Notifications are not supported on this phone/browser.";
      enableNotificationsButton.disabled = true;
      return;
    }

    if (Notification.permission === "granted") {
      notificationStatus.textContent = "Notifications are on.";
      enableNotificationsButton.textContent = "Notifications On";
      enableNotificationsButton.disabled = true;
      return;
    }

    if (Notification.permission === "denied") {
      notificationStatus.textContent = "Notifications are blocked in browser settings.";
      enableNotificationsButton.textContent = "Notifications Blocked";
      enableNotificationsButton.disabled = true;
      return;
    }

    notificationStatus.textContent = "Notifications are off.";
    enableNotificationsButton.textContent = "Enable Notifications";
    enableNotificationsButton.disabled = false;
  }

  async function showPhoneNotification(title, options = {}) {
    if (!notificationSupported() || Notification.permission !== "granted") {
      return false;
    }

    try {
      const registration = serviceWorkerRegistration || await navigator.serviceWorker.ready;

      if (!registration || !registration.showNotification) {
        return false;
      }

      await registration.showNotification(title, {
        icon: "icon.png",
        badge: "icon-192.png",
        ...options
      });

      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  async function enableNotifications() {
    if (!notificationSupported()) {
      setupServiceWorker().finally(updateNotificationStatus);
      return;
    }

    try {
      const registration = await setupServiceWorker();

      if (!registration) {
        if (notificationStatus) {
          notificationStatus.textContent = "Could not set up notifications. Refresh and try again.";
        }

        return;
      }

      const permission = await Notification.requestPermission();
      setupServiceWorker().finally(updateNotificationStatus);

      if (permission === "granted") {
        await showPhoneNotification("Cameron notifications enabled", {
          body: "You will be notified when coins are gained or lost.",
          tag: "cameron-notifications-enabled",
          renotify: true
        });
      }
    } catch (error) {
      console.error(error);

      if (notificationStatus) {
        notificationStatus.textContent = "Could not enable notifications. Check Chrome notification settings.";
      }
    }
  }

  function getNotificationId(item) {
    return [
      item.savedAt || "",
      item.date || "",
      item.text || "",
      item.coinChange || 0,
      item.coinsAfter ?? ""
    ].join("|");
  }

  function getLatestCoinChangeItem(history = []) {
    return history.find(item => {
      const coinChange = Number(item?.coinChange) || 0;

      if (coinChange === 0) {
        return false;
      }

      // Do not send a "lost 1000 coins" notification after a prize is collected.
      if (item.type === "prize-reset") {
        return false;
      }

      return true;
    });
  }

  async function maybeSendCoinNotification(data) {
    const latest = getLatestCoinChangeItem(data.history || []);

    if (!latest) {
      return;
    }

    const notificationId = getNotificationId(latest);
    const lastNotificationId = localStorage.getItem(LAST_NOTIFICATION_KEY);

    if (!notificationsReady) {
      localStorage.setItem(LAST_NOTIFICATION_KEY, notificationId);
      notificationsReady = true;
      return;
    }

    if (notificationId === lastNotificationId) {
      return;
    }

    localStorage.setItem(LAST_NOTIFICATION_KEY, notificationId);

    if (!notificationSupported() || Notification.permission !== "granted") {
      return;
    }

    const coinChange = Number(latest.coinChange) || 0;
    const amount = Math.abs(coinChange);
    const title = coinChange > 0
      ? `Cameron gained ${amount} coins`
      : `Cameron lost ${amount} coins`;

    const body = `${latest.text || "Coin total changed"}. Total: ${latest.coinsAfter ?? 0}`;

    await showPhoneNotification(title, {
      body,
      tag: "cameron-coin-change-" + notificationId,
      renotify: true,
      vibrate: [120, 80, 120],
      data: {
        url: "./index.html"
      }
    });
  }

  function getParentPin() {
    return localStorage.getItem(PARENT_PIN_KEY) || DEFAULT_PARENT_PIN;
  }

  function updateLockDisplay() {
    const lockStatus = document.getElementById("lockStatus");
    const unlockControlsButton = document.getElementById("unlockControlsButton");
    const lockControlsButton = document.getElementById("lockControlsButton");

    if (lockStatus) {
      lockStatus.textContent = parentUnlocked
        ? "Parent controls unlocked"
        : "Parent controls locked";

      lockStatus.classList.toggle("unlocked", parentUnlocked);
      lockStatus.classList.toggle("locked", !parentUnlocked);
    }

    if (unlockControlsButton) {
      unlockControlsButton.disabled = parentUnlocked;
    }

    if (lockControlsButton) {
      lockControlsButton.disabled = !parentUnlocked;
    }

    if (parentNotesCard) {
      parentNotesCard.hidden = !parentUnlocked;
    }

    updateParentNotesDisplay(currentData);
  }

  function unlockParentControls(actionText = "use parent controls") {
    if (parentUnlocked) {
      return true;
    }

    const typedPin = prompt(`Parent PIN needed to ${actionText}.`);

    if (typedPin === null) {
      return false;
    }

    if (typedPin === getParentPin()) {
      parentUnlocked = true;
      updateLockDisplay();
      return true;
    }

    alert("Wrong PIN. Parent controls stayed locked.");
    updateLockDisplay();
    return false;
  }

  function lockParentControls() {
    parentUnlocked = false;
    updateLockDisplay();
  }

  function manualUnlockParentControls() {
    unlockParentControls("unlock parent controls");
  }

  function verifyParentPin(actionText) {
    if (parentUnlocked) {
      return true;
    }

    alert("Parent controls are locked. Press Unlock first.");
    return false;
  }

  function changeParentPin() {
    const currentPin = prompt("Enter current parent PIN.");

    if (currentPin === null) {
      return;
    }

    if (currentPin !== getParentPin()) {
      alert("Wrong PIN. The PIN was not changed.");
      return;
    }

    parentUnlocked = true;

    const newPin = prompt("Enter a new parent PIN. Use 4 to 8 numbers.");

    if (newPin === null) {
      return;
    }

    if (!/^\d{4,8}$/.test(newPin)) {
      alert("PIN not changed. Use 4 to 8 numbers only.");
      return;
    }

    const repeatPin = prompt("Enter the new PIN again.");

    if (repeatPin !== newPin) {
      alert("PINs did not match. The PIN was not changed.");
      return;
    }

    localStorage.setItem(PARENT_PIN_KEY, newPin);
    parentUnlocked = true;
    updateLockDisplay();
    alert("Parent PIN changed on this phone.");
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
    data.history = data.history.slice(0, 250);
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
    const todayISO = getDateISO();
    const data = await getLatestData();

    ensureTodayStartsAmberInData(data);

    const existingToday = getTodayEntry(data);
    const currentColour = existingToday?.colour || null;

    if (!options.force && !canMoveToColour(currentColour, colour)) {
      showLockedGreenMessage();
      return;
    }

    const coinChange = options.automatic ? 0 : getCoinChangeForMove(currentColour, colour);

    if (coinChange !== 0 && !verifyParentPin("change Cameron's coins")) {
      return;
    }

    let streakChanged = false;

    if (!options.automatic && colour === "green") {
      streakChanged = updateStreakForGreen(data);
    }

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
      dateISO: todayISO,
      colour,
      text: messages[colour].main,
      emoji: messages[colour].emoji,
      coinChange: (Number(existingToday?.coinChange) || 0) + coinChange,
      lastMoveCoinChange: coinChange,
      coinsAfter: data.coinTotal,
      moves: [...previousDailyMoves, newMove],
      streakAfter: getVisibleStreak(data.streak),
      streakChanged,
      automatic: options.automatic || false,
      savedAt: new Date().toISOString()
    });

    if (data.coinTotal >= GOAL) {
      activateCelebration(data);
    }

    await saveData(data);
  }

  function ensureTodayStartsAmberInData(data) {
    const today = getToday();
    const todayISO = getDateISO();
    const existingToday = data.history.find(item => item.type === "day" && item.date === today);

    if (existingToday) {
      return false;
    }

    addHistoryEntry(data, {
      type: "day",
      date: today,
      dateISO: todayISO,
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
    if (!verifyParentPin("reset today")) {
      return;
    }

    const today = getToday();
    const todayISO = getDateISO();
    const data = await getLatestData();

    const existingToday = getTodayEntry(data);
    const oldNetCoinChange = Number(existingToday?.coinChange) || 0;

    data.coinTotal = clampCoins(data.coinTotal - oldNetCoinChange);
    data.history = data.history.filter(item => !(item.type === "day" && item.date === today));

    addHistoryEntry(data, {
      type: "day",
      date: today,
      dateISO: todayISO,
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

    recalculateStreak(data);
    await saveData(data);
  }

  async function adjustCoins(amount, reason) {
    if (!verifyParentPin("change Cameron's coins")) {
      return;
    }

    const data = await getLatestData();

    const oldTotal = data.coinTotal;
    data.coinTotal = clampCoins(data.coinTotal + amount);
    const actualChange = data.coinTotal - oldTotal;

    addHistoryEntry(data, {
      type: "coins",
      date: getToday(),
      dateISO: getDateISO(),
      text: reason,
      emoji: actualChange >= 0 ? "🪙" : "➖",
      coinChange: actualChange,
      lastMoveCoinChange: actualChange,
      coinsAfter: data.coinTotal,
      savedAt: new Date().toISOString()
    });

    if (data.coinTotal >= GOAL) {
      activateCelebration(data);
    }

    await saveData(data);
  }

  async function resetCoins() {
    if (!verifyParentPin("reset Cameron's coins")) {
      return;
    }

    const confirmed = confirm("Reset Cameron's coins to 0?");

    if (!confirmed) {
      return;
    }

    const data = await getLatestData();

    const oldTotal = data.coinTotal;
    data.coinTotal = 0;

    addHistoryEntry(data, {
      type: "coins",
      date: getToday(),
      dateISO: getDateISO(),
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
    if (!verifyParentPin("clear history")) {
      return;
    }

    const confirmed = confirm("Clear the saved history? Coin total will stay the same.");

    if (!confirmed) {
      return;
    }

    const data = await getLatestData();
    data.history = [];

    ensureTodayStartsAmberInData(data);
    recalculateStreak(data);
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
        const visibleStreak = getVisibleStreak(data.streak);
        document.getElementById("subMessage").textContent = `Amber to green. 50 coins earned. Streak: ${visibleStreak} day${visibleStreak === 1 ? "" : "s"}.`;
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

    if (progressCharacter) {
      const characterProgress = Math.min(90, progress);
      progressCharacter.style.left = `${characterProgress}%`;
    }

    maybeStartCelebration(data);

    updateStreakDisplay(data);
    updateHistoryList(data.history);
    updateParentNotesDisplay(data);
    maybeSendCoinNotification(data).catch(error => console.error(error));
  }

  function updateStreakDisplay(data) {
    if (!streakCount || !bestStreak || !streakMessage) {
      return;
    }

    const visibleStreak = getVisibleStreak(data.streak);
    const todayISO = getDateISO();

    streakCount.textContent = visibleStreak;
    bestStreak.textContent = Math.max(Number(data.streak.best) || 0, visibleStreak);

    if (data.streak.lastGreenDateISO === todayISO) {
      streakMessage.textContent = "Green reached today. The streak is safe.";
    } else if (visibleStreak > 0) {
      streakMessage.textContent = "Reach green today to keep the streak going.";
    } else {
      streakMessage.textContent = "Reach green today to start a streak.";
    }
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
      const streakText = item.streakAfter ? ` - Streak: ${item.streakAfter}` : "";
      const autoText = item.automatic ? " - auto" : "";

      div.textContent = `${item.emoji || ""} ${item.date} - ${item.text}${autoText} - ${coinText} - ${totalText}${streakText}`;

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
    add10Button.addEventListener("click", () => adjustCoins(10, "10 coins added manually"));
    add50Button.addEventListener("click", () => adjustCoins(50, "50 coins added manually"));
    resetCoinsButton.addEventListener("click", resetCoins);

    if (unlockControlsButton) {
      unlockControlsButton.addEventListener("click", manualUnlockParentControls);
    }

    if (lockControlsButton) {
      lockControlsButton.addEventListener("click", lockParentControls);
    }

    changePinButton.addEventListener("click", changeParentPin);

    if (enableNotificationsButton) {
      enableNotificationsButton.addEventListener("click", enableNotifications);
    }

    if (addParentNoteButton) {
      addParentNoteButton.addEventListener("click", addParentNote);
    }

    if (noteAuthor) {
      noteAuthor.addEventListener("input", saveNoteAuthorName);
    }

    if (collectPrizeButton) {
      collectPrizeButton.addEventListener("click", () => {
        const celebrationId = currentData?.celebration?.id || currentCelebrationId;

        if (!celebrationId) {
          return;
        }

        finishCelebration(celebrationId);
      });
    }

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
    parentUnlocked = false;
    loadSavedNoteAuthor();
    setTreatTheme(getCurrentTheme());
    updateDisplay();
    updateLockDisplay();
    setupServiceWorker().finally(updateNotificationStatus);
    connectButtons();
    startFirebaseSync();
    scheduleMidnightAmberReset();
  } catch (error) {
    console.error(error);
    alert("Button error - check script.js upload");
  }
});
