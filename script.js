// =======================================================
// ✅ EDUQUIZ APP MAIN JAVASCRIPT
// Features: Login/Logout, Registration (Fixed IDs), Leaderboard, 
// Secured Forgot Password (Email + Name Verification), Teacher Redirect Fix.
// =======================================================

// ---------- DATA STRUCTURE SETUP ----------
const learners = JSON.parse(localStorage.getItem("learners")) || [];
const teachers = JSON.parse(localStorage.getItem("teachers")) || [];
const leaderboardData = JSON.parse(localStorage.getItem("eduQuizLeaderboard")) || [
  { name: "Akosua Mensah", score: 95, subject: "Mathematics" },
  { name: "Kwame Boateng", score: 90, subject: "ICT" },
  { name: "Efua Owusu", score: 88, subject: "Science" },
];

// ---------- SAVE FUNCTIONS ----------
function saveData() {
  localStorage.setItem("learners", JSON.stringify(learners));
  localStorage.setItem("teachers", JSON.stringify(teachers));
  localStorage.setItem("eduQuizLeaderboard", JSON.stringify(leaderboardData));
}

// ---------- DYNAMIC NAVBAR BUTTON FUNCTION (New/Updated) ----------
function updateNavButtons() {
    // Select all buttons with class 'login-btn' across all pages
    const navButtons = document.querySelectorAll('.login-btn');
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    navButtons.forEach(button => {
        if (currentUser) {
            button.textContent = "Logout";
            button.onclick = () => {
                localStorage.removeItem("currentUser");
                alert("You have been logged out.");
                // Redirect to the home page after logout
                window.location.href = "index.html"; 
            };
        } else {
            button.textContent = "Login";
            button.onclick = () => {
                window.location.href = "login.html";
            };
        }
    });
}

// ---------- SECURE FORGOT PASSWORD HANDLER (Reverted to Name Verification) ----------
function handleForgotPassword() {
    const email = prompt("Enter your registered email address:");
    if (!email) return;

    const name = prompt("Enter your full name for verification:");
    if (!name) return;

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    let userRole = null;
    let userIndex = -1;

    // 1. Check Learners
    const learnerIndex = learners.findIndex(l => l.email === trimmedEmail && l.name.toLowerCase() === trimmedName.toLowerCase());
    if (learnerIndex !== -1) {
        userRole = 'learner';
        userIndex = learnerIndex;
    }

    // 2. Check Teachers
    if (userIndex === -1) {
        const teacherIndex = teachers.findIndex(t => t.email === trimmedEmail && t.name.toLowerCase() === trimmedName.toLowerCase());
        if (teacherIndex !== -1) {
            userRole = 'teacher';
            userIndex = teacherIndex;
        }
    }

    if (userRole) {
        const newPassword = prompt("Verification successful! Please enter your new password (min 6 chars):");
        if (newPassword && newPassword.length >= 6) {
            if (userRole === 'learner') {
                learners[userIndex].password = newPassword;
            } else {
                teachers[userIndex].password = newPassword;
            }
            saveData();
            alert("Password successfully reset! You can now log in with your new password.");
        } else if (newPassword) {
            alert("Password must be at least 6 characters long.");
        }
    } else {
        alert("Verification failed. The email and/or name you entered does not match our records. Please try again.");
    }
}


// ---------- REGISTRATION AND LOGIN HANDLERS (Updated to use IDs) ----------
document.addEventListener("DOMContentLoaded", () => {
  const learnerForm = document.getElementById("learnerForm");
  const teacherForm = document.getElementById("teacherForm");
  const loginForm = document.getElementById("loginForm");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink"); // Used in login.html

  // Attach forgot password handler
  if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener("click", (e) => {
          e.preventDefault();
          handleForgotPassword();
      });
  }

  // ---- Learner Registration (FIXED: Now reads IDs) ----
  if (learnerForm) {
    learnerForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const name = document.getElementById("learnerName") ? document.getElementById("learnerName").value.trim() : '';
      const email = document.getElementById("learnerEmail") ? document.getElementById("learnerEmail").value.trim() : '';
      const password = document.getElementById("learnerPassword") ? document.getElementById("learnerPassword").value.trim() : '';

      if (!name || !email || !password) {
        alert("Please fill all registration fields."); // Changed alert for clarity
        return;
      }

      const exists = learners.some((l) => l.email === email) || teachers.some((t) => t.email === email);
      if (exists) {
        alert("Account already exists with this email address!");
        return;
      }

      learners.push({ name, email, password, role: "learner" });
      saveData();
      alert("Registration successful! You can now log in.");
      learnerForm.reset();
      window.location.href = "login.html";
    });
  }

  // ---- Teacher Registration (FIXED: Now reads IDs) ----
  if (teacherForm) {
    teacherForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = document.getElementById("teacherName") ? document.getElementById("teacherName").value.trim() : '';
      const email = document.getElementById("teacherEmail") ? document.getElementById("teacherEmail").value.trim() : '';
      const password = document.getElementById("teacherPassword") ? document.getElementById("teacherPassword").value.trim() : '';

      if (!name || !email || !password) {
        alert("Please fill all registration fields."); // Changed alert for clarity
        return;
      }

      const exists = learners.some((l) => l.email === email) || teachers.some((t) => t.email === email);
      if (exists) {
        alert("Account already exists with this email address!");
        return;
      }

      teachers.push({ name, email, password, role: "teacher" });
      saveData();
      alert("Registration successful! You can now log in.");
      teacherForm.reset();
      window.location.href = "login.html";
    });
  }

  // ---- Login (FIXED: Now reads IDs and handles redirect) ----
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const email = document.getElementById("loginEmail") ? document.getElementById("loginEmail").value.trim() : '';
      const password = document.getElementById("loginPassword") ? document.getElementById("loginPassword").value.trim() : '';

      const learner = learners.find((l) => l.email === email && l.password === password);
      const teacher = teachers.find((t) => t.email === email && t.password === password);

      if (learner) {
        localStorage.setItem("currentUser", JSON.stringify(learner));
        alert(`Welcome ${learner.name}!`);
        window.location.href = "quizzes.html";
      } else if (teacher) {
        localStorage.setItem("currentUser", JSON.stringify(teacher));
        alert(`Welcome ${teacher.name}!`);
        // FIX: Redirect to index.html since teacher-dashboard.html is missing
        window.location.href = "index.html"; 
      } else {
        alert("Invalid email or password. Please try again.");
      }
    });
  }
  
  // Initialize dynamic buttons on page load
  updateNavButtons();
});

// ---------- LEADERBOARD FUNCTIONS (Unchanged) ----------
function displayLeaderboard(subject) {
  const tableBody = document.getElementById("leaderboardBody");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  const filtered = leaderboardData
    .filter((entry) => entry.subject === subject)
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

// ---------- LEADERBOARD ACCESS + INITIALIZATION (Unchanged) ----------
document.addEventListener("DOMContentLoaded", () => {
  // If the page is the leaderboard, ensure the user is logged in
  if (window.location.pathname.includes("leaderboard.html")) {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const welcomeText = document.getElementById("welcomeText");
    
    if (!currentUser) {
      alert("Please log in to view the leaderboard.");
      window.location.href = "login.html";
      return;
    }

    if (welcomeText) {
      welcomeText.textContent = `Welcome, ${currentUser.name}!`;
    }

    const subjectSelect = document.getElementById("subjectSelect");
    if (subjectSelect) {
      const defaultSubject = subjectSelect.value;
      displayLeaderboard(defaultSubject);

      subjectSelect.addEventListener("change", (e) => {
        displayLeaderboard(e.target.value);
      });
    }
  }
});