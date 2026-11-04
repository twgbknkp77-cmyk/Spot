// FITNESS TRACKER â€” PROFILE AND GOALS

const PROFILE_GOALS_KEY =
  "fitness_profile_goals";


// GET SAVED PROFILE GOALS
function getProfileGoals() {
  try {
    return JSON.parse(
      localStorage.getItem(
        PROFILE_GOALS_KEY
      )
    ) || {};
  } catch {
    return {};
  }
}


// SAVE PROFILE GOALS
function saveProfileGoals(goals) {
  localStorage.setItem(
    PROFILE_GOALS_KEY,
    JSON.stringify(goals)
  );
}


// NORMALISE AN EXERCISE NAME
function normaliseExerciseName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}


// GET EXERCISE NAMES FROM ALL SAVED PROGRAMMES
function getProgrammeExerciseNames() {
  const names = new Map();

  getProgrammes().forEach(programme => {
    (programme.weeks || []).forEach(week => {
      (week.trainingDays || []).forEach(workout => {
        (workout.exercises || []).forEach(exercise => {
          const name = String(exercise.name || "").trim();
          const key = normaliseExerciseName(name);

          if (key && !names.has(key)) {
            names.set(key, name);
          }
        });
      });
    });
  });

  return [...names.values()].sort((a, b) =>
    a.localeCompare(b)
  );
}


// FILL THE EXERCISE SUGGESTION LIST
function populateExerciseSuggestions() {
  // Exercise goals now use a freely typed name.
}


// USE THE SAVED SPELLING OF AN EXERCISE WHEN POSSIBLE
function getCanonicalExerciseName(name) {
  const requested = normaliseExerciseName(name);

  return getProgrammeExerciseNames().find(
    exerciseName =>
      normaliseExerciseName(exerciseName) === requested
  ) || name.trim();
}


// FIND THE BEST COMPLETED WEIGHT
function getBestExerciseWeight(exerciseName) {
  let history = [];

  try {
    history = JSON.parse(
      localStorage.getItem(
        "fitness_workout_history"
      ) || "[]"
    );
  } catch {
    history = [];
  }

  const requestedName =
    normaliseExerciseName(exerciseName);

  let bestWeight = 0;

  history.forEach(session => {
    const exercises =
      Array.isArray(session.exercises)
        ? session.exercises
        : [];

    exercises.forEach(exercise => {
      const sameExercise =
        normaliseExerciseName(exercise.name) ===
        requestedName;

      if (!sameExercise) return;

      const sets =
        Array.isArray(exercise.sets)
          ? exercise.sets
          : [];

      sets.forEach(set => {
        const weight = Number(set.weight);

        if (
          set.completed &&
          Number.isFinite(weight) &&
          weight > bestWeight
        ) {
          bestWeight = weight;
        }
      });
    });
  });

  return bestWeight;
}


// DISPLAY SAVED BODYWEIGHT GOAL
function renderBodyweightGoal() {
  const goals = getProfileGoals();

  const bodyweightGoal =
    goals.bodyweight;

  const weightInput =
    document.getElementById(
      "goalBodyweight"
    );

  const dateInput =
    document.getElementById(
      "goalBodyweightDate"
    );

  const message =
    document.getElementById(
      "bodyweightGoalMessage"
    );

  const stats=document.getElementById("bodyweightGoalStats");
  const currentOutput=document.getElementById("bodyweightGoalCurrent");
  const targetOutput=document.getElementById("bodyweightGoalTarget");
  const remainingOutput=document.getElementById("bodyweightGoalRemaining");

  if (
    !weightInput ||
    !dateInput ||
    !message
  ) {
    return;
  }

  if (!bodyweightGoal) {
    message.textContent = "Set Goal";
    if(stats)stats.hidden=true;
    weightInput.value="";
    dateInput.value="";

    return;
  }

  weightInput.value =
    bodyweightGoal.targetWeight;

  dateInput.value =
    bodyweightGoal.targetDate || "";

  const weights=FitnessStorage.getWeights().filter(entry=>entry&&Number.isFinite(Number(entry.weight))).sort((a,b)=>new Date(a.recordedAt||`${a.date}T12:00:00`)-new Date(b.recordedAt||`${b.date}T12:00:00`));
  const current=weights.length?Number(weights[weights.length-1].weight):null;
  const target=Number(bodyweightGoal.targetWeight);
  const remaining=current===null?null:Math.abs(target-current);
  message.textContent = bodyweightGoal.targetDate ? `Target ${target} kg · ${bodyweightGoal.targetDate}` : `Target ${target} kg`;
  if(stats)stats.hidden=false;
  if(currentOutput)currentOutput.textContent=current===null?"--":`${current.toFixed(1)} kg`;
  if(targetOutput)targetOutput.textContent=`${target.toFixed(1)} kg`;
  if(remainingOutput)remainingOutput.textContent=remaining===null?"--":`${remaining.toFixed(1)} kg`;
}


