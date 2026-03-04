import "./demo-form.js";
import { createRoot } from "react-dom/client";
import { createElement } from "react";
import { DemoForm } from "./DemoForm.js";
import { createForm } from "./demo-form.js";
import {
  bmiQuestionnaire,
  emptyBmiResponse,
  allergyQuestionnaire,
  emptyAllergyResponse,
  medicationQuestionnaire,
  emptyMedicationResponse,
  patientIntakeQuestionnaire,
  prefilledIntakeResponse,
} from "./questionnaires.js";
import "./styles.css";

// --- Lit ---
const litApp = document.getElementById("lit-app")!;
litApp.appendChild(createForm(patientIntakeQuestionnaire, prefilledIntakeResponse));
litApp.appendChild(createForm(bmiQuestionnaire, emptyBmiResponse));
litApp.appendChild(createForm(allergyQuestionnaire, emptyAllergyResponse));
litApp.appendChild(createForm(medicationQuestionnaire, emptyMedicationResponse));

// --- React ---
function App() {
  return createElement(
    "div",
    { className: "grid" },
    createElement(DemoForm, { questionnaire: patientIntakeQuestionnaire, response: prefilledIntakeResponse }),
    createElement(DemoForm, { questionnaire: bmiQuestionnaire, response: emptyBmiResponse }),
    createElement(DemoForm, { questionnaire: allergyQuestionnaire, response: emptyAllergyResponse }),
    createElement(DemoForm, { questionnaire: medicationQuestionnaire, response: emptyMedicationResponse }),
  );
}

createRoot(document.getElementById("react-app")!).render(createElement(App));

// --- Tab switching ---
const litBtn = document.getElementById("tab-lit")!;
const reactBtn = document.getElementById("tab-react")!;
const litContainer = document.getElementById("lit-app")!;
const reactContainer = document.getElementById("react-app")!;

function showTab(tab: "lit" | "react") {
  const isLit = tab === "lit";
  litContainer.hidden = !isLit;
  reactContainer.hidden = isLit;
  litBtn.classList.toggle("active", isLit);
  reactBtn.classList.toggle("active", !isLit);
}

litBtn.addEventListener("click", () => showTab("lit"));
reactBtn.addEventListener("click", () => showTab("react"));
