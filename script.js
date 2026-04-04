const STORAGE_KEY = "bodywork_timer_state_v1";
const TEMPLATE_KEY = "bodywork_timer_templates_v1";

const defaultPlan = {
  totalMinutes: 120,

  sections: [
    {
      name: "もみほぐし",
      minutes: 60,
      steps: [
        { name: "首肩", minutes: 15 },
        { name: "背中", minutes: 15 },
        { name: "腰", minutes: 10 },
        { name: "右脚", minutes: 10 },
        { name: "左脚", minutes: 10 },
      ],
    },
    {
      name: "足ツボ",
      minutes: 30,
      steps: [
        { name: "右足裏", minutes: 10 },
        { name: "左足裏", minutes: 10 },
        { name: "ふくらはぎ", minutes: 10 },
      ],
    },
    {
      name: "ヘッド",
      minutes: 10,
      steps: [{ name: "頭部全体", minutes: 10 }],
    },
    {
      name: "ストレッチ",
      minutes: 10,
      steps: [{ name: "全身ストレッチ", minutes: 10 }],
    },
  ],
};

const state = {
  plan: loadPlan(),
  templates: loadTemplates(),
  view: "settings",
  runtime: {
    queue: [],
    currentIndex: 0,
    remainingSec: 0,
    totalRemainingSec: 0,
    running: false,
    timerId: null,
    memoMap: {},
    soundEnabled: true,
  },
};

const el = {
  settingsView: document.getElementById("settingsView"),
  runView: document.getElementById("runView"),
  goSettingsBtn: document.getElementById("goSettingsBtn"),
  goRunBtn: document.getElementById("goRunBtn"),

  totalMinutes: document.getElementById("totalMinutes"),

  sectionsContainer: document.getElementById("sectionsContainer"),
  detailsContainer: document.getElementById("detailsContainer"),
  sectionSummary: document.getElementById("sectionSummary"),

  templateNameInput: document.getElementById("templateNameInput"),
  templateSelect: document.getElementById("templateSelect"),
  saveTemplateBtn: document.getElementById("saveTemplateBtn"),
  duplicateTemplateBtn: document.getElementById("duplicateTemplateBtn"),
  loadTemplateBtn: document.getElementById("loadTemplateBtn"),
  deleteTemplateBtn: document.getElementById("deleteTemplateBtn"),

  addSectionBtn: document.getElementById("addSectionBtn"),

  runCard: document.getElementById("runCard"),
  progressText: document.getElementById("progressText"),
  progressFill: document.getElementById("progressFill"),
  currentStepName: document.getElementById("currentStepName"),
  currentStepRemain: document.getElementById("currentStepRemain"),
  nextStepName: document.getElementById("nextStepName"),
  totalRemain: document.getElementById("totalRemain"),
  liveMemoInput: document.getElementById("liveMemoInput"),

  startBtn: document.getElementById("startBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resumeBtn: document.getElementById("resumeBtn"),
  prevBtn: document.getElementById("prevBtn"),
  skipBtn: document.getElementById("skipBtn"),
  stopBtn: document.getElementById("stopBtn"),
  restartBtn: document.getElementById("restartBtn"),
  soundEnabled: document.getElementById("soundEnabled"),
};

init();

function init() {
  bindEvents();
  renderAll();
}

function bindEvents() {
  el.goSettingsBtn.addEventListener("click", () => switchView("settings"));
  el.goRunBtn.addEventListener("click", () => {
    switchView("run");
    resetRuntime(false);
  });


    el[key].addEventListener("input", () => {
      state.plan[key] = toInt(el[key].value);
      savePlan();
      renderAll();
    });
  });

  el.addSectionBtn.addEventListener("click", () => {
    state.plan.sections.push({ name: "新規メニュー", minutes: 10, steps: [{ name: "工程1", minutes: 10 }] });
    savePlan();
    renderAll();
  });

  el.saveTemplateBtn.addEventListener("click", () => saveTemplate(false));
  el.duplicateTemplateBtn.addEventListener("click", () => saveTemplate(true));
  el.loadTemplateBtn.addEventListener("click", loadSelectedTemplate);
  el.deleteTemplateBtn.addEventListener("click", deleteSelectedTemplate);

  el.startBtn.addEventListener("click", startTimer);
  el.pauseBtn.addEventListener("click", pauseTimer);
  el.resumeBtn.addEventListener("click", resumeTimer);
  el.skipBtn.addEventListener("click", () => moveStep(1));
  el.prevBtn.addEventListener("click", () => moveStep(-1));
  el.stopBtn.addEventListener("click", stopTimer);
  el.restartBtn.addEventListener("click", () => {
    stopTimer();
    resetRuntime(true);
    renderRuntime();
  });

  document.querySelectorAll(".adjustBtn").forEach((btn) => {
    btn.addEventListener("click", () => adjustCurrentStep(Number(btn.dataset.adjust)));
  });

  el.soundEnabled.addEventListener("change", () => {
    state.runtime.soundEnabled = el.soundEnabled.checked;
  });

  el.liveMemoInput.addEventListener("input", () => {
    const key = getCurrentRuntimeStep()?.id;
    if (!key) return;
    state.runtime.memoMap[key] = el.liveMemoInput.value;
  });
}

