const messages = {
  red: {
    emoji: "🔴",
    points: "000",
    main: "RED: OOPS LEVEL",
    sub: "Today was hard. No treat today, but tomorrow is a brand new level."
  },
  amber: {
    emoji: "🟡",
    points: "050",
    main: "AMBER: TRYING LEVEL",
    sub: "Today had good moments and tricky moments. Keep going!"
  },
  green: {
    emoji: "⭐",
    points: "100",
    main: "GREEN: SUPER LEVEL",
    sub: "Super effort today. Treat earned!"
  }
};

const redLight = document.getElementById("redLight");
const amberLight = document.getElementById("amberLight");
const greenLight = document.getElementById("greenLight");
const redLabel = document.getElementById("redLabel");
const amberLabel = document.getElementById("amberLabel");
const greenLabel = document.getElementById("greenLabel");
const resetButton = document.getElementById("resetButton");

redLight.addEventListener("click", () => setDay("red"));
amberLight.addEventListener("click", () => setDay("amber"));
greenLight.addEventListener("click", () => setDay("green"));

redLabel.addEventListener("click", () => setDay("red"));
amberLabel.addEventListener("click", () => setDay("amber"));
greenLabel.addEventListener("click", () => setDay("green"));

resetButton.addEventListener("click", resetToday);

function getToday() {
  return new Date().toLocaleDateString("en-GB");
}

function getHistory() {
  return JSON.parse(localStorage.getItem("behaviourHistory")) || [];
}

function saveHistory(history) {
  localStorage.setItem("behaviourHistory", JSON.stringify(history));
}

function setDay(colour) {
  const today = getToday();
  let history = getHistory();

  history = history.filter(item => item.date !== today);

  history.unshift({
    date: today,
    colour: colour,
    text: messages[colour].main,
    emoji: messages[colour].emoji,
    points: messages[colour].points
  });

  history = history.slice(0, 60);

  saveHistory(history);
  updateDisplay();
}

function resetToday() {
  const today = getToday();
  let history = getHistory();

  history = history.filter(item => item.date !== today);

  saveHistory(history);
  updateDisplay();
}

function updateDisplay() {
  const today = getToday();
  const history = getHistory();
  const todayEntry = history.find(item => item.date === today);

  document.querySelectorAll(".light").forEach(light => {
    light.classList.remove("active");
  });

  if (todayEntry) {
    document.querySelector("." + todayEntry.colour).classList.add("active");
    document.getElementById("message").textContent = messages[todayEntry.colour].main;
    document.getElementById("subMessage").textContent = messages[todayEntry.colour].sub;
    document.getElementById("coinScore").textContent = messages[todayEntry.colour].points;
  } else {
    document.getElementById("message").textContent = "TAP A LIGHT TO CHOOSE TODAY";
    document.getElementById("subMessage").textContent = "Every day is a new level. Choose red, amber, or green.";
    document.getElementById("coinScore").textContent = "000";
  }

  updateHistoryList(history);
}

function updateHistoryList(history) {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = "<p class='empty-history'>No levels recorded yet.</p>";
    return;
  }

  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";

    const emoji = item.emoji || messages[item.colour]?.emoji || "";
    const points = item.points || messages[item.colour]?.points || "000";

    div.textContent = `${emoji} ${item.date} - ${item.text} - ${points} coins`;

    historyList.appendChild(div);
  });
}

updateDisplay();
