const messages = {
  red: {
    main: "Red: Bad choices",
    sub: "Today has been difficult. A consequence is needed."
  },
  amber: {
    main: "Amber: Normal day",
    sub: "Today was okay. We try again tomorrow."
  },
  green: {
    main: "Green: Good choices",
    sub: "Great day. Treat earned."
  }
};

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
    text: messages[colour].main
  });

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
    document.getElementById("subMessage").textContent = "";
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
    div.textContent = `${item.date} - ${item.text}`;
    historyList.appendChild(div);
  });
}

updateDisplay();
