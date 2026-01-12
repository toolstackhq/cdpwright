const stepsData = window.steps || [];
const STORAGE_KEY = "visaWizardDraft";
const TOTAL_STEPS = stepsData.length;
const DEFAULT_SEED = 123456;

const appEl = document.getElementById("app");
const modalRoot = document.getElementById("modal-root");
const toastRoot = document.getElementById("toast-root");

const fallbackReceiptTemplate = `Application Receipt\n\nReference: {{APPLICATION_REF}}\nName: {{FULL_NAME}}\nDate of birth: {{DOB}}\nCitizenship: {{CITIZENSHIP}}\nEmail: {{EMAIL}}\nPhone: {{PHONE}}\nSubmitted at: {{SUBMITTED_AT}}\n\nSummary: {{SUMMARY_JSON}}\n`;

const uploadIntervals = {};

const defaultState = {
  currentStepIndex: 0,
  answers: {},
  errors: {},
  deterministicMode: false,
  seed: DEFAULT_SEED,
  countdownSeconds: 900,
  modal: null,
  uploadStatus: {},
  ui: {
    settingsOpen: false,
    autocompleteOpen: {},
    accordionOpen: {},
  },
  lastFocusedTestId: null,
  submitted: false,
  appRef: null,
  draftId: null,
  lastLoadMs: 0,
};

let state = { ...defaultState };
let storedDraft = null;
let rng = createRng(state.seed);

function createRng(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return {
    next() {
      value = (value * 16807) % 2147483647;
      return (value - 1) / 2147483646;
    },
    reset(newSeed) {
      value = newSeed % 2147483647;
      if (value <= 0) value += 2147483646;
    },
  };
}

function getRandom() {
  return state.deterministicMode ? rng.next() : Math.random();
}

function generateDigits(length) {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += Math.floor(getRandom() * 10).toString();
  }
  return out;
}

function showToast(message) {
  toastRoot.innerHTML = "";
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  toast.setAttribute("data-testid", "toast");
  toastRoot.appendChild(toast);
  setTimeout(() => {
    toastRoot.innerHTML = "";
  }, 3000);
}

function showModal(config) {
  state.modal = config;
  renderModal();
}

function closeModal() {
  state.modal = null;
  renderModal();
}

function renderModal() {
  if (!state.modal) {
    modalRoot.innerHTML = "";
    return;
  }
  const { title, body, actions, testid } = state.modal;
  modalRoot.innerHTML = `
    <div class="modal-backdrop" data-testid="modal-backdrop">
      <div class="modal" data-testid="${testid || "modal"}">
        <h3>${title}</h3>
        <div>${body}</div>
        <div class="button-row" style="margin-top:16px;">
          <div class="button-group">
            ${actions
              .map(
                (action) =>
                  `<button class="${action.variant}" id="${action.testid}" data-testid="${action.testid}">${action.label}</button>`
              )
              .join("")}
          </div>
        </div>
      </div>
    </div>
  `;
  actions.forEach((action) => {
    const button = modalRoot.querySelector(`[data-testid="${action.testid}"]`);
    if (button) button.addEventListener("click", action.onClick);
  });
}

function renderLoadingOverlay(show, loadMs = 0) {
  const existing = document.querySelector(".loading-overlay");
  if (!show) {
    if (existing) existing.remove();
    return;
  }
  if (existing) existing.remove();
  const overlay = document.createElement("div");
  overlay.className = "loading-overlay";
  overlay.setAttribute("data-testid", "loading-overlay");
  overlay.setAttribute("data-load-ms", loadMs.toString());
  overlay.innerHTML = `
    <div class="loading-card">
      <div class="spinner" data-testid="loading-spinner"></div>
      <div>Loading your application...</div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function formatCountdown(seconds) {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${mins}:${secs}`;
}

function resetCountdown() {
  state.countdownSeconds = 900;
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const el = document.querySelector('[data-testid="session-countdown"]');
  if (el) {
    el.textContent = `Session expires in ${formatCountdown(state.countdownSeconds)}`;
  }
}

function startCountdown() {
  setInterval(() => {
    if (state.countdownSeconds > 0) {
      state.countdownSeconds -= 1;
      updateCountdownDisplay();
    }
  }, 1000);
}

