


// ==== Leaderboard ====

/* Sample function to simulate data
const sampleData = [
  { name: "Akosua Mensah", score: 95, subject: "Mathematics" },
  { name: "Kwame Boateng", score: 90, subject: "ICT" },
  { name: "Efua Owusu", score: 88, subject: "Science" },
];*/

// Load saved data or sample fallback
let leaderboardData = JSON.parse(localStorage.getItem("eduQuizLeaderboard")) || sampleData;

// Function to display leaderboard
function displayLeaderboard(subject) {
  const tableBody = document.getElementById("leaderboardBody");
  tableBody.innerHTML = "";

  const filtered = leaderboardData
    .filter(entry => entry.subject === subject)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  filtered.forEach((entry, index) => {
    const row = `
      <tr>
        <td>${index + 1}</td>
        <td>${entry.name}</td>
        <td>${entry.score}%</td>
        <td>${entry.subject}</td>
      </tr>
    `;
    tableBody.insertAdjacentHTML("beforeend", row);
  });
}

// Handle subject selection
document.getElementById("subjectSelect").addEventListener("change", (e) => {
  displayLeaderboard(e.target.value);
});

// Default subject display
window.addEventListener("DOMContentLoaded", () => {
  const defaultSubject = document.getElementById("subjectSelect").value;
  displayLeaderboard(defaultSubject);
});
