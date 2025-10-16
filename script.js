// =======================================================
// ✅ EDUQUIZ APP MAIN JAVASCRIPT
// NEW: Teacher Dashboard Logic (Authentication, Add Questions, Display Pending)
// =======================================================

// ---------- DATA STRUCTURE SETUP ----------
const learners = JSON.parse(localStorage.getItem("learners")) || [];
const teachers = JSON.parse(localStorage.getItem("teachers")) || [];
const leaderboardData = JSON.parse(localStorage.getItem("eduQuizLeaderboard")) || [
  { name: "Akosua Mensah", score: 95, subject: "Mathematics" },
  { name: "Kwame Boateng", score: 90, subject: "ICT" },
  { name: "Efua Owusu", score: 88, subject: "Science" },
];
// NEW: Storage for questions submitted by teachers, pending approval
const pendingQuestions = JSON.parse(localStorage.getItem("pendingQuestions")) || []; 

// ---------- SAVE FUNCTIONS ----------
function saveData() {
  localStorage.setItem("learners", JSON.stringify(learners));
  localStorage.setItem("teachers", JSON.stringify(teachers));
  localStorage.setItem("eduQuizLeaderboard", JSON.stringify(leaderboardData));
  localStorage.setItem("pendingQuestions", JSON.stringify(pendingQuestions)); // NEW SAVE
}

// ---------- DYNAMIC NAVBAR BUTTON FUNCTION ----------
function updateNavButtons() {
    const navButtons = document.querySelectorAll('.login-btn');
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));

    navButtons.forEach(button => {
        if (currentUser) {
            button.textContent = "Logout";
            button.onclick = () => {
                localStorage.removeItem("currentUser");
                alert("You have been logged out.");
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

// ---------- SECURE FORGOT PASSWORD HANDLER ----------
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

// ---------- TEACHER DASHBOARD FUNCTIONS (NEW) ----------

function checkTeacherAuth() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    // Check if user is logged in AND user is a teacher
    if (!currentUser || currentUser.role !== 'teacher') {
        alert("Access denied. Please log in as a teacher.");
        window.location.href = "login.html";
        return null;
    }
    return currentUser;
}

function displayPendingQuestions(currentUser) {
    const tableBody = document.getElementById("pendingQuestions");
    if (!tableBody) return;

    tableBody.innerHTML = '';
    
    // Filter questions submitted by the current teacher
    const teacherQuestions = pendingQuestions.filter(q => q.teacherEmail === currentUser.email);

    if (teacherQuestions.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No pending questions submitted by you.</td></tr>';
        return;
    }

    teacherQuestions.forEach((q, index) => {
        const row = `
            <tr>
                <td>${index + 1}</td>
                <td>${q.subject}</td>
                <td>${q.question.substring(0, 50)}...</td>
                <td class="status-pending">${q.status}</td>
            </tr>
        `;
        tableBody.insertAdjacentHTML("beforeend", row);
    });
}

function handleAddQuestion(e, currentUser) {
    e.preventDefault();

    const subject = document.getElementById("subject").value;
    const question = document.getElementById("question").value.trim();
    const optionA = document.getElementById("optionA").value.trim();
    const optionB = document.getElementById("optionB").value.trim();
    const optionC = document.getElementById("optionC").value.trim();
    const optionD = document.getElementById("optionD").value.trim();
    const correctAnswer = document.getElementById("correctAnswer").value;

    if (!subject || !question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
        alert("Please fill in all question fields.");
        return;
    }

    const newQuestion = {
        id: Date.now(), // Unique ID for question
        teacherName: currentUser.name,
        teacherEmail: currentUser.email,
        subject: subject,
        question: question,
        options: { A: optionA, B: optionB, C: optionC, D: optionD },
        correctAnswer: correctAnswer,
        status: "Pending Review" 
    };

    pendingQuestions.push(newQuestion);
    saveData();
    alert("Question submitted successfully for review!");
    document.getElementById("addQuestionForm").reset();
    
    // Refresh the table
    displayPendingQuestions(currentUser);
}


// ---------- EVENT LISTENERS AND INITIALIZATION ----------
document.addEventListener("DOMContentLoaded", () => {
    
  // Global Initialization
  updateNavButtons();
    
  const learnerForm = document.getElementById("learnerForm");
  const teacherForm = document.getElementById("teacherForm");
  const loginForm = document.getElementById("loginForm");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink"); 
  const addQuestionForm = document.getElementById("addQuestionForm"); // NEW

  // --- Teacher Dashboard Logic ---
  if (window.location.pathname.includes("teacher-dashboard.html")) {
    const currentUser = checkTeacherAuth(); // Enforce authentication

    if (currentUser) {
        // Update welcome message
        const welcomeElement = document.getElementById("welcomeTeacher");
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${currentUser.name}!`;
        }
        
        // Setup form submission
        if (addQuestionForm) {
            addQuestionForm.addEventListener("submit", (e) => handleAddQuestion(e, currentUser));
        }

        // Display submitted questions
        displayPendingQuestions(currentUser);
    }
  }

  // --- Authentication Handlers ---
  if (forgotPasswordLink) {
      forgotPasswordLink.addEventListener("click", (e) => {
          e.preventDefault();
          handleForgotPassword();
      });
  }
  
  // ---- Learner Registration ----
  if (learnerForm) {
    learnerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("learnerName") ? document.getElementById("learnerName").value.trim() : '';
      const email = document.getElementById("learnerEmail") ? document.getElementById("learnerEmail").value.trim() : '';
      const password = document.getElementById("learnerPassword") ? document.getElementById("learnerPassword").value.trim() : '';

      if (!name || !email || !password) {
        alert("Please fill all registration fields.");
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

  // ---- Teacher Registration ----
  if (teacherForm) {
    teacherForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = document.getElementById("teacherName") ? document.getElementById("teacherName").value.trim() : '';
      const email = document.getElementById("teacherEmail") ? document.getElementById("teacherEmail").value.trim() : '';
      const password = document.getElementById("teacherPassword") ? document.getElementById("teacherPassword").value.trim() : '';

      if (!name || !email || !password) {
        alert("Please fill all registration fields.");
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

  // ---- Login ----
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
        // FIX: Redirect teachers to their new dashboard
        window.location.href = "teacher-dashboard.html"; 
      } else {
        alert("Invalid email or password. Please try again.");
      }
    });
  }
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

// ---------- LEADERBOARD ACCESS + INITIALIZATION ----------
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