function switchView(name) {
  state.view = name;
  el.settingsView.classList.toggle("active", name === "settings");
  el.runView.classList.toggle("active", name === "run");
}

function renderAll() {
  renderBasics();
  renderSections();
  renderDetails();
  renderTemplates();
  renderRuntime();
}

function renderBasics() {
  el.totalMinutes.value = state.plan.totalMinutes;


  const remain = state.plan.totalMinutes - used;
  el.remainingBadge.textContent = remain >= 0
    ? `残り ${remain} 分（施術時間に対して余裕あり）`
    : `超過 ${Math.abs(remain)} 分（時間調整が必要）`;
  el.remainingBadge.className = `badge ${remain >= 0 ? "ok" : "warn"}`;

}

function renderSections() {
  el.sectionsContainer.innerHTML = "";
  state.plan.sections.forEach((section, idx) => {
    const row = document.createElement("div");
    row.className = "section-row";

    const name = document.createElement("input");
    name.value = section.name;
    name.addEventListener("input", () => updateSection(idx, { name: name.value }));

    const minutes = document.createElement("input");
    minutes.type = "number";
    minutes.min = "1";
    minutes.value = section.minutes;
    minutes.addEventListener("input", () => updateSection(idx, { minutes: toInt(minutes.value) }));

    const actions = actionButtons([
      { label: "↑", onClick: () => moveItem(state.plan.sections, idx, -1) },
      { label: "↓", onClick: () => moveItem(state.plan.sections, idx, 1) },
      { label: "削除", onClick: () => removeSection(idx), danger: true },
    ]);

    row.append(name, minutes, actions);
    el.sectionsContainer.append(row);
  });
}

function renderDetails() {
  el.detailsContainer.innerHTML = "";

  state.plan.sections.forEach((section, sIdx) => {
    const card = document.createElement("div");
    card.className = "card";

    const sumSteps = section.steps.reduce((a, s) => a + toInt(s.minutes), 0);
    const mismatch = sumSteps !== toInt(section.minutes);

    card.innerHTML = `<h3>${section.name} (${section.minutes}分)</h3>
      <p class="helper-text ${mismatch ? "warn" : ""}">
      サブ工程合計: ${sumSteps} 分 ${mismatch ? "※親項目と一致していません" : "✓一致"}
      </p>`;

    section.steps.forEach((step, stIdx) => {
      const row = document.createElement("div");
      row.className = `step-row ${mismatch ? "warn-row" : ""}`;

      const nameInput = document.createElement("input");
      nameInput.value = step.name;
      nameInput.addEventListener("input", () => updateStep(sIdx, stIdx, { name: nameInput.value }));

      const minInput = document.createElement("input");
      minInput.type = "number";
      minInput.min = "1";
      minInput.value = step.minutes;
      minInput.addEventListener("input", () => updateStep(sIdx, stIdx, { minutes: toInt(minInput.value) }));

      const actions = actionButtons([
        { label: "↑", onClick: () => moveItem(section.steps, stIdx, -1) },
        { label: "↓", onClick: () => moveItem(section.steps, stIdx, 1) },
        { label: "左右複製", onClick: () => duplicateLRStep(sIdx, stIdx) },
        { label: "削除", onClick: () => removeStep(sIdx, stIdx), danger: true },
      ]);

      row.append(nameInput, minInput, actions);
      card.append(row);
    });

    const addStep = document.createElement("button");
    addStep.className = "btn secondary";
    addStep.textContent = "+ サブ工程を追加";
    addStep.addEventListener("click", () => {
      section.steps.push({ name: "新規部位", minutes: 5 });
      savePlan();
      renderAll();
    });
    card.append(addStep);

    el.detailsContainer.append(card);
  });
}

