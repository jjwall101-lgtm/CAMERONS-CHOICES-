import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

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
  const DATA_KEY = "cameronApp2DataV1";
  const PIN_KEY = "cameronParentPinV1";
  const THEME_KEY = "cameronSelectedTheme";
  const NOTE_AUTHOR_KEY = "cameronParentNoteAuthorV1";
  const LAST_NOTIFICATION_KEY = "cameronLastNotificationV2";
  const CHILD_MODE_KEY = "cameronChildModeV1";
  const DEFAULT_PIN = "1234";

  const DEFAULT_CATEGORIES = [
    "General",
    "School",
    "Home",
    "Bedtime",
    "Toileting",
    "Kindness",
    "Listening",
    "Meltdown",
    "Shutdown",
    "Sensory overload",
    "Physical outburst",
    "Good transition"
  ];

  const DEFAULT_REWARDS = [
    { id: "reward-100-story", icon: "📖", name: "Choose bedtime story", cost: 100 },
    { id: "reward-250-treat", icon: "🍫", name: "Small treat", cost: 250 },
    { id: "reward-500-park", icon: "🛝", name: "Park trip", cost: 500 },
    { id: "reward-1000-prize", icon: "🎁", name: "Big prize", cost: 1000 }
  ];

  let app = null;
  let db = null;
  let auth = null;
  let appDoc = null;
  let currentUser = null;
  let unsubscribeSnapshot = null;
  let parentUnlocked = false;
  let childMode = localStorage.getItem(CHILD_MODE_KEY) !== "false";
  let notificationsReady = false;
  let serviceWorkerRegistration = null;
  let editingNoteId = "";
  let currentData = getLocalData();

  const $ = id => document.getElementById(id);

  const elements = {
    syncStatus: $("syncStatus"),
    headerUnlockButton: $("headerUnlockButton"),
    modeStatusPill: $("modeStatusPill"),
    parentPageUnlockButton: $("parentPageUnlockButton"),
    settingsUnlockButton: $("settingsUnlockButton"),
    lockStatus: $("lockStatus"),

    themeSelect: $("themeSelect"),

    coinTotalMain: $("coinTotalMain"),
    goalDisplay: $("goalDisplay"),
    finishGoal: $("finishGoal"),
    coinProgress: $("coinProgress"),
    progressCharacter: $("progressCharacter"),
    nextRewardText: $("nextRewardText"),

    deduct5Button: $("deduct5Button"),
    deduct10Button: $("deduct10Button"),
    deduct50Button: $("deduct50Button"),
    add5Button: $("add5Button"),
    add10Button: $("add10Button"),
    add50Button: $("add50Button"),
    resetCoinsButton: $("resetCoinsButton"),

    enableNotificationsButton: $("enableNotificationsButton"),
    settingsEnableNotificationsButton: $("settingsEnableNotificationsButton"),
    notificationStatus: $("notificationStatus"),
    settingsNotificationStatus: $("settingsNotificationStatus"),

    streakCount: $("streakCount"),
    bestStreak: $("bestStreak"),
    streakMessage: $("streakMessage"),

    todayLevelPill: $("todayLevelPill"),
    behaviourCategorySelect: $("behaviourCategorySelect"),
    behaviourReasonText: $("behaviourReasonText"),
    redLight: $("redLight"),
    amberLight: $("amberLight"),
    greenLight: $("greenLight"),
    redLabel: $("redLabel"),
    amberLabel: $("amberLabel"),
    greenLabel: $("greenLabel"),
    redCoinValue: $("redCoinValue"),
    greenCoinValue: $("greenCoinValue"),
    resetTodayButton: $("resetTodayButton"),

    treatCard: $("treatCard"),
    prizeDropIcon: $("prizeDropIcon"),
    prizeDropName: $("prizeDropName"),
    treatSubtitle: $("treatSubtitle"),
    treatResetNote: $("treatResetNote"),
    collectPrizeButton: $("collectPrizeButton"),

    rewardsList: $("rewardsList"),

    parentLockedPanel: $("parentLockedPanel"),
    parentUnlockedContent: $("parentUnlockedContent"),
    noteAuthor: $("noteAuthor"),
    noteCategorySelect: $("noteCategorySelect"),
    parentNoteText: $("parentNoteText"),
    addParentNoteButton: $("addParentNoteButton"),
    noteFilterSelect: $("noteFilterSelect"),
    parentNotesList: $("parentNotesList"),

    rewardIconInput: $("rewardIconInput"),
    rewardNameInput: $("rewardNameInput"),
    rewardCostInput: $("rewardCostInput"),
    addRewardButton: $("addRewardButton"),
    rewardEditorList: $("rewardEditorList"),

    newCategoryInput: $("newCategoryInput"),
    addCategoryButton: $("addCategoryButton"),
    categoryList: $("categoryList"),

    historyFilterSelect: $("historyFilterSelect"),
    historyList: $("historyList"),
    clearHistoryButton: $("clearHistoryButton"),

    reportSummary: $("reportSummary"),
    levelChart: $("levelChart"),
    coinChart: $("coinChart"),
    noteChart: $("noteChart"),
    copyWeeklyReportButton: $("copyWeeklyReportButton"),

    settingsLockedPanel: $("settingsLockedPanel"),
    settingsUnlockedContent: $("settingsUnlockedContent"),
    goalInput: $("goalInput"),
    greenCoinsInput: $("greenCoinsInput"),
    redCoinsInput: $("redCoinsInput"),
    saveCoinSettingsButton: $("saveCoinSettingsButton"),
    newPinInput: $("newPinInput"),
    changePinButton: $("changePinButton"),

    authEmailInput: $("authEmailInput"),
    authPasswordInput: $("authPasswordInput"),
    createAccountButton: $("createAccountButton"),
    signInButton: $("signInButton"),
    signOutButton: $("signOutButton"),
    addThisParentButton: $("addThisParentButton"),
    authStatus: $("authStatus"),

    exportDataButton: $("exportDataButton"),
    clearAllDataButton: $("clearAllDataButton")
  };

  function getDateISO(date = new Date()) {
    return date.toISOString().slice(0, 10);
  }

  function formatDateTime(date = new Date()) {
    return date.toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getDefaultData() {
    const today = getDateISO();

    return {
      coinTotal: 0,
      today: {
        date: today,
        level: "amber",
        category: "General",
        reason: ""
      },
      history: [],
      parentNotes: [],
      rewards: DEFAULT_REWARDS,
      categories: DEFAULT_CATEGORIES,
      streak: {
        current: 0,
        best: 0,
        lastGreenDate: ""
      },
      settings: {
        goal: 1000,
        greenCoins: 50,
        redCoins: 50,
        dailyResetLevel: "amber"
      },
      celebration: {
        active: false,
        id: "",
        theme: "mario"
      },
      memberUids: {}
    };
  }

  function normalizeSettings(settings = {}) {
    return {
      goal: Math.max(50, Math.min(10000, Number(settings.goal) || 1000)),
      greenCoins: Math.max(0, Math.min(1000, Number(settings.greenCoins) || 50)),
      redCoins: Math.max(0, Math.min(1000, Number(settings.redCoins) || 50)),
      dailyResetLevel: ["red", "amber", "green"].includes(settings.dailyResetLevel) ? settings.dailyResetLevel : "amber"
    };
  }

  function normalizeRewards(rewards) {
    const source = Array.isArray(rewards) && rewards.length ? rewards : DEFAULT_REWARDS;

    return source
      .filter(reward => reward && typeof reward === "object")
      .map(reward => ({
        id: reward.id || `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        icon: String(reward.icon || "🎁").slice(0, 4),
        name: String(reward.name || "Reward").slice(0, 60),
        cost: Math.max(1, Math.min(10000, Number(reward.cost) || 100))
      }))
      .filter(reward => reward.name.trim())
      .slice(0, 50);
  }

  function normalizeCategories(categories) {
    const list = Array.isArray(categories) && categories.length ? categories : DEFAULT_CATEGORIES;
    const clean = list
      .map(category => String(category || "").trim())
      .filter(Boolean)
      .slice(0, 60);

    return [...new Set(clean.length ? clean : DEFAULT_CATEGORIES)];
  }

  function normalizeNotes(notes) {
    if (!Array.isArray(notes)) {
      return [];
    }

    return notes
      .filter(note => note && typeof note === "object")
      .map(note => ({
        id: note.id || `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author: String(note.author || "Parent").slice(0, 40),
        category: String(note.category || "General").slice(0, 40),
        text: String(note.text || "").slice(0, 1500),
        dateText: note.dateText || "",
        dateISO: note.dateISO || "",
        savedAt: note.savedAt || ""
      }))
      .filter(note => note.text.trim())
      .slice(0, 250);
  }

  function normalizeHistory(history) {
    if (!Array.isArray(history)) {
      return [];
    }

    return history
      .filter(item => item && typeof item === "object")
      .map(item => ({
        id: item.id || `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: item.type || "general",
        level: item.level || "",
        category: item.category || "",
        text: String(item.text || "").slice(0, 500),
        coinChange: Number(item.coinChange) || 0,
        coinsAfter: Math.max(0, Number(item.coinsAfter) || 0),
        dateISO: item.dateISO || getDateISO(),
        dateText: item.dateText || "",
        savedAt: item.savedAt || ""
      }))
      .slice(0, 500);
  }

  function normalizeData(data) {
    const defaults = getDefaultData();
    const settings = normalizeSettings(data?.settings || defaults.settings);
    const todayDate = data?.today?.date || getDateISO();

    return {
      coinTotal: Math.max(0, Number(data?.coinTotal) || 0),
      today: {
        date: todayDate,
        level: ["red", "amber", "green"].includes(data?.today?.level) ? data.today.level : "amber",
        category: data?.today?.category || "General",
        reason: data?.today?.reason || ""
      },
      history: normalizeHistory(data?.history),
      parentNotes: normalizeNotes(data?.parentNotes),
      rewards: normalizeRewards(data?.rewards),
      categories: normalizeCategories(data?.categories),
      streak: {
        current: Math.max(0, Number(data?.streak?.current) || 0),
        best: Math.max(0, Number(data?.streak?.best) || 0),
        lastGreenDate: data?.streak?.lastGreenDate || ""
      },
      settings,
      celebration: {
        active: Boolean(data?.celebration?.active),
        id: data?.celebration?.id || "",
        theme: data?.celebration?.theme || getCurrentTheme()
      },
      memberUids: data?.memberUids && typeof data.memberUids === "object" ? data.memberUids : {}
    };
  }

  function getLocalData() {
    try {
      const raw = localStorage.getItem(DATA_KEY);
      return normalizeData(raw ? JSON.parse(raw) : getDefaultData());
    } catch (error) {
      console.error(error);
      return getDefaultData();
    }
  }

  function storeLocalData(data) {
    localStorage.setItem(DATA_KEY, JSON.stringify(normalizeData(data)));
  }

  function getParentPin() {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
  }

  function verifyParentPin(actionText = "continue") {
    if (parentUnlocked) {
      return true;
    }

    const pin = prompt(`Enter parent PIN to ${actionText}:`);

    if (pin === null) {
      return false;
    }

    if (pin === getParentPin()) {
      parentUnlocked = true;

      if (childMode) {
        childMode = false;
        localStorage.setItem(CHILD_MODE_KEY, "false");
      }

      updateParentLockDisplay();
      return true;
    }

    alert("Wrong PIN.");
    return false;
  }

  function getCurrentTheme() {
    return localStorage.getItem(THEME_KEY) || "mario";
  }

  function setTheme(theme) {
    const allowed = ["mario", "space", "minecraft"];
    const safeTheme = allowed.includes(theme) ? theme : "mario";
    document.documentElement.dataset.theme = safeTheme;
    localStorage.setItem(THEME_KEY, safeTheme);

    if (elements.themeSelect) {
      elements.themeSelect.value = safeTheme;
    }

    updateProgressCharacter();
    updatePrizeDetails();
  }

  function applyDailyReset(data) {
    const today = getDateISO();
    const next = normalizeData(data);

    if (next.today.date !== today) {
      next.today = {
        date: today,
        level: next.settings.dailyResetLevel,
        category: "General",
        reason: ""
      };
    }

    return next;
  }

  async function saveData(data) {
    let next = applyDailyReset(normalizeData(data));

    if (currentUser?.uid) {
      next.memberUids = {
        ...(next.memberUids || {}),
        [currentUser.uid]: true
      };
    }

    currentData = next;
    storeLocalData(next);
    updateDisplay();

    if (!appDoc) {
      setSyncStatus("Local only", "offline");
      return;
    }

    try {
      await setDoc(appDoc, {
        ...next,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSyncStatus(navigator.onLine ? "Sync connected" : "Saved offline", navigator.onLine ? "online" : "offline");
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync failed - saved on this phone", "error");
    }
  }

  async function getLatestData() {
    if (!appDoc) {
      return normalizeData(currentData);
    }

    try {
      const snapshot = await getDoc(appDoc);

      if (snapshot.exists()) {
        return applyDailyReset(normalizeData(snapshot.data()));
      }
    } catch (error) {
      console.error(error);
    }

    return normalizeData(currentData);
  }

  function setSyncStatus(text, className = "") {
    if (!elements.syncStatus) {
      return;
    }

    elements.syncStatus.textContent = text;
    elements.syncStatus.className = `sync-pill ${className}`.trim();
  }

  function addHistoryEntry(data, entry) {
    const now = new Date();
    data.history = normalizeHistory(data.history);
    data.history.unshift({
      id: `history-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: entry.type || "general",
      level: entry.level || "",
      category: entry.category || "",
      text: entry.text || "",
      coinChange: Number(entry.coinChange) || 0,
      coinsAfter: Math.max(0, Number(entry.coinsAfter) || 0),
      dateISO: getDateISO(now),
      dateText: formatDateTime(now),
      savedAt: now.toISOString()
    });
    data.history = data.history.slice(0, 500);
  }

  function getPrizeDetails(theme = getCurrentTheme()) {
    if (theme === "space") {
      return {
        icon: "🪐",
        name: "SPACE TROPHY",
        subtitle: "Mission complete!"
      };
    }

    if (theme === "minecraft") {
      return {
        icon: "💎",
        name: "DIAMOND PRIZE",
        subtitle: "Build complete!"
      };
    }

    return {
      icon: "🌟",
      name: "SUPER STAR PRIZE",
      subtitle: "Goal reached!"
    };
  }

  function startCelebrationIfNeeded(data) {
    const goal = data.settings.goal;

    if (data.coinTotal >= goal && !data.celebration.active) {
      data.celebration = {
        active: true,
        id: `celebration-${Date.now()}`,
        theme: getCurrentTheme()
      };

      addHistoryEntry(data, {
        type: "prize",
        level: "prize",
        text: `Prize reached at ${goal} coins`,
        coinChange: 0,
        coinsAfter: data.coinTotal
      });

      showPhoneNotification("Prize reached!", {
        body: `Cameron reached ${goal} coins.`,
        tag: "cameron-prize"
      }).catch(console.error);
    }
  }

  async function adjustCoins(amount) {
    if (childMode) {
      alert("Enter Parent Mode to change coins.");
      return;
    }

    if (!verifyParentPin("change coins")) {
      return;
    }

    const data = await getLatestData();
    const before = data.coinTotal;
    data.coinTotal = Math.max(0, before + amount);
    const actualChange = data.coinTotal - before;

    if (actualChange === 0) {
      return;
    }

    addHistoryEntry(data, {
      type: "coin",
      level: actualChange > 0 ? "gain" : "loss",
      text: actualChange > 0 ? `Manual coin gain: +${actualChange}` : `Manual coin loss: ${actualChange}`,
      coinChange: actualChange,
      coinsAfter: data.coinTotal
    });

    startCelebrationIfNeeded(data);
    await saveData(data);
  }

  async function setLevel(level) {
    if (childMode) {
      alert("Enter Parent Mode to change today's level.");
      return;
    }

    if (!verifyParentPin("change today's level")) {
      return;
    }

    const data = await getLatestData();
    const today = getDateISO();

    if (data.today.date !== today) {
      data.today = {
        date: today,
        level: "amber",
        category: "General",
        reason: ""
      };
    }

    const previousLevel = data.today.level;

    if (previousLevel === level) {
      return;
    }

    if (level === "green" && previousLevel !== "amber") {
      alert("Go to amber before green.");
      return;
    }

    const category = elements.behaviourCategorySelect?.value || "General";
    const reason = elements.behaviourReasonText?.value.trim() || "";
    let coinChange = 0;
    let text = "";

    if (level === "green" && previousLevel === "amber") {
      coinChange = data.settings.greenCoins;
      text = `Moved to GREEN: +${coinChange} coins`;
    } else if (level === "red" && previousLevel !== "red") {
      coinChange = -data.settings.redCoins;
      text = `Moved to RED: -${data.settings.redCoins} coins`;
    } else if (level === "amber") {
      text = "Moved to AMBER";
    } else {
      text = `Moved to ${level.toUpperCase()}`;
    }

    const before = data.coinTotal;
    data.coinTotal = Math.max(0, before + coinChange);
    const actualChange = data.coinTotal - before;

    data.today = {
      date: today,
      level,
      category,
      reason
    };

    if (level === "green" && data.streak.lastGreenDate !== today) {
      data.streak.current += 1;
      data.streak.best = Math.max(data.streak.best, data.streak.current);
      data.streak.lastGreenDate = today;
    }

    if (level === "red") {
      data.streak.current = 0;
    }

    addHistoryEntry(data, {
      type: "level",
      level,
      category,
      text: reason ? `${text}. ${reason}` : text,
      coinChange: actualChange,
      coinsAfter: data.coinTotal
    });

    if (elements.behaviourReasonText) {
      elements.behaviourReasonText.value = "";
    }

    startCelebrationIfNeeded(data);
    await saveData(data);
  }

  async function resetToday() {
    if (!verifyParentPin("reset today")) {
      return;
    }

    const data = await getLatestData();
    data.today = {
      date: getDateISO(),
      level: "amber",
      category: "General",
      reason: ""
    };

    addHistoryEntry(data, {
      type: "level",
      level: "amber",
      category: "General",
      text: "Today reset to amber",
      coinChange: 0,
      coinsAfter: data.coinTotal
    });

    await saveData(data);
  }

  async function resetCoins() {
    if (!verifyParentPin("reset coins")) {
      return;
    }

    if (!confirm("Reset coins to 0?")) {
      return;
    }

    const data = await getLatestData();
    const before = data.coinTotal;
    data.coinTotal = 0;
    data.celebration = {
      active: false,
      id: "",
      theme: getCurrentTheme()
    };

    addHistoryEntry(data, {
      type: "coin",
      level: "reset",
      text: "Coins reset to 0",
      coinChange: -before,
      coinsAfter: 0
    });

    await saveData(data);
  }

  async function collectPrize() {
    if (!verifyParentPin("collect the prize")) {
      return;
    }

    const data = await getLatestData();
    const before = data.coinTotal;
    data.coinTotal = 0;
    data.celebration = {
      active: false,
      id: "",
      theme: getCurrentTheme()
    };

    addHistoryEntry(data, {
      type: "reward",
      level: "prize",
      text: "Prize collected. Coins reset to 0",
      coinChange: -before,
      coinsAfter: 0
    });

    await saveData(data);
  }

  async function claimReward(rewardId) {
    if (!verifyParentPin("claim this reward")) {
      return;
    }

    const data = await getLatestData();
    const reward = normalizeRewards(data.rewards).find(item => item.id === rewardId);

    if (!reward) {
      return;
    }

    if (data.coinTotal < reward.cost) {
      alert("Not enough coins for this reward yet.");
      return;
    }

    if (!confirm(`Claim "${reward.name}" for ${reward.cost} coins?`)) {
      return;
    }

    data.coinTotal -= reward.cost;

    addHistoryEntry(data, {
      type: "reward",
      level: "claimed",
      text: `Reward claimed: ${reward.icon} ${reward.name}`,
      coinChange: -reward.cost,
      coinsAfter: data.coinTotal
    });

    await saveData(data);

    showPhoneNotification("Reward claimed", {
      body: `${reward.name} claimed for ${reward.cost} coins.`,
      tag: `reward-${rewardId}`
    }).catch(console.error);
  }

  async function addReward() {
    if (!verifyParentPin("add a reward")) {
      return;
    }

    const icon = elements.rewardIconInput?.value.trim() || "🎁";
    const name = elements.rewardNameInput?.value.trim() || "";
    const cost = Math.round(Number(elements.rewardCostInput?.value) || 0);

    if (!name) {
      alert("Add a reward name first.");
      return;
    }

    if (cost < 1) {
      alert("Add a valid coin cost.");
      return;
    }

    const data = await getLatestData();
    data.rewards = normalizeRewards(data.rewards);
    data.rewards.push({
      id: `reward-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      icon,
      name,
      cost: Math.max(1, Math.min(10000, cost))
    });

    elements.rewardIconInput.value = "";
    elements.rewardNameInput.value = "";
    elements.rewardCostInput.value = "";

    await saveData(data);
  }

  async function saveReward(rewardId) {
    if (!verifyParentPin("edit this reward")) {
      return;
    }

    const row = document.querySelector(`[data-reward-editor-id="${rewardId}"]`);

    if (!row) {
      return;
    }

    const icon = row.querySelector(".reward-edit-icon").value.trim() || "🎁";
    const name = row.querySelector(".reward-edit-name").value.trim();
    const cost = Math.round(Number(row.querySelector(".reward-edit-cost").value) || 0);

    if (!name || cost < 1) {
      alert("Reward needs a name and valid cost.");
      return;
    }

    const data = await getLatestData();
    data.rewards = normalizeRewards(data.rewards).map(reward => {
      if (reward.id !== rewardId) {
        return reward;
      }

      return {
        ...reward,
        icon,
        name,
        cost: Math.max(1, Math.min(10000, cost))
      };
    });

    await saveData(data);
  }

  async function deleteReward(rewardId) {
    if (!verifyParentPin("delete this reward")) {
      return;
    }

    if (!confirm("Delete this reward?")) {
      return;
    }

    const data = await getLatestData();
    data.rewards = normalizeRewards(data.rewards).filter(reward => reward.id !== rewardId);
    await saveData(data);
  }

  async function addOrUpdateNote() {
    if (!verifyParentPin("add a parent note")) {
      return;
    }

    const author = elements.noteAuthor?.value.trim() || "";
    const category = elements.noteCategorySelect?.value || "General";
    const text = elements.parentNoteText?.value.trim() || "";

    if (!author) {
      alert("Add who wrote the note first.");
      return;
    }

    if (!text) {
      alert("Write a note first.");
      return;
    }

    localStorage.setItem(NOTE_AUTHOR_KEY, author);

    const data = await getLatestData();
    data.parentNotes = normalizeNotes(data.parentNotes);

    if (editingNoteId) {
      data.parentNotes = data.parentNotes.map(note => {
        if (note.id !== editingNoteId) {
          return note;
        }

        return {
          ...note,
          author,
          category,
          text
        };
      });
      editingNoteId = "";
      elements.addParentNoteButton.textContent = "Add Note";
    } else {
      const now = new Date();
      data.parentNotes.unshift({
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        author,
        category,
        text,
        dateText: formatDateTime(now),
        dateISO: getDateISO(now),
        savedAt: now.toISOString()
      });

      addHistoryEntry(data, {
        type: "note",
        level: "note",
        category,
        text: `Parent note added by ${author}: ${text.slice(0, 120)}`,
        coinChange: 0,
        coinsAfter: data.coinTotal
      });
    }

    elements.parentNoteText.value = "";
    await saveData(data);
  }

  function editNote(noteId) {
    if (!verifyParentPin("edit this note")) {
      return;
    }

    const note = currentData.parentNotes.find(item => item.id === noteId);

    if (!note) {
      return;
    }

    editingNoteId = noteId;
    elements.noteAuthor.value = note.author;
    elements.noteCategorySelect.value = note.category || "General";
    elements.parentNoteText.value = note.text;
    elements.addParentNoteButton.textContent = "Save Note";
    switchPage("parent");
  }

  async function deleteNote(noteId) {
    if (!verifyParentPin("delete this note")) {
      return;
    }

    if (!confirm("Delete this parent note?")) {
      return;
    }

    const data = await getLatestData();
    data.parentNotes = normalizeNotes(data.parentNotes).filter(note => note.id !== noteId);
    await saveData(data);
  }

  async function addCategory() {
    if (!verifyParentPin("add a category")) {
      return;
    }

    const value = elements.newCategoryInput?.value.trim();

    if (!value) {
      return;
    }

    const data = await getLatestData();
    data.categories = normalizeCategories([...normalizeCategories(data.categories), value]);
    elements.newCategoryInput.value = "";
    await saveData(data);
  }

  async function deleteCategory(category) {
    if (!verifyParentPin("delete this category")) {
      return;
    }

    if (DEFAULT_CATEGORIES.includes(category)) {
      alert("Default categories are kept so reports stay consistent.");
      return;
    }

    const data = await getLatestData();
    data.categories = normalizeCategories(data.categories).filter(item => item !== category);
    await saveData(data);
  }

  async function saveCoinSettings() {
    if (!verifyParentPin("save settings")) {
      return;
    }

    const data = await getLatestData();
    data.settings = normalizeSettings({
      goal: Number(elements.goalInput.value),
      greenCoins: Number(elements.greenCoinsInput.value),
      redCoins: Number(elements.redCoinsInput.value),
      dailyResetLevel: "amber"
    });

    await saveData(data);
  }

  function changePin() {
    if (!verifyParentPin("change the PIN")) {
      return;
    }

    const newPin = elements.newPinInput?.value.trim() || "";

    if (newPin.length < 3) {
      alert("Use at least 3 numbers.");
      return;
    }

    localStorage.setItem(PIN_KEY, newPin);
    elements.newPinInput.value = "";
    alert("Parent PIN changed on this phone.");
  }

  async function clearHistory() {
    if (!verifyParentPin("clear history")) {
      return;
    }

    if (!confirm("Clear all history?")) {
      return;
    }

    const data = await getLatestData();
    data.history = [];
    await saveData(data);
  }

  async function clearAllData() {
    if (!verifyParentPin("clear all data")) {
      return;
    }

    if (!confirm("This clears coins, rewards, notes, history and settings. Are you sure?")) {
      return;
    }

    await saveData(getDefaultData());
  }

  function exportData() {
    if (!verifyParentPin("export data")) {
      return;
    }

    const blob = new Blob([JSON.stringify(currentData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cameron-app-export-${getDateISO()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function switchPage(page) {
    if (childMode && !["home", "rewards"].includes(page)) {
      page = "home";
    }

    document.querySelectorAll(".page").forEach(section => {
      section.classList.toggle("active", section.id === `page-${page}`);
    });

    document.querySelectorAll(".nav-button").forEach(button => {
      button.classList.toggle("active", button.dataset.page === page);
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function updateParentLockDisplay() {
    const locked = !parentUnlocked;

    document.body.classList.toggle("child-mode", childMode);
    document.body.classList.toggle("parent-mode", !childMode);

    if (childMode) {
      parentUnlocked = false;
    }

    document.querySelectorAll(".nav-button").forEach(button => {
      const parentOnlyPage = !["home", "rewards"].includes(button.dataset.page);
      button.hidden = childMode && parentOnlyPage;
    });

    if (elements.modeStatusPill) {
      elements.modeStatusPill.textContent = childMode ? "Child Mode" : "Parent Mode";
    }

    if (elements.lockStatus) {
      elements.lockStatus.textContent = childMode
        ? "Child Mode: parent controls hidden"
        : parentUnlocked
          ? "Parent controls unlocked"
          : "Parent controls locked";
    }

    if (elements.headerUnlockButton) {
      elements.headerUnlockButton.textContent = childMode ? "Parent Mode" : "Back to Child Mode";
    }

    if (elements.parentLockedPanel) {
      elements.parentLockedPanel.hidden = parentUnlocked;
    }

    if (elements.parentUnlockedContent) {
      elements.parentUnlockedContent.hidden = locked;
    }

    if (elements.settingsLockedPanel) {
      elements.settingsLockedPanel.hidden = parentUnlocked;
    }

    if (elements.settingsUnlockedContent) {
      elements.settingsUnlockedContent.hidden = locked;
    }

    updateParentOnlyButtons();
    updateParentNotes();
    updateRewardEditor();
    updateCategoryList();
  }

  function updateParentOnlyButtons() {
    const parentButtons = [
      elements.deduct5Button,
      elements.deduct10Button,
      elements.deduct50Button,
      elements.add5Button,
      elements.add10Button,
      elements.add50Button,
      elements.resetTodayButton,
      elements.clearHistoryButton,
      elements.resetCoinsButton,
      elements.clearAllDataButton
    ];

    parentButtons.forEach(button => {
      if (button) {
        button.disabled = childMode || !parentUnlocked;
      }
    });
  }

  function updateDisplay() {
    if (childMode) {
      const activePage = document.querySelector(".page.active");
      if (activePage && !["page-home", "page-rewards"].includes(activePage.id)) {
        switchPage("home");
      }
    }

    currentData = applyDailyReset(normalizeData(currentData));
    storeLocalData(currentData);

    updateThemeText();
    updateCoinDisplay();
    updateLevelDisplay();
    updateStreakDisplay();
    updateRewardsShop();
    updateParentNotes();
    updateRewardEditor();
    updateCategoryOptions();
    updateCategoryList();
    updateHistory();
    updateReports();
    updateSettingsInputs();
    updateCelebration();
    updateParentLockDisplay();
    updateNotificationStatus();
    maybeSendLatestNotification(currentData).catch(console.error);
  }

  function updateThemeText() {
    updateProgressCharacter();

    const themeColor = getCurrentTheme() === "space"
      ? "#0e1244"
      : getCurrentTheme() === "minecraft"
        ? "#5cae40"
        : "#4ab7ff";

    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColor);
  }

  function updateProgressCharacter() {
    if (!elements.progressCharacter) {
      return;
    }

    const theme = getCurrentTheme();

    elements.progressCharacter.textContent = theme === "space" ? "🚀" : theme === "minecraft" ? "⛏️" : "🍄";
  }

  function updateCoinDisplay() {
    const goal = currentData.settings.goal;
    const total = currentData.coinTotal;
    const percent = Math.max(0, Math.min(100, (total / goal) * 100));

    elements.coinTotalMain.textContent = total;
    elements.goalDisplay.textContent = goal;
    elements.finishGoal.textContent = goal;
    elements.coinProgress.style.width = `${percent}%`;
    elements.progressCharacter.style.left = `calc(${percent}% - 18px)`;
    elements.greenCoinValue.textContent = `+${currentData.settings.greenCoins} coins`;
    elements.redCoinValue.textContent = `-${currentData.settings.redCoins} coins`;

    const rewards = normalizeRewards(currentData.rewards).sort((a, b) => a.cost - b.cost);
    const nextReward = rewards.find(reward => reward.cost > total);

    if (nextReward) {
      elements.nextRewardText.textContent = `Next reward: ${nextReward.icon} ${nextReward.name} - ${nextReward.cost - total} coins to go`;
    } else if (rewards.length) {
      elements.nextRewardText.textContent = "All rewards are affordable!";
    } else {
      elements.nextRewardText.textContent = "Add rewards in the Parent Page.";
    }
  }

  function updateLevelDisplay() {
    const level = currentData.today.level;
    const label = level.toUpperCase();

    elements.todayLevelPill.textContent = label;
    elements.todayLevelPill.style.background = level === "red" ? "var(--red)" : level === "green" ? "var(--green)" : "var(--amber)";

    elements.redLight.classList.toggle("active", level === "red");
    elements.amberLight.classList.toggle("active", level === "amber");
    elements.greenLight.classList.toggle("active", level === "green");
  }

  function updateStreakDisplay() {
    elements.streakCount.textContent = currentData.streak.current;
    elements.bestStreak.textContent = currentData.streak.best;

    if (currentData.streak.current > 0) {
      elements.streakMessage.textContent = `Great work. Cameron has reached green ${currentData.streak.current} day(s) in a row.`;
    } else {
      elements.streakMessage.textContent = "Reach green today to start a streak.";
    }
  }

  function updateCategoryOptions() {
    const categories = normalizeCategories(currentData.categories);
    const selects = [
      elements.behaviourCategorySelect,
      elements.noteCategorySelect,
      elements.noteFilterSelect
    ];

    selects.forEach(select => {
      if (!select) {
        return;
      }

      const current = select.value;
      select.innerHTML = "";

      if (select === elements.noteFilterSelect) {
        const all = document.createElement("option");
        all.value = "all";
        all.textContent = "All notes";
        select.appendChild(all);
      }

      categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
      });

      if ([...select.options].some(option => option.value === current)) {
        select.value = current;
      }
    });
  }

  function updateRewardsShop() {
    const list = elements.rewardsList;

    if (!list) {
      return;
    }

    const rewards = normalizeRewards(currentData.rewards).sort((a, b) => a.cost - b.cost);
    const total = currentData.coinTotal;
    list.innerHTML = "";

    if (!rewards.length) {
      list.innerHTML = "<p class='empty-notes'>No rewards set yet.</p>";
      return;
    }

    rewards.forEach(reward => {
      const affordable = total >= reward.cost;
      const item = document.createElement("article");
      item.className = "reward-shop-item";
      item.classList.toggle("reward-affordable", affordable);

      const icon = document.createElement("div");
      icon.className = "reward-shop-icon";
      icon.textContent = reward.icon;

      const info = document.createElement("div");
      info.className = "reward-shop-info";

      const name = document.createElement("strong");
      name.textContent = reward.name;

      const cost = document.createElement("span");
      cost.textContent = `${reward.cost} coins`;

      const status = document.createElement("small");
      status.textContent = affordable ? "Ready to claim" : `${reward.cost - total} coins to go`;

      info.appendChild(name);
      info.appendChild(cost);
      info.appendChild(status);

      const claim = document.createElement("button");
      claim.type = "button";
      claim.className = "claim-reward-button";
      claim.textContent = "Claim";
      claim.disabled = childMode || !affordable || !parentUnlocked;
      claim.addEventListener("click", () => claimReward(reward.id));

      item.appendChild(icon);
      item.appendChild(info);
      item.appendChild(claim);
      list.appendChild(item);
    });
  }

  function updateRewardEditor() {
    const list = elements.rewardEditorList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock parent controls to edit rewards.</p>";
      return;
    }

    const rewards = normalizeRewards(currentData.rewards);
    list.innerHTML = "";

    rewards.forEach(reward => {
      const item = document.createElement("article");
      item.className = "reward-editor-item";
      item.dataset.rewardEditorId = reward.id;

      item.innerHTML = `
        <label>Icon</label>
        <input class="reward-edit-icon" maxlength="4" value="${escapeAttr(reward.icon)}" />
        <label>Reward</label>
        <input class="reward-edit-name" maxlength="60" value="${escapeAttr(reward.name)}" />
        <label>Cost</label>
        <input class="reward-edit-cost" type="number" min="1" max="10000" step="1" value="${reward.cost}" />
        <div class="reward-editor-buttons">
          <button type="button" class="save-reward-button">Save</button>
          <button type="button" class="delete-reward-button">Delete</button>
        </div>
      `;

      item.querySelector(".save-reward-button").addEventListener("click", () => saveReward(reward.id));
      item.querySelector(".delete-reward-button").addEventListener("click", () => deleteReward(reward.id));
      list.appendChild(item);
    });
  }

  function updateParentNotes() {
    const list = elements.parentNotesList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock parent controls to view notes.</p>";
      return;
    }

    const filter = elements.noteFilterSelect?.value || "all";
    let notes = normalizeNotes(currentData.parentNotes);

    if (filter !== "all") {
      notes = notes.filter(note => note.category === filter);
    }

    list.innerHTML = "";

    if (!notes.length) {
      list.innerHTML = "<p class='empty-notes'>No parent notes yet.</p>";
      return;
    }

    notes.forEach(note => {
      const item = document.createElement("article");
      item.className = "parent-note-item";

      const meta = document.createElement("div");
      meta.className = "parent-note-meta";
      meta.textContent = `${note.dateText || "No date"} - ${note.author} - ${note.category || "General"}`;

      const text = document.createElement("p");
      text.className = "parent-note-text";
      text.textContent = note.text;

      const actions = document.createElement("div");
      actions.className = "note-actions";

      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "edit-note-button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editNote(note.id));

      const del = document.createElement("button");
      del.type = "button";
      del.className = "delete-note-button";
      del.textContent = "Delete";
      del.addEventListener("click", () => deleteNote(note.id));

      actions.appendChild(edit);
      actions.appendChild(del);

      item.appendChild(meta);
      item.appendChild(text);
      item.appendChild(actions);
      list.appendChild(item);
    });
  }

  function updateCategoryList() {
    const list = elements.categoryList;

    if (!list) {
      return;
    }

    if (!parentUnlocked) {
      list.innerHTML = "<p class='empty-notes'>Unlock parent controls to edit categories.</p>";
      return;
    }

    list.innerHTML = "";

    normalizeCategories(currentData.categories).forEach(category => {
      const item = document.createElement("div");
      item.className = "category-item";

      const text = document.createElement("strong");
      text.textContent = category;

      const button = document.createElement("button");
      button.type = "button";
      button.textContent = DEFAULT_CATEGORIES.includes(category) ? "Default" : "Delete";
      button.disabled = DEFAULT_CATEGORIES.includes(category);
      button.addEventListener("click", () => deleteCategory(category));

      item.appendChild(text);
      item.appendChild(button);
      list.appendChild(item);
    });
  }

  function updateHistory() {
    const list = elements.historyList;

    if (!list) {
      return;
    }

    const filter = elements.historyFilterSelect?.value || "all";
    let history = normalizeHistory(currentData.history);

    if (filter !== "all") {
      history = history.filter(item => item.type === filter || (filter === "reward" && item.type === "prize"));
    }

    list.innerHTML = "";

    if (!history.length) {
      list.innerHTML = "<p class='empty-notes'>No history yet.</p>";
      return;
    }

    history.forEach(item => {
      const row = document.createElement("article");
      row.className = "history-item";

      const meta = document.createElement("div");
      meta.className = "history-meta";
      meta.textContent = `${item.dateText || "No date"}${item.category ? " - " + item.category : ""}`;

      const text = document.createElement("p");
      text.className = "history-text";
      text.textContent = item.text;

      const coins = document.createElement("strong");
      coins.textContent = `${item.coinChange > 0 ? "+" : ""}${item.coinChange} coins | Total: ${item.coinsAfter}`;

      row.appendChild(meta);
      row.appendChild(text);
      row.appendChild(coins);
      list.appendChild(row);
    });
  }

  function getRecentHistory(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days + 1);
    cutoff.setHours(0, 0, 0, 0);

    return normalizeHistory(currentData.history).filter(item => {
      const date = item.savedAt ? new Date(item.savedAt) : new Date(`${item.dateISO}T00:00:00`);
      return date >= cutoff;
    });
  }

  function updateReports() {
    const recent = getRecentHistory(7);
    const greenDays = new Set(recent.filter(i => i.level === "green").map(i => i.dateISO)).size;
    const redItems = recent.filter(i => i.level === "red").length;
    const amberItems = recent.filter(i => i.level === "amber").length;
    const coinsGained = recent.reduce((sum, item) => sum + Math.max(0, item.coinChange), 0);
    const coinsLost = Math.abs(recent.reduce((sum, item) => sum + Math.min(0, item.coinChange), 0));
    const rewardsClaimed = recent.filter(i => i.type === "reward").length;
    const notes = normalizeNotes(currentData.parentNotes).filter(note => {
      const date = note.savedAt ? new Date(note.savedAt) : new Date(`${note.dateISO}T00:00:00`);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 6);
      cutoff.setHours(0, 0, 0, 0);
      return date >= cutoff;
    });

    if (elements.reportSummary) {
      elements.reportSummary.innerHTML = "";
      [
        ["Green days", greenDays],
        ["Red logs", redItems],
        ["Amber logs", amberItems],
        ["Coins gained", coinsGained],
        ["Coins lost", coinsLost],
        ["Rewards claimed", rewardsClaimed],
        ["Parent notes", notes.length],
        ["Best streak", currentData.streak.best]
      ].forEach(([label, value]) => {
        const card = document.createElement("div");
        card.className = "report-stat";
        card.innerHTML = `<strong>${value}</strong><span>${label}</span>`;
        elements.reportSummary.appendChild(card);
      });
    }

    drawChart(elements.levelChart, {
      Green: recent.filter(i => i.level === "green").length,
      Amber: amberItems,
      Red: redItems
    });

    drawChart(elements.coinChart, {
      Gained: coinsGained,
      Lost: coinsLost
    });

    const notesByCategory = {};
    notes.forEach(note => {
      notesByCategory[note.category || "General"] = (notesByCategory[note.category || "General"] || 0) + 1;
    });
    drawChart(elements.noteChart, Object.keys(notesByCategory).length ? notesByCategory : { Notes: 0 });
  }

  function drawChart(container, data) {
    if (!container) {
      return;
    }

    const entries = Object.entries(data);
    const max = Math.max(1, ...entries.map(([, value]) => Number(value) || 0));
    container.innerHTML = "";

    entries.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "bar-row";

      const name = document.createElement("span");
      name.textContent = label;

      const track = document.createElement("div");
      track.className = "bar-track";

      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(2, (Number(value) / max) * 100)}%`;

      const count = document.createElement("strong");
      count.textContent = value;

      track.appendChild(fill);
      row.appendChild(name);
      row.appendChild(track);
      row.appendChild(count);
      container.appendChild(row);
    });
  }

  function buildWeeklyReportText() {
    const recent = getRecentHistory(7);
    const coinsGained = recent.reduce((sum, item) => sum + Math.max(0, item.coinChange), 0);
    const coinsLost = Math.abs(recent.reduce((sum, item) => sum + Math.min(0, item.coinChange), 0));

    return [
      "Cameron's weekly report",
      "",
      `Green logs: ${recent.filter(i => i.level === "green").length}`,
      `Amber logs: ${recent.filter(i => i.level === "amber").length}`,
      `Red logs: ${recent.filter(i => i.level === "red").length}`,
      `Coins gained: ${coinsGained}`,
      `Coins lost: ${coinsLost}`,
      `Rewards claimed: ${recent.filter(i => i.type === "reward").length}`,
      `Current streak: ${currentData.streak.current}`,
      `Best streak: ${currentData.streak.best}`,
      "",
      "Recent notes:",
      ...normalizeNotes(currentData.parentNotes).slice(0, 5).map(note => `- ${note.dateText} - ${note.author} - ${note.category}: ${note.text}`)
    ].join("\n");
  }

  async function copyWeeklyReport() {
    const report = buildWeeklyReportText();

    try {
      await navigator.clipboard.writeText(report);
      alert("Weekly report copied.");
    } catch {
      prompt("Copy this report:", report);
    }
  }

  function updateSettingsInputs() {
    if (!elements.goalInput) {
      return;
    }

    elements.goalInput.value = currentData.settings.goal;
    elements.greenCoinsInput.value = currentData.settings.greenCoins;
    elements.redCoinsInput.value = currentData.settings.redCoins;
  }

  function updateCelebration() {
    if (!elements.treatCard) {
      return;
    }

    elements.treatCard.classList.toggle("show", Boolean(currentData.celebration.active));
    updatePrizeDetails();
  }

  function updatePrizeDetails() {
    if (!elements.prizeDropIcon) {
      return;
    }

    const details = getPrizeDetails(currentData.celebration.theme || getCurrentTheme());
    elements.prizeDropIcon.textContent = details.icon;
    elements.prizeDropName.textContent = details.name;
    elements.treatSubtitle.textContent = details.subtitle;
  }

  function escapeAttr(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }

  function notificationSupported() {
    return "Notification" in window && "serviceWorker" in navigator;
  }

  async function setupServiceWorker() {
    if (!("serviceWorker" in navigator)) {
      return null;
    }

    try {
      serviceWorkerRegistration = await navigator.serviceWorker.register("./sw.js?v=2");
      await navigator.serviceWorker.ready;
      return serviceWorkerRegistration;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function updateNotificationStatus() {
    const statusText = !notificationSupported()
      ? "Notifications are not supported on this phone/browser."
      : Notification.permission === "granted"
        ? "Notifications are on."
        : Notification.permission === "denied"
          ? "Notifications are blocked in browser settings."
          : "Notifications are off.";

    [elements.notificationStatus, elements.settingsNotificationStatus].forEach(el => {
      if (el) {
        el.textContent = statusText;
      }
    });

    [elements.enableNotificationsButton, elements.settingsEnableNotificationsButton].forEach(button => {
      if (button) {
        button.disabled = notificationSupported() && Notification.permission === "granted";
        button.textContent = Notification.permission === "granted" ? "Notifications On" : "Enable Notifications";
      }
    });
  }

  async function enableNotifications() {
    if (!notificationSupported()) {
      updateNotificationStatus();
      return;
    }

    const registration = await setupServiceWorker();

    if (!registration) {
      alert("Could not set up notifications. Refresh and try again.");
      return;
    }

    const permission = await Notification.requestPermission();
    updateNotificationStatus();

    if (permission === "granted") {
      await showPhoneNotification("Cameron notifications enabled", {
        body: "You will be notified when coins, rewards, and important logs change.",
        tag: "notifications-enabled"
      });
    }
  }

  async function showPhoneNotification(title, options = {}) {
    if (!notificationSupported() || Notification.permission !== "granted") {
      return false;
    }

    try {
      const registration = serviceWorkerRegistration || await navigator.serviceWorker.ready;
      await registration.showNotification(title, {
        icon: "icon.png",
        badge: "icon-192.png",
        vibrate: [120, 80, 120],
        data: { url: "./index.html" },
        ...options
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }

  function latestNotifyItem(data) {
    return normalizeHistory(data.history).find(item => {
      if (item.type === "coin" || item.type === "reward" || item.type === "prize") {
        return true;
      }

      return item.coinChange !== 0;
    });
  }

  async function maybeSendLatestNotification(data) {
    const item = latestNotifyItem(data);

    if (!item) {
      return;
    }

    const id = `${item.id}|${item.savedAt}|${item.coinChange}|${item.coinsAfter}`;
    const last = localStorage.getItem(LAST_NOTIFICATION_KEY);

    if (!notificationsReady) {
      localStorage.setItem(LAST_NOTIFICATION_KEY, id);
      notificationsReady = true;
      return;
    }

    if (id === last) {
      return;
    }

    localStorage.setItem(LAST_NOTIFICATION_KEY, id);

    if (item.coinChange !== 0) {
      const amount = Math.abs(item.coinChange);
      const title = item.coinChange > 0
        ? `Cameron gained ${amount} coins`
        : `Cameron lost ${amount} coins`;

      await showPhoneNotification(title, {
        body: `${item.text}. Total: ${item.coinsAfter}`,
        tag: `coin-${item.id}`
      });
    }
  }

  async function createAccount() {
    try {
      const email = elements.authEmailInput.value.trim();
      const password = elements.authPasswordInput.value;
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  }

  async function signInParent() {
    try {
      const email = elements.authEmailInput.value.trim();
      const password = elements.authPasswordInput.value;
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      alert(error.message);
    }
  }

  async function signOutParent() {
    try {
      await signOut(auth);
    } catch (error) {
      alert(error.message);
    }
  }

  async function addThisParent() {
    if (!currentUser?.uid) {
      alert("Sign in first.");
      return;
    }

    if (!verifyParentPin("add this signed-in parent")) {
      return;
    }

    const data = await getLatestData();
    data.memberUids = {
      ...(data.memberUids || {}),
      [currentUser.uid]: true
    };

    await saveData(data);
    alert("This signed-in parent has been added to the family record.");
  }

  function updateAuthStatus() {
    if (!elements.authStatus) {
      return;
    }

    elements.authStatus.textContent = currentUser
      ? `Signed in as ${currentUser.email || currentUser.uid}`
      : "Not signed in.";
  }

  async function initFirebase() {
    try {
      app = initializeApp(firebaseConfig);
      db = getFirestore(app);
      auth = getAuth(app);

      enableIndexedDbPersistence(db).catch(() => {
        // Fine to ignore if another tab already has persistence.
      });

      appDoc = doc(db, "families", FAMILY_RECORD_ID);

      onAuthStateChanged(auth, user => {
        currentUser = user;
        updateAuthStatus();
      });

      unsubscribeSnapshot = onSnapshot(appDoc, snapshot => {
        if (snapshot.exists()) {
          currentData = applyDailyReset(normalizeData(snapshot.data()));
          storeLocalData(currentData);
          setSyncStatus(navigator.onLine ? "Sync connected" : "Saved offline", navigator.onLine ? "online" : "offline");
          updateDisplay();
        } else {
          saveData(currentData);
        }
      }, error => {
        console.error(error);
        setSyncStatus("Sync failed - local mode", "error");
      });
    } catch (error) {
      console.error(error);
      setSyncStatus("Local mode", "offline");
    }
  }

  function connectEvents() {
    document.querySelectorAll(".nav-button").forEach(button => {
      button.addEventListener("click", () => switchPage(button.dataset.page));
    });

    elements.headerUnlockButton.addEventListener("click", () => {
      if (childMode) {
        if (verifyParentPin("enter Parent Mode")) {
          childMode = false;
          parentUnlocked = true;
          localStorage.setItem(CHILD_MODE_KEY, "false");
          switchPage("home");
        }
      } else {
        childMode = true;
        parentUnlocked = false;
        localStorage.setItem(CHILD_MODE_KEY, "true");
        switchPage("home");
      }

      updateParentLockDisplay();
      updateDisplay();
    });

    elements.parentPageUnlockButton.addEventListener("click", () => verifyParentPin("unlock parent page"));
    elements.settingsUnlockButton.addEventListener("click", () => verifyParentPin("unlock settings"));

    elements.themeSelect.addEventListener("change", event => setTheme(event.target.value));

    elements.deduct5Button.addEventListener("click", () => adjustCoins(-5));
    elements.deduct10Button.addEventListener("click", () => adjustCoins(-10));
    elements.deduct50Button.addEventListener("click", () => adjustCoins(-50));
    elements.add5Button.addEventListener("click", () => adjustCoins(5));
    elements.add10Button.addEventListener("click", () => adjustCoins(10));
    elements.add50Button.addEventListener("click", () => adjustCoins(50));

    elements.redLight.addEventListener("click", () => setLevel("red"));
    elements.amberLight.addEventListener("click", () => setLevel("amber"));
    elements.greenLight.addEventListener("click", () => setLevel("green"));
    elements.redLabel.addEventListener("click", () => setLevel("red"));
    elements.amberLabel.addEventListener("click", () => setLevel("amber"));
    elements.greenLabel.addEventListener("click", () => setLevel("green"));

    elements.resetTodayButton.addEventListener("click", resetToday);
    elements.collectPrizeButton.addEventListener("click", collectPrize);

    elements.enableNotificationsButton.addEventListener("click", enableNotifications);
    elements.settingsEnableNotificationsButton.addEventListener("click", enableNotifications);

    elements.addParentNoteButton.addEventListener("click", addOrUpdateNote);
    elements.noteAuthor.value = localStorage.getItem(NOTE_AUTHOR_KEY) || "";
    elements.noteAuthor.addEventListener("input", () => localStorage.setItem(NOTE_AUTHOR_KEY, elements.noteAuthor.value.trim()));
    elements.noteFilterSelect.addEventListener("change", updateParentNotes);

    elements.addRewardButton.addEventListener("click", addReward);

    elements.addCategoryButton.addEventListener("click", addCategory);

    elements.historyFilterSelect.addEventListener("change", updateHistory);
    elements.clearHistoryButton.addEventListener("click", clearHistory);

    elements.copyWeeklyReportButton.addEventListener("click", copyWeeklyReport);

    elements.saveCoinSettingsButton.addEventListener("click", saveCoinSettings);
    elements.changePinButton.addEventListener("click", changePin);

    elements.createAccountButton.addEventListener("click", createAccount);
    elements.signInButton.addEventListener("click", signInParent);
    elements.signOutButton.addEventListener("click", signOutParent);
    elements.addThisParentButton.addEventListener("click", addThisParent);

    elements.exportDataButton.addEventListener("click", exportData);
    elements.resetCoinsButton.addEventListener("click", resetCoins);
    elements.clearAllDataButton.addEventListener("click", clearAllData);

    window.addEventListener("online", () => setSyncStatus("Back online", "online"));
    window.addEventListener("offline", () => setSyncStatus("Offline - saved on phone", "offline"));
  }

  setTheme(getCurrentTheme());
  connectEvents();
  setupServiceWorker().finally(updateNotificationStatus);
  updateDisplay();
  initFirebase();
});
