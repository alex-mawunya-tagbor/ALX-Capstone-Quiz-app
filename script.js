// --- Mobile Navigation Toggle Logic ---
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        // Toggle the 'active' class on the navigation links list
        navLinks.classList.toggle("active");
        
        // Optionally change the icon from hamburger (☰) to close (X)
        if (navLinks.classList.contains("active")) {
            menuToggle.textContent = '✕'; 
        } else {
            menuToggle.textContent = '☰';
        }
    });
}

// ---------- GLOBAL QUIZ STATE VARIABLES ----------
let currentQuizQuestions = [];
let currentQuestionIndex = 0;
let currentScore = 0;
let selectedAnswer = null;

// ---------- DATA STRUCTURE SETUP ----------
const learners = JSON.parse(localStorage.getItem("learners")) || [];
const teachers = JSON.parse(localStorage.getItem("teachers")) || [];
const leaderboardData = JSON.parse(localStorage.getItem("eduQuizLeaderboard")) || [
  { name: "Akosua Mensah", score: 95, subject: "Mathematics" },
  { name: "Kwame Boateng", score: 90, subject: "ICT" },
  { name: "Efua Owusu", score: 88, subject: "Science" },
];
const pendingQuestions = JSON.parse(localStorage.getItem("pendingQuestions")) || []; 

// ---------- SUBJECT/LEVEL MAPPING (OpenTDB) ----------
const subjectToCategory = {
    "English": 10, // Books
    "Mathematics": 19, // Math
    "Science": 17, // Science & Nature
    // 🌟 FIX: Use the subject name 'ICT' here to match the leaderboard filter.
    "ICT": 18, // Computers (OpenTDB Category ID 18)
    "Computing": 18, // Retain for compatibility with old forms, but ICT is preferred
};

const levelToDifficulty = {
    "Basic 7": "easy",
    "Basic 8": "medium",
    "Basic 9": "hard",
};


// ---------- SAVE FUNCTIONS ----------
function saveData() {
  localStorage.setItem("learners", JSON.stringify(learners));
  localStorage.setItem("teachers", JSON.stringify(teachers));
  localStorage.setItem("eduQuizLeaderboard", JSON.stringify(leaderboardData));
  localStorage.setItem("pendingQuestions", JSON.stringify(pendingQuestions));
}

// ---------- AUTHENTICATION & NAV BAR FUNCTIONS (Unchanged) ----------
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

function handleForgotPassword() {
    const email = prompt("Enter your registered email address:");
    if (!email) return;

    const name = prompt("Enter your full name for verification:");
    if (!name) return;

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();
    let userRole = null;
    let userIndex = -1;

    const learnerIndex = learners.findIndex(l => l.email === trimmedEmail && l.name.toLowerCase() === trimmedName.toLowerCase());
    if (learnerIndex !== -1) {
        userRole = 'learner';
        userIndex = learnerIndex;
    }

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

function checkLearnerAuth() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    if (!currentUser || currentUser.role !== 'learner') {
        alert("Please log in as a learner to start a quiz.");
        window.location.href = "login.html";
        return null;
    }
    return currentUser;
}


// --------------------------------------------------------------------------------------------------
// QUIZ ENGINE FUNCTIONS 
// --------------------------------------------------------------------------------------------------

async function startQuiz(e) {
    e.preventDefault(); 
    console.log("Form submission prevented. Starting quiz fetch..."); 

    const currentUser = checkLearnerAuth();
    if (!currentUser) return;

    const quizSetup = document.getElementById("quizSetup");
    const quizSection = document.getElementById("quizSection");
    const quizTitle = document.getElementById("quizTitle");
    const startButton = e.target.querySelector('.start-btn'); 
    
    if (!quizSetup || !quizSection || !quizTitle || !startButton) {
        console.error("Missing required quiz elements in HTML.");
        alert("A critical part of the quiz page is missing. Please check your HTML structure.");
        return;
    }

    const level = document.getElementById("level").value;
    const subject = document.getElementById("subject").value;

    // 🌟 FIX: If the user selected "Computing" in the quiz form, we treat it as "ICT" 
    // when looking up the API category and when saving the score later.
    const normalizedSubject = (subject === 'Computing') ? 'ICT' : subject;

    const categoryId = subjectToCategory[subject];
    const difficulty = levelToDifficulty[level];
    
    if (!categoryId || !difficulty) {
        alert("Invalid subject or level selected. Please choose both options.");
        return;
    }

    // 1. Initial UI Feedback (Loading State)
    quizTitle.textContent = "Loading Questions...";
    quizSetup.classList.add("hidden"); 
    quizSection.classList.remove("hidden");
    startButton.disabled = true; 
    startButton.textContent = "Fetching..."; 

    // 2. Construct API URL
    const apiUrl = `https://opentdb.com/api.php?amount=10&category=${categoryId}&difficulty=${difficulty}&type=multiple&encode=base64`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        if (data.response_code !== 0) {
            alert(`Error fetching questions (Code: ${data.response_code}). No questions available for ${normalizedSubject} (${level}). Try a different selection.`);
            
            // Restore UI to setup screen
            quizSetup.classList.remove("hidden");
            quizSection.classList.add("hidden");
            return;
        }
        
        // 3. Success: Process Questions and set state
        currentQuizQuestions = formatApiQuestions(data.results);
        
        // Reset state
        currentQuestionIndex = 0;
        currentScore = 0;
        selectedAnswer = null;
        
        // Final UI Update on Success
        quizTitle.textContent = `${normalizedSubject} Quiz (Level: ${level})`;
        document.getElementById("scoreContainer").classList.add("hidden");
        document.getElementById("nextBtn").textContent = "Next Question";
        document.getElementById("nextBtn").classList.remove("hidden"); 
        document.getElementById("questionContainer").classList.remove("hidden"); 

        displayQuestion();

    } catch (error) {
        console.error("Fetch error:", error);
        alert("Failed to load quiz questions. Please check your internet connection.");
        
        // Restore UI on exception
        quizTitle.textContent = "Failed to Start Quiz";
        quizSetup.classList.remove("hidden");
        quizSection.classList.add("hidden");

    } finally {
        // Always reset button state after attempt
        startButton.disabled = false;
        startButton.textContent = "Start Quiz";
    }
}