function renderTemplates() {
  el.templateSelect.innerHTML = "";
  state.templates.forEach((t, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = t.name;
    el.templateSelect.append(opt);
  });
}

function resetRuntime(withAnimation) {
  const queue = buildQueueFromPlan(state.plan);
  state.runtime.queue = queue;
  state.runtime.currentIndex = 0;
  state.runtime.remainingSec = queue[0]?.sec ?? 0;
  state.runtime.totalRemainingSec = queue.reduce((a, q) => a + q.sec, 0);
  state.runtime.running = false;
  clearInterval(state.runtime.timerId);

  if (withAnimation) animateStepSwitch();
}

function buildQueueFromPlan(plan) {
  const queue = [];


  plan.sections.forEach((section, sIdx) => {
    if (section.steps.length === 0) {
      queue.push({ id: `s-${sIdx}`, name: `${section.name}`, sec: section.minutes * 60 });
      return;
    }
    section.steps.forEach((step, stIdx) => {
      queue.push({ id: `s-${sIdx}-st-${stIdx}`, name: `${section.name} / ${step.name}`, sec: step.minutes * 60 });
    });
  });

  return queue;
}

function startTimer() {
  if (state.runtime.queue.length === 0) resetRuntime(false);
  if (state.runtime.queue.length === 0) return;
  if (state.runtime.running) return;

  state.runtime.running = true;
  state.runtime.timerId = setInterval(tick, 1000);
}

function tick() {
  if (!state.runtime.running) return;

  state.runtime.remainingSec -= 1;
  state.runtime.totalRemainingSec -= 1;

  if (state.runtime.remainingSec <= 0) {
    playBeep();
    if (!moveStep(1, true)) {
      stopTimer();
    }
  }

  renderRuntime();
}

function pauseTimer() {
  state.runtime.running = false;
}

function resumeTimer() {
  if (state.runtime.queue.length === 0) return;
  state.runtime.running = true;
}

function stopTimer() {
  state.runtime.running = false;
  clearInterval(state.runtime.timerId);
  state.runtime.timerId = null;
}

function moveStep(direction, fromAuto = false) {
  const next = state.runtime.currentIndex + direction;
  if (next < 0 || next >= state.runtime.queue.length) {
    if (fromAuto) {
      state.runtime.currentIndex = state.runtime.queue.length - 1;
      state.runtime.remainingSec = 0;
    }
    renderRuntime();
    return false;
  }

  state.runtime.currentIndex = next;
  state.runtime.remainingSec = state.runtime.queue[next].sec;
  animateStepSwitch();
  if (!fromAuto) playBeep();
  renderRuntime();
  return true;
}

function adjustCurrentStep(secDelta) {
  if (state.runtime.queue.length === 0) return;

  state.runtime.remainingSec = Math.max(0, state.runtime.remainingSec + secDelta);
  state.runtime.totalRemainingSec = Math.max(0, state.runtime.totalRemainingSec + secDelta);
  renderRuntime();
}

function renderRuntime() {
  if (state.runtime.queue.length === 0) resetRuntime(false);

  const current = getCurrentRuntimeStep();
  const next = state.runtime.queue[state.runtime.currentIndex + 1];

  el.currentStepName.textContent = current ? current.name : "-";
  el.currentStepRemain.textContent = current ? formatSec(state.runtime.remainingSec) : "00:00";
  el.nextStepName.textContent = `次: ${next ? next.name : "なし"}`;
  el.totalRemain.textContent = formatSec(Math.max(0, state.runtime.totalRemainingSec));

  const done = Math.min(state.runtime.currentIndex, state.runtime.queue.length);
  el.progressText.textContent = `${done} / ${state.runtime.queue.length} 完了`;
  const ratio = state.runtime.queue.length ? (done / state.runtime.queue.length) * 100 : 0;
  el.progressFill.style.width = `${ratio}%`;

  const key = current?.id;
  el.liveMemoInput.value = key ? state.runtime.memoMap[key] || "" : "";
}