function saveDraft() {
  const data = {
    ...state,
    modal: null,
    ui: { ...state.ui, settingsOpen: false },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function clearDraft() {
  localStorage.removeItem(STORAGE_KEY);
}

function setState(partial) {
  state = { ...state, ...partial };
  saveDraft();
  renderApp();
}

function setAnswer(id, value) {
  state.answers = { ...state.answers, [id]: value };
  if (state.errors[id]) {
    state.errors = { ...state.errors, [id]: "" };
  }
  saveDraft();
}

function getAnswer(id, fallback = "") {
  if (state.answers[id] === undefined) return fallback;
  return state.answers[id];
}

function isVisible(field) {
  if (!field.visibleWhen) return true;
  return evaluateRule(field.visibleWhen);
}

function evaluateRule(rule) {
  if (rule.all) return rule.all.every(evaluateRule);
  if (rule.any) return rule.any.some(evaluateRule);
  const value = state.answers[rule.field];
  if (rule.equals !== undefined) return value === rule.equals;
  if (rule.notEquals !== undefined) return value !== rule.notEquals;
  if (rule.contains !== undefined) {
    if (Array.isArray(value)) return value.includes(rule.contains);
    if (typeof value === "string") return value.includes(rule.contains);
    return false;
  }
  if (rule.gt !== undefined) return Number(value) > rule.gt;
  if (rule.gte !== undefined) return Number(value) >= rule.gte;
  if (rule.lt !== undefined) return Number(value) < rule.lt;
  if (rule.lte !== undefined) return Number(value) <= rule.lte;
  return true;
}

function validateField(field) {
  if (!field.validators || !isVisible(field)) return "";
  const value = getAnswer(field.id, "");
  for (const validator of field.validators) {
    if (validator.type === "required" && !value) return validator.message;
    if (validator.type === "pattern") {
      const regex = new RegExp(validator.pattern);
      if (value && !regex.test(value)) return validator.message;
    }
  }
  return "";
}

function validateStep(step) {
  const errors = {};
  step.fields.forEach((field) => {
    const message = validateField(field);
    if (message) errors[field.id] = message;
  });
  state.errors = { ...state.errors, ...errors };
  return Object.keys(errors).length === 0;
}

function withLoading(callback) {
  const loadMs = 600 + Math.floor(getRandom() * 900);
  state.lastLoadMs = loadMs;
  window.APP_DEBUG.lastLoadMs = loadMs;
  renderLoadingOverlay(true, loadMs);
  setTimeout(() => {
    renderLoadingOverlay(false);
    callback();
  }, loadMs);
}

function goToStep(index) {
  if (index < 0 || index >= TOTAL_STEPS) return;
  state.currentStepIndex = index;
  resetCountdown();
  saveDraft();
  renderApp();
}

function handleNext() {
  const step = stepsData[state.currentStepIndex];
  const requiresValidation = step.fields.some((field) => field.validators);
  if (requiresValidation && !validateStep(step)) {
    renderApp();
    return;
  }
  if (state.currentStepIndex === TOTAL_STEPS - 1) {
    handleSubmit();
    return;
  }
  withLoading(() => {
    goToStep(state.currentStepIndex + 1);
  });
}

function handleBack() {
  if (state.currentStepIndex === 0) return;
  withLoading(() => {
    goToStep(state.currentStepIndex - 1);
  });
}

function handleSubmit() {
  withLoading(() => {
    state.submitted = true;
    state.appRef = `EVO-2026-${generateDigits(8)}`;
    saveDraft();
    renderApp();
  });
}

function handleSaveDraft() {
  if (!state.draftId) {
    state.draftId = `DRAFT-${generateDigits(6)}`;
  }
  saveDraft();
  showModal({
    title: "Draft saved",
    body: `<p>Your draft has been saved with ID <strong>${state.draftId}</strong>.</p>`,
    actions: [
      {
        label: "Close",
        variant: "secondary",
        testid: "draft-close",
        onClick: () => closeModal(),
      },
    ],
    testid: "draft-modal",
  });
}

function handleHelp() {
  showModal({
    title: "Need help?",
    body: `
      <p>This is a demo application portal. You can move freely through steps.</p>
      <strong>FAQ</strong>
      <ul>
        <li>Use Next to continue and Back to review.</li>
        <li>Save draft stores your progress locally.</li>
        <li>Deterministic mode helps repeat runs.</li>
      </ul>
    `,
    actions: [
      {
        label: "Close",
        variant: "secondary",
        testid: "help-close",
        onClick: () => closeModal(),
      },
    ],
    testid: "help-modal",
  });
}

function handlePayment() {
  showModal({
    title: "Processing payment",
    body: `<div class="spinner" data-testid="payment-spinner"></div><p>Processing your payment...</p>`,
    actions: [],
    testid: "payment-modal",
  });
  const loadMs = 800 + Math.floor(getRandom() * 1200);
  setTimeout(() => {
    closeModal();
    showToast("Payment successful");
  }, loadMs);
}

function handleSettingsToggle() {
  state.ui.settingsOpen = !state.ui.settingsOpen;
  renderApp();
}

function handleDeterministicToggle(event) {
  const enabled = event.target.checked;
  state.deterministicMode = enabled;
  rng.reset(state.seed);
  saveDraft();
}

function handleSeedChange(event) {
  const value = parseInt(event.target.value, 10);
  if (!Number.isNaN(value)) {
    state.seed = value;
    rng.reset(state.seed);
    saveDraft();
  }
}

function handleStartNew() {
  state = { ...defaultState, seed: DEFAULT_SEED };
  rng.reset(state.seed);
  clearDraft();
  renderApp();
}

function handleFileUpload(fieldId, file) {
  if (!file) return;
  if (uploadIntervals[fieldId]) clearInterval(uploadIntervals[fieldId]);
  state.uploadStatus[fieldId] = { progress: 0, fileName: file.name, done: false };
  renderApp();
  uploadIntervals[fieldId] = setInterval(() => {
    const status = state.uploadStatus[fieldId];
    if (!status) return;
    const next = Math.min(100, status.progress + 20);
    status.progress = next;
    if (next >= 100) {
      status.done = true;
      clearInterval(uploadIntervals[fieldId]);
      showToast("Upload complete");
    }
    renderApp();
  }, 300);
}

function buildSummary() {
  const answers = state.answers;
  return {
    fullName: `${answers.firstName || ""} ${answers.lastName || ""}`.trim(),
    dob: answers.dob || "",
    citizenship: answers.citizenship || "",
    passportNumber: answers.passportNumber || "",
    email: answers.email || "",
    phone: answers.mobile || "",
  };
}

async function downloadReceipt() {
  const summary = buildSummary();
  const template = await loadReceiptTemplate();
  const submittedAt = new Date().toLocaleString("en-AU");
  const payload = template
    .replace("{{APPLICATION_REF}}", state.appRef || "")
    .replace("{{FULL_NAME}}", summary.fullName)
    .replace("{{DOB}}", summary.dob)
    .replace("{{CITIZENSHIP}}", summary.citizenship)
    .replace("{{EMAIL}}", summary.email)
    .replace("{{PHONE}}", summary.phone)
    .replace("{{SUBMITTED_AT}}", submittedAt)
    .replace("{{SUMMARY_JSON}}", JSON.stringify(summary, null, 2));

  const blob = new Blob([payload], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `receipt-${state.appRef || "application"}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function loadReceiptTemplate() {
  try {
    const res = await fetch("receipt-template.txt");
    if (!res.ok) throw new Error("Failed to load");
    return await res.text();
  } catch (err) {
    return fallbackReceiptTemplate;
  }
}

function renderApp() {
  if (state.submitted) {
    renderSubmission();
    return;
  }
  const step = stepsData[state.currentStepIndex];
  const progress = Math.round(((state.currentStepIndex + 1) / TOTAL_STEPS) * 100);
  appEl.innerHTML = `
    <div class="header">
      <div>
        <h1>Visa Application</h1>
        <p>Demo application portal</p>
      </div>
      <button class="settings-gear" id="settings-gear" data-testid="settings-gear" aria-label="Settings">&#9881;</button>
    </div>

    <div class="progress-card">
      <div class="progress-header">
        <span data-testid="progress-text">Step ${state.currentStepIndex + 1} of ${TOTAL_STEPS}</span>
        <span data-testid="progress-percent">${progress}%</span>
      </div>
      <div class="progress-bar"><span style="width:${progress}%" data-testid="progress-bar"></span></div>
      <div class="banner" data-testid="session-countdown">Session expires in ${formatCountdown(
        state.countdownSeconds
      )}</div>
    </div>

    <div class="step-card" data-testid="step-${step.id}">
      <h2 class="step-title">${step.title}</h2>
      <p class="step-desc">${step.description}</p>
      ${renderStep(step)}
      ${step.options.payment ? renderPaymentAction() : ""}
      ${step.options.summary ? renderSummaryPreview() : ""}
      <div class="button-row">
        <button class="secondary" id="back" data-testid="back" ${state.currentStepIndex === 0 ? "disabled" : ""}>Back</button>
        <div class="button-group">
          <button class="ghost" id="save-draft" data-testid="save-draft">Save draft</button>
          <button class="ghost" id="help" data-testid="help">Help</button>
          <button class="primary" id="next" data-testid="next">${
            state.currentStepIndex === TOTAL_STEPS - 1 ? "Submit" : "Next"
          }</button>
        </div>
      </div>
    </div>
    ${renderSettingsPanel()}
  `;

  bindGlobalEvents();
  renderModal();
  updateCountdownDisplay();
  restoreFocus();
}

function renderStep(step) {
  const fieldsHtml = step.fields
    .filter((field) => isVisible(field))
    .map((field) => renderField(field))
    .join("");
  return `<div class="form-grid">${fieldsHtml}</div>`;
}

function renderField(field) {
  const renderer = fieldRenderers[field.type];
  if (!renderer) return "";
  return renderer(field);
}

const fieldRenderers = {
  text: (field) => renderInput(field, "text"),
  email: (field) => renderInput(field, "email"),
  tel: (field) => renderInput(field, "tel"),
  date: (field) => renderInput(field, "date"),
  number: (field) => renderInput(field, "number"),
  textarea: (field) => renderTextarea(field),
  select: (field) => renderSelect(field),
  radio: (field) => renderRadio(field),
  checkbox: (field) => renderCheckbox(field),
  toggle: (field) => renderToggle(field),
  file: (field) => renderFile(field),
  autocomplete: (field) => renderAutocomplete(field),
  multiselect: (field) => renderMultiselect(field),
  repeater: (field) => renderRepeater(field),
  accordion: (field) => renderAccordion(field),
  info: (field) => renderInfo(field),
  divider: (field) => renderDivider(field),
  shadowComponent: (field) => renderShadowComponent(field),
};

function wrapperClasses(field) {
  return `field-wrap ${field.ui?.colSpan === 2 ? "full" : ""}`.trim();
}

function renderLabel(field, inputId) {
  const tooltip = field.tooltip
    ? `<span class="tooltip" tabindex="0" data-testid="${field.testid}-tooltip">?
        <span class="tooltip-text">${field.tooltip}</span>
      </span>`
    : "";
  return `<label for="${inputId}">${field.label} ${tooltip}</label>`;
}

function renderHelp(field) {
  if (!field.helpText) return "";
  return `<div class="help-text" data-testid="${field.testid}-help">${field.helpText}</div>`;
}

function renderError(field) {
  const message = state.errors[field.id];
  if (!message) return "";
  return `<div class="error-text" data-testid="${field.testid}-error">${message}</div>`;
}

function renderInput(field, type) {
  const inputId = `input-${field.id}`;
  const value = getAnswer(field.id, "");
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      ${renderLabel(field, inputId)}
      <input
        id="${inputId}"
        type="${type}"
        value="${value}"
        placeholder="${field.placeholder || ""}"
        data-testid="${field.testid}"
      />
      ${renderHelp(field)}
      ${renderError(field)}
    </div>
  `;
}

function renderTextarea(field) {
  const inputId = `input-${field.id}`;
  const value = getAnswer(field.id, "");
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      ${renderLabel(field, inputId)}
      <textarea
        id="${inputId}"
        data-testid="${field.testid}"
        placeholder="${field.placeholder || ""}"
      >${value}</textarea>
      ${renderHelp(field)}
      ${renderError(field)}
    </div>
  `;
}

function renderSelect(field) {
  const inputId = `input-${field.id}`;
  const value = getAnswer(field.id, "");
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      ${renderLabel(field, inputId)}
      <select id="${inputId}" data-testid="${field.testid}">
        <option value="">Select</option>
        ${field.options
          .map(
            (option) =>
              `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`
          )
          .join("")}
      </select>
      ${renderHelp(field)}
      ${renderError(field)}
    </div>
  `;
}

function renderRadio(field) {
  const value = getAnswer(field.id, "");
  const items = field.options
    .map((option, index) => {
      const inputId = `input-${field.id}-${index}`;
      return `
        <label for="${inputId}">
          <input
            id="${inputId}"
            type="radio"
            name="${field.id}"
            value="${option}"
            ${option === value ? "checked" : ""}
            data-testid="${field.testid}-${index}"
          />
          ${option}
        </label>
      `;
    })
    .join("");
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <fieldset data-testid="${field.testid}">
        <legend>${field.label}</legend>
        <div class="inline-options">${items}</div>
      </fieldset>
      ${renderHelp(field)}
      ${renderError(field)}
    </div>
  `;
}

function renderCheckbox(field) {
  const inputId = `input-${field.id}`;
  const checked = Boolean(getAnswer(field.id, false));
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <label for="${inputId}">
        <input
          id="${inputId}"
          type="checkbox"
          ${checked ? "checked" : ""}
          data-testid="${field.testid}"
        />
        ${field.label}
      </label>
      ${renderHelp(field)}
      ${renderError(field)}
    </div>
  `;
}

function renderToggle(field) {
  const inputId = `input-${field.id}`;
  const checked = Boolean(getAnswer(field.id, false));
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <div class="toggle">
        <input
          id="${inputId}"
          type="checkbox"
          role="switch"
          ${checked ? "checked" : ""}
          data-testid="${field.testid}"
        />
        <label for="${inputId}">${field.label}</label>
      </div>
      ${renderHelp(field)}
      ${renderError(field)}
    </div>
  `;
}

function renderFile(field) {
  const inputId = `input-${field.id}`;
  const status = state.uploadStatus[field.id];
  const progress = status ? status.progress : 0;
  const done = status ? status.done : false;
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      ${renderLabel(field, inputId)}
      <input id="${inputId}" type="file" data-testid="${field.testid}" />
      ${status ? `<div class="help-text">${status.fileName} ${done ? "(complete)" : ""}</div>` : ""}
      <div class="file-progress" data-testid="${field.testid}-progress">
        <span style="width:${progress}%" data-testid="${field.testid}-progress-bar"></span>
      </div>
      ${renderHelp(field)}
    </div>
  `;
}

function renderAutocomplete(field) {
  const inputId = `input-${field.id}`;
  const value = getAnswer(field.id, "");
  const open = state.ui.autocompleteOpen[field.id];
  const filtered = field.options.filter((option) =>
    option.toLowerCase().includes(value.toLowerCase())
  );
  return `
    <div class="${wrapperClasses(field)} autocomplete" data-testid="${field.testid}-wrap">
      ${renderLabel(field, inputId)}
      <input
        id="${inputId}"
        type="text"
        value="${value}"
        data-testid="${field.testid}"
        autocomplete="off"
      />
      ${open && filtered.length
        ? `<div class="autocomplete-list" data-testid="${field.testid}-list">
            ${filtered
              .map(
                (option, index) =>
                  `<div class="autocomplete-item" id="${field.testid}-option-${index}" data-testid="${field.testid}-option-${index}">${option}</div>`
              )
              .join("")}
          </div>`
        : ""}
      ${renderHelp(field)}
    </div>
  `;
}

function renderMultiselect(field) {
  const value = getAnswer(field.id, []);
  const items = field.options
    .map((option, index) => {
      const inputId = `input-${field.id}-${index}`;
      const checked = value.includes(option);
      return `
        <label for="${inputId}">
          <input
            id="${inputId}"
            type="checkbox"
            value="${option}"
            ${checked ? "checked" : ""}
            data-testid="${field.testid}-${index}"
          />
          ${option}
        </label>
      `;
    })
    .join("");
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <fieldset data-testid="${field.testid}">
        <legend>${field.label}</legend>
        <div class="multi-select">${items}</div>
      </fieldset>
      ${renderHelp(field)}
    </div>
  `;
}

function renderRepeater(field) {
  let rows = getAnswer(field.id, []);
  if (!Array.isArray(rows) || rows.length === 0) {
    rows = [{}];
    setAnswer(field.id, rows);
  }
  const header = field.columns.map((col) => `<th>${col.label}</th>`).join("");
  const body = rows
    .map((row, rowIndex) => {
      const cells = field.columns
        .map((col) => {
          const inputId = `input-${field.id}-${rowIndex}-${col.id}`;
          const cellValue = row[col.id] || "";
          return `<td>
              <label for="${inputId}">${col.label}</label>
              <input
                id="${inputId}"
                type="text"
                value="${cellValue}"
                data-testid="${field.testid}-${rowIndex}-${col.id}"
              />
            </td>`;
        })
        .join("");
      return `<tr data-testid="${field.testid}-row-${rowIndex}">${cells}
        <td>
          <button class="ghost" id="${field.testid}-remove-${rowIndex}" data-testid="${field.testid}-remove-${rowIndex}">Remove</button>
        </td>
      </tr>`;
    })
    .join("");

  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <label>${field.label}</label>
      <table class="repeater-table" data-testid="${field.testid}">
        <thead>
          <tr>${header}<th>Actions</th></tr>
        </thead>
        <tbody>${body}</tbody>
      </table>
      <div class="repeater-actions">
        <button class="secondary" id="${field.testid}-add" data-testid="${field.testid}-add">Add row</button>
      </div>
    </div>
  `;
}

function renderAccordion(field) {
  const sections = field.sections
    .map((section, index) => {
      const key = `${field.id}-${index}`;
      const open = state.ui.accordionOpen[key];
      return `
        <div class="accordion-section" data-testid="${field.testid}-section-${index}">
          <button class="accordion-toggle" id="${field.testid}-toggle-${index}" data-testid="${field.testid}-toggle-${index}">${section.title}</button>
          ${open ? `<div class="accordion-content">${section.content}</div>` : ""}
        </div>
      `;
    })
    .join("");
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <label>${field.label}</label>
      ${sections}
    </div>
  `;
}

function renderInfo(field) {
  return `
    <div class="info ${field.ui?.colSpan === 2 ? "full" : ""}" data-testid="${field.testid}-wrap">
      ${field.text}
    </div>
  `;
}

function renderDivider(field) {
  return `<div class="divider ${field.ui?.colSpan === 2 ? "full" : ""}" data-testid="${field.testid}-wrap">${field.text}</div>`;
}

function renderShadowComponent(field) {
  return `
    <div class="${wrapperClasses(field)}" data-testid="${field.testid}-wrap">
      <label>${field.label}</label>
      <div class="shadow-host" data-testid="${field.testid}">
        <emergency-contact></emergency-contact>
      </div>
    </div>
  `;
}

function renderPaymentAction() {
  return `
    <div class="button-row" style="margin-top:16px;">
      <button class="primary" id="pay-now" data-testid="pay-now">Pay now</button>
    </div>
  `;
}

function renderSummaryPreview() {
  const summary = buildSummary();
  return `
    <table class="summary-table" data-testid="summary-table">
      <tr><th>Full name</th><td>${summary.fullName}</td></tr>
      <tr><th>Date of birth</th><td>${summary.dob}</td></tr>
      <tr><th>Citizenship</th><td>${summary.citizenship}</td></tr>
      <tr><th>Passport number</th><td>${summary.passportNumber}</td></tr>
      <tr><th>Email</th><td>${summary.email}</td></tr>
      <tr><th>Phone</th><td>${summary.phone}</td></tr>
    </table>
  `;
}

function renderSettingsPanel() {
  if (!state.ui.settingsOpen) return "";
  return `
    <div class="settings-panel" data-testid="settings-panel">
      <h4>Settings</h4>
      <div class="field-wrap">
        <label class="toggle" for="deterministic-toggle">
          <input
            id="deterministic-toggle"
            type="checkbox"
            ${state.deterministicMode ? "checked" : ""}
            data-testid="deterministic-toggle"
          />
          Deterministic mode
        </label>
      </div>
      <div class="field-wrap">
        <label for="deterministic-seed">Seed</label>
        <input
          id="deterministic-seed"
          type="number"
          value="${state.seed}"
          data-testid="deterministic-seed"
        />
      </div>
    </div>
  `;
}

function renderSubmission() {
  const summary = buildSummary();
  appEl.innerHTML = `
    <div class="header">
      <div>
        <h1>Visa Application</h1>
        <p>Demo application portal</p>
      </div>
      <button class="settings-gear" id="settings-gear" data-testid="settings-gear" aria-label="Settings">&#9881;</button>
    </div>
    <div class="step-card" data-testid="submission-screen">
      <h2 class="step-title">Application submitted</h2>
      <p class="step-desc">Reference number: <strong data-testid="application-ref">${
        state.appRef
      }</strong></p>
      ${renderSummaryPreview()}
      <div class="button-row">
        <div class="button-group">
          <button class="secondary" id="download-receipt" data-testid="download-receipt">Download receipt (.txt)</button>
          <button class="ghost" id="start-new" data-testid="start-new">Start new application</button>
        </div>
      </div>
    </div>
    ${renderSettingsPanel()}
  `;
  bindSubmissionEvents();
  renderModal();
}

function bindGlobalEvents() {
  const back = appEl.querySelector('[data-testid="back"]');
  const next = appEl.querySelector('[data-testid="next"]');
  const save = appEl.querySelector('[data-testid="save-draft"]');
  const help = appEl.querySelector('[data-testid="help"]');
  const gear = appEl.querySelector('[data-testid="settings-gear"]');
  const payNow = appEl.querySelector('[data-testid="pay-now"]');

  if (back) back.addEventListener("click", handleBack);
  if (next) next.addEventListener("click", handleNext);
  if (save) save.addEventListener("click", handleSaveDraft);
  if (help) help.addEventListener("click", handleHelp);
  if (gear) gear.addEventListener("click", handleSettingsToggle);
  if (payNow) payNow.addEventListener("click", handlePayment);

  const settingsToggle = appEl.querySelector('[data-testid="deterministic-toggle"]');
  const seedInput = appEl.querySelector('[data-testid="deterministic-seed"]');
  if (settingsToggle) settingsToggle.addEventListener("change", handleDeterministicToggle);
  if (seedInput) seedInput.addEventListener("input", handleSeedChange);

  bindFieldEvents();
}

function bindSubmissionEvents() {
  const gear = appEl.querySelector('[data-testid="settings-gear"]');
  const downloadBtn = appEl.querySelector('[data-testid="download-receipt"]');
  const startNew = appEl.querySelector('[data-testid="start-new"]');
  if (gear) gear.addEventListener("click", handleSettingsToggle);
  if (downloadBtn) downloadBtn.addEventListener("click", downloadReceipt);
  if (startNew) startNew.addEventListener("click", handleStartNew);
  const settingsToggle = appEl.querySelector('[data-testid="deterministic-toggle"]');
  const seedInput = appEl.querySelector('[data-testid="deterministic-seed"]');
  if (settingsToggle) settingsToggle.addEventListener("change", handleDeterministicToggle);
  if (seedInput) seedInput.addEventListener("input", handleSeedChange);
}

function bindFieldEvents() {
  const inputs = appEl.querySelectorAll("input, textarea, select");
  inputs.forEach((input) => {
    input.addEventListener("focusin", (event) => {
      const target = event.target;
      if (target.dataset.testid) {
        state.lastFocusedTestId = target.dataset.testid;
      }
    });
  });

  appEl
    .querySelectorAll('input[type=checkbox][data-testid^="fld-"]')
    .forEach((input) => {
      if (input.closest(".settings-panel")) return;
      const testParts = input.dataset.testid.split("-");
      if (testParts.length > 2) return;
      input.addEventListener("change", (event) => {
        const target = event.target;
        const fieldId = target.id.replace("input-", "").split("-")[0];
        setAnswer(fieldId, target.checked);
        renderApp();
      });
    });

  appEl
    .querySelectorAll("input[type=text], input[type=email], input[type=tel], input[type=date], input[type=number]")
    .forEach((input) => {
      if (!input.dataset.testid) return;
      if (input.closest(".settings-panel")) return;
      if (input.closest(".repeater-table")) return;
      input.addEventListener("input", (event) => {
        const target = event.target;
        const fieldId = target.id.replace("input-", "").split("-")[0];
        setAnswer(fieldId, target.value);
        if (state.errors[fieldId] || target.closest(".autocomplete")) {
          renderApp();
        }
      });
    });

  appEl.querySelectorAll("textarea").forEach((input) => {
    if (input.closest(".settings-panel")) return;
    input.addEventListener("input", (event) => {
      const target = event.target;
      const fieldId = target.id.replace("input-", "");
      setAnswer(fieldId, target.value);
      if (state.errors[fieldId]) renderApp();
    });
  });

  appEl.querySelectorAll("select").forEach((input) => {
    if (input.closest(".settings-panel")) return;
    input.addEventListener("change", (event) => {
      const target = event.target;
      const fieldId = target.id.replace("input-", "");
      setAnswer(fieldId, target.value);
      renderApp();
    });
  });

  appEl.querySelectorAll("input[type=radio]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.target;
      setAnswer(target.name, target.value);
      renderApp();
    });
  });

  appEl.querySelectorAll("input[type=file]").forEach((input) => {
    input.addEventListener("change", (event) => {
      const target = event.target;
      const fieldId = target.id.replace("input-", "");
      handleFileUpload(fieldId, target.files[0]);
    });
  });

  appEl.querySelectorAll(".autocomplete input").forEach((input) => {
    const fieldId = input.id.replace("input-", "");
    input.addEventListener("focus", () => {
      state.ui.autocompleteOpen[fieldId] = true;
      renderApp();
    });
    input.addEventListener("blur", () => {
      setTimeout(() => {
        state.ui.autocompleteOpen[fieldId] = false;
        renderApp();
      }, 150);
    });
  });

  appEl.querySelectorAll(".autocomplete-item").forEach((item) => {
    item.addEventListener("mousedown", (event) => {
      const target = event.target;
      const wrapper = target.closest(".autocomplete");
      if (!wrapper) return;
      const input = wrapper.querySelector("input");
      const fieldId = input.id.replace("input-", "");
      setAnswer(fieldId, target.textContent);
      state.ui.autocompleteOpen[fieldId] = false;
      renderApp();
    });
  });

  appEl.querySelectorAll("[data-testid$='-add']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;
      const testid = target.getAttribute("data-testid");
      if (!testid) return;
      const fieldId = testid.replace("-add", "").replace("fld-", "");
      const current = getAnswer(fieldId, []);
      const rows = Array.isArray(current) ? [...current] : [];
      rows.push({});
      setAnswer(fieldId, rows);
      renderApp();
    });
  });

  appEl.querySelectorAll("[data-testid*='-remove-']").forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;
      const testid = target.getAttribute("data-testid");
      if (!testid) return;
      const match = testid.match(/fld-(.+)-remove-(\d+)/);
      if (!match) return;
      const fieldId = match[1];
      const index = Number(match[2]);
      const current = getAnswer(fieldId, []);
      const rows = Array.isArray(current) ? [...current] : [];
      rows.splice(index, 1);
      setAnswer(fieldId, rows);
      renderApp();
    });
  });

  appEl.querySelectorAll(".repeater-table input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const target = event.target;
      const match = target.id.match(/input-(.+)-(\d+)-(.+)/);
      if (!match) return;
      const fieldId = match[1];
      const rowIndex = Number(match[2]);
      const colId = match[3];
      const rows = getAnswer(fieldId, []);
      rows[rowIndex] = rows[rowIndex] || {};
      rows[rowIndex][colId] = target.value;
      setAnswer(fieldId, rows);
    });
  });

  appEl.querySelectorAll("fieldset[data-testid^='fld-'] input[type=checkbox]").forEach((input) => {
    const fieldId = input.dataset.testid.split("-")[1];
    input.addEventListener("change", (event) => {
      const target = event.target;
      const current = getAnswer(fieldId, []);
      const option = target.value;
      if (target.checked) {
        if (!current.includes(option)) current.push(option);
      } else {
        const idx = current.indexOf(option);
        if (idx >= 0) current.splice(idx, 1);
      }
      setAnswer(fieldId, current);
    });
  });

  appEl.querySelectorAll(".accordion-toggle").forEach((button) => {
    button.addEventListener("click", (event) => {
      const target = event.target;
      const match = target.dataset.testid.match(/fld-(.+)-toggle-(\d+)/);
      if (!match) return;
      const key = `${match[1]}-${match[2]}`;
      state.ui.accordionOpen[key] = !state.ui.accordionOpen[key];
      renderApp();
    });
  });

  bindShadowComponents();
}

function bindShadowComponents() {
  const hosts = appEl.querySelectorAll("emergency-contact");
  hosts.forEach((host) => {
    host.setData(
      stepsData.find((s) => s.id === "emergency-contact").fields[0].fields,
      state.answers,
      (id, value) => {
        setAnswer(id, value);
        renderApp();
      }
    );
  });
}

function restoreFocus() {
  if (!state.lastFocusedTestId) return;
  const el = appEl.querySelector(`[data-testid="${state.lastFocusedTestId}"]`);
  if (el) el.focus();
}

class EmergencyContact extends HTMLElement {
  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    this.fields = [];
    this.values = {};
    this.onChange = null;
  }

  setData(fields, values, onChange) {
    this.fields = fields || [];
    this.values = values || {};
    this.onChange = onChange;
    this.render();
  }

  render() {
    const visibleFields = this.fields.filter((field) => this.isVisible(field));
    this.root.innerHTML = `
      <style>
        :host { display: block; }
        .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        label { font-weight: 600; display: flex; flex-direction: column; gap: 6px; }
        input, select { border: 1px solid #d7e1d9; border-radius: 8px; padding: 8px 10px; }
        .full { grid-column: span 2; }
      </style>
      <fieldset>
        <legend>Emergency contact details</legend>
        <div class="grid">
          ${visibleFields
            .map((field, index) => {
              const inputId = `ec-${field.id}`;
              const value = this.values[field.id] || "";
              const testid = `fld-${field.id}`;
              if (field.type === "select") {
                return `
                  <label class="full" data-testid="${testid}-wrap">
                    ${field.label}
                    <select id="${inputId}" data-testid="${testid}">
                      <option value="">Select</option>
                      ${field.options
                        .map(
                          (option) =>
                            `<option value="${option}" ${option === value ? "selected" : ""}>${option}</option>`
                        )
                        .join("")}
                    </select>
                  </label>
                `;
              }
              return `
                <label class="${index < 2 ? "" : "full"}" data-testid="${testid}-wrap">
                  ${field.label}
                  <input id="${inputId}" type="${field.type}" value="${value}" data-testid="${testid}" />
                </label>
              `;
            })
            .join("")}
        </div>
      </fieldset>
    `;
    this.root.querySelectorAll("input, select").forEach((input) => {
      input.addEventListener("input", (event) => {
        const target = event.target;
        const fieldId = target.id.replace("ec-", "");
        const newValue = target.value;
        if (this.onChange) this.onChange(fieldId, newValue);
      });
      input.addEventListener("change", (event) => {
        const target = event.target;
        const fieldId = target.id.replace("ec-", "");
        const newValue = target.value;
        if (this.onChange) this.onChange(fieldId, newValue);
      });
    });
  }

  isVisible(field) {
    if (!field.visibleWhen) return true;
    const value = this.values[field.visibleWhen.field];
    if (field.visibleWhen.equals !== undefined) return value === field.visibleWhen.equals;
    return true;
  }
}

customElements.define("emergency-contact", EmergencyContact);

function initDraftFlow() {
  storedDraft = loadDraft();
  if (storedDraft) {
    showModal({
      title: "Resume draft?",
      body: "<p>A saved draft was found on this device. Would you like to resume it?</p>",
      actions: [
        {
          label: "No, start fresh",
          variant: "secondary",
          testid: "resume-no",
          onClick: () => {
            clearDraft();
            storedDraft = null;
            closeModal();
          },
        },
        {
          label: "Yes, resume",
          variant: "primary",
          testid: "resume-yes",
          onClick: () => {
            state = { ...state, ...storedDraft, modal: null };
            rng.reset(state.seed || DEFAULT_SEED);
            storedDraft = null;
            closeModal();
            renderApp();
          },
        },
      ],
      testid: "resume-modal",
    });
  }
}

window.APP_DEBUG = {
  getState: () => state,
  setState: (partial) => setState(partial),
  goToStep: (index) => goToStep(index),
  getCurrentStep: () => stepsData[state.currentStepIndex],
  setDeterministicMode: (on, seed) => {
    state.deterministicMode = on;
    if (seed !== undefined) state.seed = seed;
    rng.reset(state.seed);
    saveDraft();
    renderApp();
  },
  lastLoadMs: state.lastLoadMs,
};

startCountdown();
renderApp();
initDraftFlow();