// Utility to decode Base64 and format the question structure
function formatApiQuestions(apiResults) {
    return apiResults.map(q => {
        // Decode all Base64 strings to display correctly
        const questionText = atob(q.question);
        const correct = atob(q.correct_answer);
        const incorrect = q.incorrect_answers.map(a => atob(a));
        
        // Combine all answers and shuffle them
        const allAnswers = [...incorrect, correct];
        const shuffledAnswers = allAnswers.sort(() => 0.5 - Math.random());
        
        // Map answers to the 'A', 'B', 'C', 'D' option format
        const options = {};
        let correctAnswerKey = '';

        shuffledAnswers.forEach((answer, index) => {
            const key = String.fromCharCode(65 + index); // A, B, C, D
            options[key] = answer;
            if (answer === correct) {
                correctAnswerKey = key;
            }
        });

        return {
            question: questionText,
            options: options,
            correctAnswer: correctAnswerKey
        };
    });
}


function displayQuestion() {
    const qContainer = document.getElementById("questionContainer");
    const questionData = currentQuizQuestions[currentQuestionIndex];
    
    if (!questionData) {
        showResults(); 
        return;
    }

    qContainer.innerHTML = `
        <div class="question-header">
            <p>Question ${currentQuestionIndex + 1} of ${currentQuizQuestions.length}</p>
        </div>
        <div class="question-body">
            <h3>${questionData.question}</h3>
            <div class="options-group">
                ${Object.entries(questionData.options).map(([key, value]) => `
                    <button class="option-btn" data-option="${key}">${key}. ${value}</button>
                `).join('')}
            </div>
        </div>
    `;

    // Add event listeners to the newly created option buttons
    document.querySelectorAll(".option-btn").forEach(button => {
        button.addEventListener("click", selectAnswer);
    });
    
    document.getElementById("nextBtn").disabled = true;
    document.getElementById("nextBtn").classList.add("disabled");

    if (currentQuestionIndex === currentQuizQuestions.length - 1) {
        document.getElementById("nextBtn").textContent = "Finish Quiz";
    }
}

function selectAnswer(e) {
    const clickedButton = e.currentTarget; 
    
    document.querySelectorAll(".option-btn").forEach(btn => {
        btn.classList.remove("selected");
    });

    clickedButton.classList.add("selected");
    selectedAnswer = clickedButton.dataset.option;
    
    document.getElementById("nextBtn").disabled = false;
    document.getElementById("nextBtn").classList.remove("disabled");
}

function nextQuestion() {
    if (!selectedAnswer) {
        alert("Please select an answer before proceeding.");
        return;
    }

    const currentQ = currentQuizQuestions[currentQuestionIndex];
    if (selectedAnswer === currentQ.correctAnswer) {
        currentScore++;
    }

    selectedAnswer = null;
    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuizQuestions.length) {
        displayQuestion();
    } else {
        showResults();
    }
}