function getCurrentRuntimeStep() {
  return state.runtime.queue[state.runtime.currentIndex];
}

function updateSection(index, patch) {
  state.plan.sections[index] = { ...state.plan.sections[index], ...patch };
  savePlan();
  renderAll();
}

function removeSection(index) {
  state.plan.sections.splice(index, 1);
  savePlan();
  renderAll();
}

function updateStep(sectionIndex, stepIndex, patch) {
  const step = state.plan.sections[sectionIndex].steps[stepIndex];
  state.plan.sections[sectionIndex].steps[stepIndex] = { ...step, ...patch };
  savePlan();
  renderAll();
}

function removeStep(sectionIndex, stepIndex) {
  state.plan.sections[sectionIndex].steps.splice(stepIndex, 1);
  savePlan();
  renderAll();
}

function moveItem(arr, index, direction) {
  const next = index + direction;
  if (next < 0 || next >= arr.length) return;
  [arr[index], arr[next]] = [arr[next], arr[index]];
  savePlan();
  renderAll();
}

function duplicateLRStep(sectionIndex, stepIndex) {
  const step = state.plan.sections[sectionIndex].steps[stepIndex];
  let newName = step.name;

  if (step.name.includes("右")) newName = step.name.replace("右", "左");
  else if (step.name.includes("左")) newName = step.name.replace("左", "右");
  else newName = `${step.name} (複製)`;

  state.plan.sections[sectionIndex].steps.splice(stepIndex + 1, 0, { ...step, name: newName });
  savePlan();
  renderAll();
}

function saveTemplate(isDuplicate) {
  const baseName = (el.templateNameInput.value || "無題テンプレート").trim();
  const name = isDuplicate ? `${baseName} コピー ${new Date().toLocaleTimeString("ja-JP")}` : baseName;

  state.templates.push({ name, plan: deepCopy(state.plan), createdAt: Date.now() });
  saveTemplates();
  renderTemplates();
}

function loadSelectedTemplate() {
  const idx = toInt(el.templateSelect.value);
  if (!state.templates[idx]) return;
  state.plan = deepCopy(state.templates[idx].plan);
  savePlan();
  renderAll();
}

function deleteSelectedTemplate() {
  const idx = toInt(el.templateSelect.value);
  if (!state.templates[idx]) return;
  state.templates.splice(idx, 1);
  saveTemplates();
  renderTemplates();
}

function savePlan() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.plan));
}

function loadPlan() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved?.sections) return deepCopy(defaultPlan);
<
    return saved;
  } catch {
    return deepCopy(defaultPlan);
  }
}

function saveTemplates() {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(state.templates));
}

function loadTemplates() {
  try {
    const data = JSON.parse(localStorage.getItem(TEMPLATE_KEY));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function actionButtons(config) {
  const wrap = document.createElement("div");
  wrap.className = "row-actions";
  config.forEach((c) => {
    const b = document.createElement("button");
    b.className = `btn ${c.danger ? "danger" : "secondary"}`;
    b.textContent = c.label;
    b.addEventListener("click", c.onClick);
    wrap.append(b);
  });
  return wrap;
}

function animateStepSwitch() {
  el.runCard.classList.remove("step-switch");
  void el.runCard.offsetWidth;
  el.runCard.classList.add("step-switch");
}

function playBeep() {
  if (!state.runtime.soundEnabled) return;
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.value = 0.05;
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.12);
}

function formatSec(sec) {
  const safe = Math.max(0, Math.floor(sec));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function sumSectionsMinutes() {
  return state.plan.sections.reduce((sum, section) => sum + toInt(section.minutes), 0);
}

function deepCopy(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

// iPadの画面スリープ対策メモ:
// 実運用時は、PWA化後に Screen Wake Lock API の導入を検討してください。
