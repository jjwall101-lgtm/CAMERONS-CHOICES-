const messages = {
  red: {
    emoji: "🔴",
    main: "Red: Tricky choices",
    sub: "Today was hard. No treat today, but we can repair it and try again tomorrow."
  },
  amber: {
    emoji: "🟠",
    main: "Amber: Okay day",
    sub: "Today was a normal day. Some good choices, some tricky moments. Keep trying."
  },
  green: {
    emoji: "🟢",
    main: "Green: Great choices",
    sub: "Amazing effort today. Treat earned!"
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
    document.getElementById("message").textContent = "Tap a colour for today";
    document.getElementById("subMessage").textContent = "Red, amber, or green. Tomorrow is always a fresh start.";
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