function showResults() {
    const totalQuestions = currentQuizQuestions.length;
    const finalScore = totalQuestions > 0 ? Math.round((currentScore / totalQuestions) * 100) : 0; 
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
    const subject = document.getElementById("subject").value;
    
    // 🌟 FIX: Normalize subject to 'ICT' before saving to leaderboard
    const normalizedSubject = (subject === 'Computing') ? 'ICT' : subject;

    const scoreContainer = document.getElementById("scoreContainer");
    
    scoreContainer.innerHTML = `
        <h2>Quiz Complete! 🎉</h2>
        <p>Your Score: <strong>${currentScore} out of ${totalQuestions}</strong></p>
        <h3>Percentage: <span class="final-percentage">${finalScore}%</span></h3>
        
        <div class="result-actions">
          <button class="btn-primary" onclick="window.location.reload()">Start New Quiz</button>
          <a href="leaderboard.html" class="btn-secondary">View Leaderboard</a>
        </div>
    `;

    // Save score to leaderboard (only for learners)
    if (currentUser && currentUser.role === 'learner') {
        const entry = {
            name: currentUser.name,
            score: finalScore,
            subject: normalizedSubject, // Saved as 'ICT'
            level: document.getElementById("level").value,
            date: new Date().toISOString()
        };
        leaderboardData.push(entry);
        saveData();
    }

    document.getElementById("questionContainer").classList.add("hidden");
    document.getElementById("nextBtn").classList.add("hidden");
    scoreContainer.classList.remove("hidden");
}

// --------------------------------------------------------------------------------------------------
// TEACHER DASHBOARD & AUTH FUNCTIONS (Unchanged)
// --------------------------------------------------------------------------------------------------
function checkTeacherAuth() {
    const currentUser = JSON.parse(localStorage.getItem("currentUser"));
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
        id: Date.now(), 
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
    
    displayPendingQuestions(currentUser);
}


// --------------------------------------------------------------------------------------------------
// INITIALIZATION AND EVENT LISTENERS
// --------------------------------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
    
  updateNavButtons();
    
  const learnerForm = document.getElementById("learnerForm");
  const teacherForm = document.getElementById("teacherForm");
  const loginForm = document.getElementById("loginForm");
  const forgotPasswordLink = document.getElementById("forgotPasswordLink"); 
  const addQuestionForm = document.getElementById("addQuestionForm"); 
  
  // Quiz Page Elements
  const quizSelectionForm = document.getElementById("quizSelectionForm");
  const nextBtn = document.getElementById("nextBtn");


  // --- Quiz Page Logic ---
  if (window.location.pathname.includes("quizzes.html")) {
      checkLearnerAuth(); 

      if (quizSelectionForm) {
          quizSelectionForm.addEventListener("submit", startQuiz); 
      }

      if (nextBtn) {
          nextBtn.addEventListener("click", nextQuestion);
      }
  }


  // --- Teacher Dashboard Logic ---
  if (window.location.pathname.includes("teacher-dashboard.html")) {
    const currentUser = checkTeacherAuth(); 

    if (currentUser) {
        const welcomeElement = document.getElementById("welcomeTeacher");
        if (welcomeElement) {
            welcomeElement.textContent = `Welcome, ${currentUser.name}!`;
        }
        
        if (addQuestionForm) {
            addQuestionForm.addEventListener("submit", (e) => handleAddQuestion(e, currentUser));
        }

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
  
  // ---- Registration ----
  if (learnerForm) {
    learnerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // Ensure IDs are correct for form inputs
      const name = document.getElementById("learnerName") ? document.getElementById("learnerName").value.trim() : e.target.elements[0].value.trim();
      const email = document.getElementById("learnerEmail") ? document.getElementById("learnerEmail").value.trim() : e.target.elements[1].value.trim();
      const password = document.getElementById("learnerPassword") ? document.getElementById("learnerPassword").value.trim() : e.target.elements[2].value.trim();

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

  if (teacherForm) {
    teacherForm.addEventListener("submit", (e) => {
      e.preventDefault();
      
      const name = document.getElementById("teacherName") ? document.getElementById("teacherName").value.trim() : e.target.elements[0].value.trim();
      const email = document.getElementById("teacherEmail") ? document.getElementById("teacherEmail").value.trim() : e.target.elements[1].value.trim();
      const password = document.getElementById("teacherPassword") ? document.getElementById("teacherPassword").value.trim() : e.target.elements[2].value.trim();

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
      
      const email = document.getElementById("loginEmail") ? document.getElementById("loginEmail").value.trim() : e.target.elements[0].value.trim();
      const password = document.getElementById("loginPassword") ? document.getElementById("loginPassword").value.trim() : e.target.elements[1].value.trim();

      const learner = learners.find((l) => l.email === email && l.password === password);
      const teacher = teachers.find((t) => t.email === email && t.password === password);

      if (learner) {
        localStorage.setItem("currentUser", JSON.stringify(learner));
        alert(`Welcome ${learner.name}!`);
        window.location.href = "quizzes.html";
      } else if (teacher) {
        localStorage.setItem("currentUser", JSON.stringify(teacher));
        alert(`Welcome ${teacher.name}!`);
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

  // The 'subject' passed here comes from the dropdown in leaderboard.html (ICT, Science, Math, English)
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

document.addEventListener("DOMContentLoaded", () => {
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