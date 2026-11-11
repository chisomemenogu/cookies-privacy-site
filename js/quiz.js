/* =========================================================
   quiz.js
   Logic for the cookies and privacy self-assessment quiz.
   Handles: starting the timer, enabling the form, grading the
   answers, showing results with colors, and resetting the quiz.
   No external libraries are used.
   ========================================================= */

(function () {
  "use strict";

  // ----- Settings -----
  var QUIZ_SECONDS = 600;   // 10-minute time limit
  var PASS_SCORE = 7;       // 7 of 10 correct = pass

  // ----- Answer key -----
  // "text" questions list every accepted answer, already in lowercase.
  // "single" questions have one correct value; "multi" questions have a list.
  var QUESTIONS = [
    { name: "q1", type: "text",   answers: ["first", "first-party", "first party"], display: "first-party" },
    { name: "q2", type: "text",   answers: ["set-cookie", "set cookie"],            display: "Set-Cookie" },
    { name: "q3", type: "text",   answers: ["secure"],                              display: "Secure" },
    { name: "q4", type: "single", answers: ["b"] },
    { name: "q5", type: "single", answers: ["c"] },
    { name: "q6", type: "single", answers: ["b"] },
    { name: "q7", type: "single", answers: ["a"] },
    { name: "q8", type: "multi",  answers: ["a", "c"] },
    { name: "q9", type: "multi",  answers: ["a", "b", "d"] },
    { name: "q10", type: "multi", answers: ["a", "b", "d"] }
  ];

  // ----- Page elements -----
  var form = document.getElementById("quiz-form");
  var startBtn = document.getElementById("start-btn");
  var submitBtn = document.getElementById("submit-btn");
  var resetBtn = document.getElementById("reset-btn");
  var timeLeftEl = document.getElementById("time-left");
  var resultsPanel = document.getElementById("results-panel");
  var overallEl = document.getElementById("overall-result");
  var totalScoreEl = document.getElementById("total-score");
  var timeSpentEl = document.getElementById("time-spent");
  var resultList = document.getElementById("result-list");
  var questionFieldsets = form.querySelectorAll("fieldset.question");

  // ----- State -----
  var timerId = null;     // id returned by setInterval
  var startTime = 0;      // time (ms) when the quiz started
  var quizActive = false; // true only while the quiz is running

  // Formats seconds as m:ss, for example 600 becomes "10:00".
  function formatTime(totalSeconds) {
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ":" + (seconds < 10 ? "0" : "") + seconds;
  }

  // Turns every question's inputs on or off by disabling its fieldset.
  function setQuestionsEnabled(enabled) {
    for (var i = 0; i < questionFieldsets.length; i++) {
      questionFieldsets[i].disabled = !enabled;
    }
  }

  // Returns the values of all checked radio buttons or checkboxes for a question.
  function getCheckedValues(name) {
    // Radio buttons use the question name; checkboxes use data-q.
    var checked = form.querySelectorAll(
      'input[name="' + name + '"]:checked, input[data-q="' + name + '"]:checked'
    );
    var values = [];
    for (var i = 0; i < checked.length; i++) {
      values.push(checked[i].value);
    }
    return values;
  }

  // Returns the visible label text for one option, such as "b) HttpOnly".
  function getOptionText(name, value) {
    var input = form.querySelector(
      'input[name="' + name + '"][value="' + value + '"], input[data-q="' + name + '"][value="' + value + '"]'
    );
    return input ? input.parentNode.textContent.trim() : value;
  }

  // Checks whether two arrays hold  the same values, in any order.
  function sameValues(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    var sortedA = a.slice().sort();
    var sortedB = b.slice().sort();
    for (var i = 0; i < sortedA.length; i++) {
      if (sortedA[i] !== sortedB[i]) {
        return false;
      }
    }
    return true;
  }

  // Grades one question. Returns an object with the result and text for display.
  function gradeQuestion(question) {
    var result = { correct: false, yourAnswer: "No answer", correctAnswer: "" };

    if (question.type === "text") {
      var typed = form.elements[question.name].value.trim().toLowerCase();
      result.correct = question.answers.indexOf(typed) !== -1;
      result.yourAnswer = typed === "" ? "No answer" : form.elements[question.name].value.trim();
      result.correctAnswer = question.display;
    } else {
      var chosen = getCheckedValues(question.name);
      result.correct = sameValues(chosen, question.answers);
      if (chosen.length > 0) {
        var chosenText = [];
        for (var i = 0; i < chosen.length; i++) {
          chosenText.push(getOptionText(question.name, chosen[i]));
        }
        result.yourAnswer = chosenText.join("; ");
      }
      var correctText = [];
      for (var j = 0; j < question.answers.length; j++) {
        correctText.push(getOptionText(question.name, question.answers[j]));
      }
      result.correctAnswer = correctText.join("; ");
    }
    return result;
  }

  // Creates one line in the results list for a graded question.
  function buildResultItem(number, result) {
    var item = document.createElement("li");
    item.className = "result-item " + (result.correct ? "correct" : "incorrect");

    var status = document.createElement("strong");
    status.textContent = result.correct ? "Correct" : "Incorrect";
    item.appendChild(status);

    item.appendChild(document.createTextNode(" Your answer: " + result.yourAnswer + ". "));
    item.appendChild(document.createTextNode("Correct answer: " + result.correctAnswer + "."));
    return item;
  }

  // Stops the quiz, grades every question, and shows the results.
  // timedOut is true when the time limit ran out.
  function finishQuiz(timedOut) {
    if (!quizActive) {
      return;
    }
    quizActive = false;
    clearInterval(timerId);

    // Time spent in seconds, capped at the 10-minute limit.
    var elapsed = Math.min(Math.floor((Date.now() - startTime) / 1000), QUIZ_SECONDS);

    // Grade every question and build the results list.
    var score = 0;
    resultList.innerHTML = "";
    for (var i = 0; i < QUESTIONS.length; i++) {
      var result = gradeQuestion(QUESTIONS[i]);
      if (result.correct) {
        score++;
      }
      resultList.appendChild(buildResultItem(i + 1, result));
    }

    // Overall pass or fail, colored to match.
    var passed = score >= PASS_SCORE;
    overallEl.textContent = passed ? "PASS" : "FAIL";
    overallEl.className = "overall-result " + (passed ? "pass" : "fail");
    totalScoreEl.textContent = score + " / " + QUESTIONS.length +
      " (" + Math.round((score / QUESTIONS.length) * 100) + "%)";
    timeSpentEl.textContent = formatTime(elapsed) + (timedOut ? " (time ran out)" : "");

    // Lock the form and show the results.
    setQuestionsEnabled(false);
    submitBtn.disabled = true;
    timeLeftEl.textContent = timedOut ? "Time up" : "Finished";
    resultsPanel.hidden = false;
    resultsPanel.focus();
  }

  // Runs once per second: updates the countdown and ends the quiz at zero.
  function tick() {
    var elapsed = Math.floor((Date.now() - startTime) / 1000);
    var remaining = Math.max(QUIZ_SECONDS - elapsed, 0);
    timeLeftEl.textContent = formatTime(remaining);
    if (remaining === 0) {
      finishQuiz(true);
    }
  }

  // Starts the quiz: enables the questions and starts the timer.
  function startQuiz() {
    if (quizActive) {
      return;
    }
    quizActive = true;
    startTime = Date.now();
    setQuestionsEnabled(true);
    submitBtn.disabled = false;
    startBtn.disabled = true;
    tick();
    timerId = setInterval(tick, 1000);
  }

  // Resets the quiz: clears all answers and results and returns to the start state.
  function resetQuiz() {
    clearInterval(timerId);
    quizActive = false;
    form.reset();
    setQuestionsEnabled(false);
    resultList.innerHTML = "";
    resultsPanel.hidden = true;
    timeLeftEl.textContent = formatTime(QUIZ_SECONDS);
    startBtn.disabled = false;
    submitBtn.disabled = true;
  }

  // ----- Event listeners -----
  startBtn.addEventListener("click", startQuiz);
  resetBtn.addEventListener("click", resetQuiz);

  // Submitting the form (button or Enter key) finishes the quiz.
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    finishQuiz(false);
  });

  // Start in the ready state: questions locked, submit disabled.
  setQuestionsEnabled(false);
})();