// SAVE BODYWEIGHT GOAL
document
  .getElementById("saveBodyweightGoal")
  ?.addEventListener("click", () => {
    const weightInput =
      document.getElementById(
        "goalBodyweight"
      );

    const dateInput =
      document.getElementById(
        "goalBodyweightDate"
      );

    const targetWeight =
      Number(weightInput.value);

    const targetDate =
      dateInput.value;

    if (
      !Number.isFinite(targetWeight) ||
      targetWeight < 20 ||
      targetWeight > 300
    ) {
      alert(
        "Please enter a valid target weight."
      );

      return;
    }

    const goals = getProfileGoals();

    /*
     * Preserve an existing starting weight.
     * If this is a new goal, use the latest
     * recorded bodyweight as its starting point.
     */
    let startingWeight =
      goals.bodyweight?.startingWeight;

    if (!Number.isFinite(startingWeight)) {
      const weights =
        FitnessStorage.getWeights()
          .filter(entry =>
            entry &&
            Number.isFinite(entry.weight)
          )
          .sort((a, b) => {
            const aTime =
              a.recordedAt
                ? new Date(
                    a.recordedAt
                  ).getTime()
                : new Date(
                    `${a.date}T12:00:00`
                  ).getTime();

            const bTime =
              b.recordedAt
                ? new Date(
                    b.recordedAt
                  ).getTime()
                : new Date(
                    `${b.date}T12:00:00`
                  ).getTime();

            return aTime - bTime;
          });

      startingWeight =
        weights.length > 0
          ? weights[
              weights.length - 1
            ].weight
          : null;
    }

    goals.bodyweight = {
      targetWeight,
      targetDate,
      startingWeight
    };

    saveProfileGoals(goals);
    renderBodyweightGoal();
    document.getElementById("bodyweightGoalEditor")?.removeAttribute("open");

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }
  });


// CLOSE BODYWEIGHT EDITOR WITHOUT SAVING
document
  .getElementById("cancelBodyweightGoal")
  ?.addEventListener("click", () => {
    renderBodyweightGoal();
    document.getElementById("bodyweightGoalEditor")?.removeAttribute("open");
  });


// RESET BODYWEIGHT GOAL STARTING POINT
document
  .getElementById("resetBodyweightGoalStart")
  ?.addEventListener("click", () => {
    const goals = getProfileGoals();

    if (!goals.bodyweight) {
      alert("Save a bodyweight goal first.");
      return;
    }

    const weights = FitnessStorage.getWeights()
      .filter(entry => entry && Number.isFinite(entry.weight))
      .sort((a, b) => {
        const aTime = a.recordedAt
          ? new Date(a.recordedAt).getTime()
          : new Date(`${a.date}T12:00:00`).getTime();

        const bTime = b.recordedAt
          ? new Date(b.recordedAt).getTime()
          : new Date(`${b.date}T12:00:00`).getTime();

        return aTime - bTime;
      });

    if (weights.length === 0) {
      alert("Add a bodyweight measurement first.");
      return;
    }

    if (!confirm("Use your latest weight as the new starting point?")) {
      return;
    }

    goals.bodyweight.startingWeight =
      weights[weights.length - 1].weight;

    saveProfileGoals(goals);
    renderBodyweightGoal();

    if (typeof updateDashboard === "function") {
      updateDashboard();
    }
  });


