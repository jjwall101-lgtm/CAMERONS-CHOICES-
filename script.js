const messages = {
  red: {
    emoji: "🔴",
    main: "RED: OOPS DAY",
    sub: "Today was hard. No treat today, but tomorrow is a brand new level."
  },
  amber: {
    emoji: "🟠",
    main: "AMBER: TRYING DAY",
    sub: "Today had some good moments and some tricky moments. Keep going!"
  },
  green: {
    emoji: "🟢",
    main: "GREEN: SUPER DAY",
    sub: "Super job today. Treat earned!"
  }
};

const redLight = document.getElementById("redLight");
const amberLight = document.getElementById("amberLight");
const greenLight = document.getElementById("greenLight");
const resetButton = document.getElementById("resetButton");

redLight.addEventListener("click", () => setDay("red"));
amberLight.addEventListener("click", () => setDay("amber"));
greenLight.addEventListener("click", () => setDay("green"));
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
    emoji: messages[colour].emoji
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
  } else {
    document.getElementById("message").textContent = "TAP A LIGHT TO CHOOSE TODAY";
    document.getElementById("subMessage").textContent = "Every day is a new level. Pick red, amber, or green.";
  }

  updateHistoryList(history);
}

function updateHistoryList(history) {
  const historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  if (history.length === 0) {
    historyList.innerHTML = "<p class='empty-history'>No days recorded yet.</p>";
    return;
  }

  history.forEach(item => {
    const div = document.createElement("div");
    div.className = "history-item";

    const emoji = item.emoji || messages[item.colour]?.emoji || "";
    div.textContent = `${emoji} ${item.date} - ${item.text}`;

    historyList.appendChild(div);
  });
}

updateDisplay();