// DISPLAY SAVED EXERCISE GOALS
function renderExerciseGoalsLegacy() {
  const container =
    document.getElementById(
      "exerciseGoalsList"
    );

  if (!container) return;

  const goals = getProfileGoals();

  const exerciseGoals =
    Array.isArray(goals.exerciseGoals)
      ? goals.exerciseGoals
      : [];

  container.innerHTML = "";

  if (exerciseGoals.length === 0) {
    container.innerHTML =
      "<p>No exercise goals saved yet.</p>";

    return;
  }

  exerciseGoals.forEach(goal => {
    const card =
      document.createElement("div");

    card.className = "card";

    const heading =
      document.createElement("h3");

    heading.textContent =
      goal.exerciseName;

    const target =
      document.createElement("p");

    target.textContent =
      `Target: ${goal.targetWeight} kg`;

    const bestWeight =
      getBestExerciseWeight(
        goal.exerciseName
      );

    const current =
      document.createElement("p");

    current.textContent =
      bestWeight > 0
        ? `Current best: ${bestWeight} kg`
        : "Current best: No completed sets yet";

    const percentage =
      goal.targetWeight > 0
        ? Math.min(
            100,
            Math.round(
              (
                bestWeight /
                goal.targetWeight
              ) * 100
            )
          )
        : 0;

    const progress =
      document.createElement("p");

    progress.textContent =
      `Progress: ${percentage}%`;

    const removeButton =
      document.createElement("button");

    removeButton.textContent =
      "Remove Goal";

    removeButton.addEventListener(
      "click",
      () => {
        if (
          !confirm(
            `Remove the ${goal.exerciseName} goal?`
          )
        ) {
          return;
        }

        const updatedGoals =
          getProfileGoals();

        updatedGoals.exerciseGoals =
          (
            updatedGoals.exerciseGoals ||
            []
          ).filter(
            item => item.id !== goal.id
          );

        saveProfileGoals(updatedGoals);
        renderExerciseGoals();

        if (
          typeof updateDashboard ===
          "function"
        ) {
          updateDashboard();
        }
      }
    );

    const editButton =
      document.createElement("button");

    editButton.textContent = "Edit Goal";

    editButton.addEventListener("click", () => {
      const weight = prompt(
        "Target weight (kg):",
        goal.targetWeight
      );

      if (weight === null) return;

      const targetWeight = Number(weight);

      if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
        alert("Please enter a valid target weight.");
        return;
      }

      const updatedGoals = getProfileGoals();
      const savedGoal = (updatedGoals.exerciseGoals || []).find(
        item => item.id === goal.id
      );

      if (!savedGoal) return;

      savedGoal.targetWeight = targetWeight;

      // Old repetition values are no longer used.
      delete savedGoal.targetReps;

      saveProfileGoals(updatedGoals);
      renderExerciseGoals();

      if (typeof updateDashboard === "function") {
        updateDashboard();
      }
    });

    card.append(
      heading,
      target,
      current,
      progress,
      editButton,
      removeButton
    );

    container.appendChild(card);
  });
}


// COMPACT EXERCISE GOAL CARDS
function renderExerciseGoals() {
  const container = document.getElementById("exerciseGoalsList");
  if (!container) return;

  const goals = getProfileGoals();
  const exerciseGoals = Array.isArray(goals.exerciseGoals)
    ? goals.exerciseGoals
    : [];

  container.innerHTML = "";

  if (exerciseGoals.length === 0) {
    container.innerHTML = "<div class='card empty-state-card'><p>No exercise goals saved yet.</p></div>";
    return;
  }

  exerciseGoals.forEach(goal => {
    const bestWeight = getBestExerciseWeight(goal.exerciseName);
    const percentage = goal.targetWeight > 0
      ? Math.min(100, Math.round((bestWeight / goal.targetWeight) * 100))
      : 0;

    const card = document.createElement("div");
    card.className = "card goal-card";
    const header = document.createElement("div");
    header.className = "compact-card-header";
    const copy = document.createElement("div");
    const heading = document.createElement("h3");
    heading.textContent = goal.exerciseName;
    const current = document.createElement("p");
    current.textContent = bestWeight > 0
      ? `Current: ${bestWeight} kg • Target: ${goal.targetWeight} kg`
      : `No result yet • Target: ${goal.targetWeight} kg`;
    copy.append(heading, current);

    const menu = document.createElement("details");
    menu.className = "overflow-menu";
    const summary = document.createElement("summary");
    summary.textContent = "⋯";
    summary.setAttribute("aria-label", `${goal.exerciseName} goal options`);
    const panel = document.createElement("div");
    panel.className = "overflow-menu-panel";

    const edit = document.createElement("button");
    edit.textContent = "Edit goal";
    edit.addEventListener("click", () => {
      const value = prompt("Target weight (kg):", goal.targetWeight);
      if (value === null) return;
      const targetWeight = Number(value);
      if (!Number.isFinite(targetWeight) || targetWeight <= 0) {
        alert("Please enter a valid target weight.");
        return;
      }
      const updated = getProfileGoals();
      const saved = (updated.exerciseGoals || []).find(item => item.id === goal.id);
      if (!saved) return;
      saved.targetWeight = targetWeight;
      delete saved.targetReps;
      saveProfileGoals(updated);
      renderExerciseGoals();
      if (typeof updateDashboard === "function") updateDashboard();
    });

    const remove = document.createElement("button");
    remove.textContent = "Remove goal";
    remove.className = "danger-action";
    remove.addEventListener("click", async () => {
      if (!await showSpotConfirm(
        `Remove ${goal.exerciseName}?`,
        "This exercise goal will be removed from your profile and dashboard.",
        { confirmText: "Remove Goal", danger: true }
      )) return;
      const updated = getProfileGoals();
      updated.exerciseGoals = (updated.exerciseGoals || [])
        .filter(item => item.id !== goal.id);
      saveProfileGoals(updated);
      renderExerciseGoals();
      if (typeof updateDashboard === "function") updateDashboard();
    });

    panel.append(edit, remove);
    menu.append(summary, panel);
    header.append(copy, menu);

    const progress = document.createElement("div");
    progress.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${percentage}%`;
    progress.appendChild(fill);

    const label = document.createElement("p");
    label.textContent = `${percentage}% complete`;
    card.append(header, progress, label);
    container.appendChild(card);
  });
}


// ADD EXERCISE GOAL
document
  .getElementById("addExerciseGoal")
  ?.addEventListener("click", () => {
    const nameInput =
      document.getElementById(
        "exerciseGoalName"
      );

    const weightInput =
      document.getElementById(
        "exerciseGoalWeight"
      );

    const exerciseName =
      getCanonicalExerciseName(
        nameInput.value
      );

    const targetWeight =
      Number(weightInput.value);

    if (!exerciseName) {
      alert(
        "Please enter an exercise name."
      );

      return;
    }

    if (
      !Number.isFinite(targetWeight) ||
      targetWeight <= 0
    ) {
      alert(
        "Please enter a valid target weight."
      );

      return;
    }

    const goals = getProfileGoals();

    if (
      !Array.isArray(
        goals.exerciseGoals
      )
    ) {
      goals.exerciseGoals = [];
    }

    goals.exerciseGoals.push({
      id: createId(),
      exerciseName,
      targetWeight
    });

    saveProfileGoals(goals);

    nameInput.value = "";
    weightInput.value = "";

    renderExerciseGoals();
    document.getElementById("exerciseGoalEditor")?.removeAttribute("open");

    if (
      typeof updateDashboard ===
      "function"
    ) {
      updateDashboard();
    }
  });


// CLOSE EXERCISE GOAL EDITOR WITHOUT SAVING
document
  .getElementById("cancelExerciseGoal")
  ?.addEventListener("click", () => {
    const nameInput = document.getElementById("exerciseGoalName");
    const weightInput = document.getElementById("exerciseGoalWeight");
    if (nameInput) nameInput.value = "";
    if (weightInput) weightInput.value = "";
    document.getElementById("exerciseGoalEditor")?.removeAttribute("open");
  });


// INITIAL DISPLAY
populateExerciseSuggestions();
renderBodyweightGoal();
renderExerciseGoals();

function getTrainingVolume() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem("fitness_workout_history") || "[]"); } catch {}
  if (!Array.isArray(history)) return 0;
  return Math.round(history.reduce((sessionTotal, session) => sessionTotal +
    (session.exercises || []).reduce((exerciseTotal, exercise) => exerciseTotal +
      (exercise.sets || []).reduce((setTotal, set) => {
        if (set.completed === false && (set.weight === "" || set.reps === "")) return setTotal;
        return setTotal + ((Number(set.weight) || 0) * (Number(set.reps) || 0));
      }, 0), 0), 0));
}

function trainingSessionVolume(session) {
  return Math.round((session?.exercises || []).reduce((exerciseTotal, exercise) => exerciseTotal +
    (exercise.sets || []).reduce((setTotal, set) => setTotal + ((Number(set.weight) || 0) * (Number(set.reps) || 0)), 0), 0));
}

function trainingBestSet(exercise) {
  const sets = (exercise?.sets || []).filter(set => Number(set.weight) >= 0 && Number(set.reps) > 0);
  return sets.sort((a,b) => (Number(b.weight)-Number(a.weight)) || (Number(b.reps)-Number(a.reps)))[0] || null;
}

function calculateSessionXp(session, previousSession = null, weekCompleted = false) {
  const volume = trainingSessionVolume(session);
  let xp = 100 + Math.floor(volume / 100);
  const cardioMinutes = (session?.exercises || []).reduce((sum, exercise) => sum + (exercise.type === "cardio" ? Number(exercise.durationMinutes) || 0 : 0), 0);
  xp += Math.floor(cardioMinutes * 2);
  if (previousSession) {
    const oldVolume = trainingSessionVolume(previousSession);
    if (oldVolume > 0 && volume > oldVolume) xp += Math.round(((volume - oldVolume) / oldVolume) * 100) * 5;
    (session.exercises || []).forEach(exercise => {
      const previousExercise = (previousSession.exercises || []).find(item => String(item.name || "").trim().toLowerCase() === String(exercise.name || "").trim().toLowerCase());
      const currentBest = trainingBestSet(exercise), previousBest = trainingBestSet(previousExercise);
      if (currentBest && previousBest && Number(currentBest.weight) >= Number(previousBest.weight) && Number(currentBest.reps) > Number(previousBest.reps)) xp += 25;
    });
  }
  if (weekCompleted) xp += 200;
  return Math.max(0, Math.round(xp));
}

function calculateTrainingXp() {
  let history = [];
  try { history = JSON.parse(localStorage.getItem("fitness_workout_history") || "[]"); } catch {}
  if (!Array.isArray(history)) return 0;
  history.sort((a,b) => new Date(a.finishedAt || a.startedAt) - new Date(b.finishedAt || b.startedAt));
  const previousByWorkout = new Map();
  let xp = 0;
  history.forEach(session => {
    const key = `${session.programmeId || session.programmeName}|${String(session.workoutName || "").toLowerCase()}`;
    xp += calculateSessionXp(session, previousByWorkout.get(key) || null, false);
    previousByWorkout.set(key, session);
  });
  const weeks = new Map();
  history.forEach(session => {
    const key = `${session.programmeId || session.programmeName}|${session.weekId || session.weekNumber}`;
    if (!weeks.has(key)) weeks.set(key, { workouts:new Set(), planned:0 });
    const group = weeks.get(key);
    group.workouts.add(session.workoutId || session.workoutName);
    group.planned = Math.max(group.planned, Number(session.scheduledWorkoutCount) || 0);
  });
  weeks.forEach(group => { if (group.planned > 0 && group.workouts.size >= group.planned) xp += 200; });
  return Math.round(xp);
}

function trainingLevelFromXp(totalXp) {
  let level = 1, remaining = Math.max(0, totalXp), required = 500;
  while (remaining >= required) { remaining -= required; level += 1; required = 500 + (level - 1) * 250; }
  return { level, remaining, required, percentage: required ? remaining / required * 100 : 0 };
}

function renderTrainingLevel() {
  const volume = getTrainingVolume();
  const totalXp = calculateTrainingXp();
  const levelState = trainingLevelFromXp(totalXp);
  const { level, remaining, required, percentage } = levelState;
  const summary = document.getElementById("profileLevelSummary");
  if (summary) summary.textContent = `Level ${level}`;
  const number = document.getElementById("trainingLevelNumber");
  const total = document.getElementById("trainingLevelVolume");
  const next = document.getElementById("trainingLevelNext");
  const progress = document.getElementById("trainingLevelProgress");
  if (number) number.textContent = String(level);
  if (total) total.textContent = `${volume.toLocaleString("en-GB")} kg`;
  if (next) next.textContent = `${remaining.toLocaleString("en-GB")} of ${required.toLocaleString("en-GB")} XP`;
  if (progress) progress.style.width = `${percentage}%`;
  const xpTotal = document.getElementById("trainingLevelXp");
  if (xpTotal) xpTotal.textContent = `${totalXp.toLocaleString("en-GB")} XP`;
}

document.getElementById("openTrainingLevel")?.addEventListener("click", () => {
  renderTrainingLevel();
  showPage("trainingLevel");
});
document.getElementById("openProfileStatistics")?.addEventListener("click", () => {
  window.statisticsReturnPage = "profile";
  if (typeof openStatisticsPage === "function") openStatisticsPage();
  else showPage("statistics");
});
document.getElementById("trainingLevelBack")?.addEventListener("click", () => showPage("profile"));
renderTrainingLevel();
