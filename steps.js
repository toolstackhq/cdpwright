const withDefaults = (field, opts = {}) => {
  const id = field.id;
  return {
    testid: `fld-${id}`,
    helpText: "",
    placeholder: "",
    required: false,
    ui: { colSpan: 1, ...(opts.ui || {}) },
    ...field,
    ...opts,
  };
};

const step = (id, title, description, fields, options = {}) => ({
  id,
  title,
  description,
  fields,
  options,
});

const text = (id, label, opts) => withDefaults({ id, type: "text", label }, opts);
const email = (id, label, opts) => withDefaults({ id, type: "email", label }, opts);
const tel = (id, label, opts) => withDefaults({ id, type: "tel", label }, opts);
const date = (id, label, opts) => withDefaults({ id, type: "date", label }, opts);
const number = (id, label, opts) => withDefaults({ id, type: "number", label }, opts);
const textarea = (id, label, opts) => withDefaults({ id, type: "textarea", label }, opts);
const select = (id, label, options, opts) => withDefaults({ id, type: "select", label, options }, opts);
const radio = (id, label, options, opts) => withDefaults({ id, type: "radio", label, options }, opts);
const checkbox = (id, label, opts) => withDefaults({ id, type: "checkbox", label }, opts);
const toggle = (id, label, opts) => withDefaults({ id, type: "toggle", label }, opts);
const file = (id, label, opts) => withDefaults({ id, type: "file", label }, opts);
const autocomplete = (id, label, options, opts) =>
  withDefaults({ id, type: "autocomplete", label, options }, opts);
const multiselect = (id, label, options, opts) =>
  withDefaults({ id, type: "multiselect", label, options }, opts);
const repeater = (id, label, columns, opts) =>
  withDefaults({ id, type: "repeater", label, columns }, opts);
const accordion = (id, label, sections, opts) =>
  withDefaults({ id, type: "accordion", label, sections }, opts);
let anonFieldCounter = 0;
const nextAnonId = (prefix) => {
  anonFieldCounter += 1;
  return `${prefix}-${anonFieldCounter}`;
};
const info = (text, opts) =>
  withDefaults({ id: nextAnonId("info"), type: "info", label: "", text }, opts);
const divider = (text, opts) =>
  withDefaults({ id: nextAnonId("divider"), type: "divider", label: "", text }, opts);
const shadowComponent = (id, label, fields, opts) =>
  withDefaults({ id, type: "shadowComponent", label, fields }, opts);

const states = [
  "Australian Capital Territory",
  "New South Wales",
  "Northern Territory",
  "Queensland",
  "South Australia",
  "Tasmania",
  "Victoria",
  "Western Australia",
];

const suburbs = [
  "Adelaide",
  "Brisbane",
  "Canberra",
  "Darwin",
  "Geelong",
  "Gold Coast",
  "Hobart",
  "Melbourne",
  "Newcastle",
  "Perth",
  "Sydney",
  "Wollongong",
];

const occupations = [
  "Civil engineer",
  "Registered nurse",
  "Software developer",
  "Chef",
  "Electrician",
  "Teacher",
  "Accountant",
  "Project manager",
];

const countries = [
  "Australia",
  "New Zealand",
  "United Kingdom",
  "United States",
  "Canada",
  "India",
  "China",
  "South Africa",
  "Philippines",
];

const steps = [
  step(
    "start-eligibility",
    "Start and eligibility",
    "Provide basic details so we can guide you through the application.",
    [
      info(
        "This demo mirrors a typical visa application. You can move forward without completing every field.",
        { ui: { colSpan: 2 } }
      ),
      radio("visaStream", "Visa stream", [
        "Skilled",
        "Family",
        "Student",
        "Temporary work",
      ]),
      select("visitPurpose", "Primary purpose", [
        "Work and contribute",
        "Study and training",
        "Join family",
        "Travel and explore",
      ]),
      checkbox("eligibilityConfirm", "I confirm I meet the basic eligibility requirements."),
      toggle("portalUpdates", "Receive SMS updates"),
      accordion(
        "eligibilityAccordion",
        "Eligibility guidance",
        [
          {
            title: "Document checklist",
            content: "Passport, education records, and employment references are commonly required.",
          },
          {
            title: "Timeframes",
            content: "Processing times vary by stream and individual circumstances.",
          },
        ],
        { ui: { colSpan: 2 } }
      ),
    ]
  ),
  step(
    "applicant-name-dob",
    "Applicant name and date of birth",
    "Your legal name and birth details must match official documents.",
    [
      text("firstName", "Given name", { placeholder: "e.g. Ava" }),
      text("middleName", "Middle name", { placeholder: "e.g. Rose", required: false }),
      text("lastName", "Family name", { placeholder: "e.g. Patel" }),
      date("dob", "Date of birth"),
      select("gender", "Gender", ["Female", "Male", "Other", "Prefer not to say"], {
        ui: { colSpan: 1 },
      }),
      text("genderOther", "Please specify", {
        visibleWhen: { field: "gender", equals: "Other" },
      }),
    ]
  ),
  step(
    "citizenship-residency",
    "Citizenship and residency",
    "Tell us about your citizenship and current residency status.",
    [
      select("citizenship", "Citizenship", countries, { ui: { colSpan: 1 } }),
      select("residencyStatus", "Residency status", [
        "Citizen",
        "Permanent resident",
        "Temporary resident",
        "Visitor",
      ]),
      text("passportNumber", "Passport number", {
        visibleWhen: { field: "citizenship", notEquals: "Australia" },
      }),
      date("passportExpiry", "Passport expiry date", {
        visibleWhen: { field: "citizenship", notEquals: "Australia" },
      }),
      checkbox("dualCitizen", "I hold dual citizenship"),
    ]
  ),
  step(
    "passport-identity",
    "Passport and identity",
    "Provide identity details for verification and travel clearance.",
    [
      text("passportIssuePlace", "Passport place of issue"),
      select("passportIssueCountry", "Issuing country", countries),
      date("passportIssueDate", "Date of issue"),
      file("passportUpload", "Upload passport bio page", {
        helpText: "PDF or image. File upload is simulated.",
        ui: { colSpan: 2 },
      }),
      text("nationalId", "National identity number", { required: false }),
    ]
  ),
  step(
    "contact-details",
    "Contact details",
    "We will send updates and notices to these details.",
    [
      email("email", "Email address", {
        validators: [
          { type: "required", message: "Email is required." },
          { type: "pattern", pattern: "^.+@.+\\..+$", message: "Enter a valid email." },
        ],
      }),
      tel("mobile", "Mobile number", {
        tooltip: "Include country code if outside Australia.",
      }),
      tel("altPhone", "Alternate phone"),
      autocomplete("preferredSuburb", "Preferred suburb", suburbs, {
        helpText: "Start typing to see suggestions.",
      }),
    ]
  ),
  step(
    "address-current",
    "Current residential address",
    "Tell us where you currently live.",
    [
      text("addressLine1", "Address line 1"),
      text("addressLine2", "Address line 2", { required: false }),
      text("city", "Suburb or city"),
      select("state", "State or territory", states),
      number("postcode", "Postcode"),
      toggle("postalSame", "Postal address is the same"),
    ]
  ),
  step(
    "address-history",
    "Address history",
    "List your residential addresses for the last 5 years.",
    [
      repeater(
        "addressHistory",
        "Previous addresses",
        [
          { id: "address", label: "Address" },
          { id: "from", label: "From (YYYY-MM)" },
          { id: "to", label: "To (YYYY-MM)" },
          { id: "country", label: "Country" },
        ],
        { ui: { colSpan: 2 } }
      ),
    ]
  ),
  step(
    "employment-details",
    "Employment details",
    "Provide your current employment information.",
    [
      select("employmentStatus", "Employment status", [
        "Employed",
        "Self-employed",
        "Unemployed",
        "Student",
        "Retired",
      ]),
      text("employer", "Employer name", {
        visibleWhen: { field: "employmentStatus", equals: "Employed" },
      }),
      text("occupation", "Occupation", {
        visibleWhen: { field: "employmentStatus", equals: "Employed" },
      }),
      autocomplete("occupationList", "Occupation (autocomplete)", occupations, {
        visibleWhen: { field: "employmentStatus", equals: "Employed" },
      }),
      number("employmentYears", "Years with employer", {
        visibleWhen: { field: "employmentStatus", equals: "Employed" },
      }),
      multiselect(
        "industryAreas",
        "Industry experience",
        ["Health", "Construction", "Technology", "Hospitality", "Education", "Finance"],
        { ui: { colSpan: 2 } }
      ),
    ]
  ),
  step(
    "education",
    "Education",
    "Summarise your highest qualification and training.",
    [
      select("highestQualification", "Highest qualification", [
        "Secondary school",
        "Certificate",
        "Diploma",
        "Bachelor degree",
        "Master degree",
        "Doctorate",
      ]),
      text("institution", "Institution"),
      number("gradYear", "Year completed"),
      textarea("educationNotes", "Additional training", {
        ui: { colSpan: 2 },
        required: false,
      }),
    ]
  ),
  step(
    "travel-history",
    "Travel history",
    "Add international travel in the last 10 years.",
    [
      repeater(
        "travelHistory",
        "Trips",
        [
          { id: "country", label: "Country" },
          { id: "from", label: "From (YYYY-MM)" },
          { id: "to", label: "To (YYYY-MM)" },
          { id: "reason", label: "Reason" },
        ],
        { ui: { colSpan: 2 } }
      ),
    ]
  ),
  step(
    "family-details",
    "Family details",
    "Tell us about your marital status and spouse details if relevant.",
    [
      radio("maritalStatus", "Marital status", [
        "Single",
        "Married",
        "De facto",
        "Separated",
        "Divorced",
      ]),
      text("spouseName", "Spouse or partner name", {
        visibleWhen: {
          any: [
            { field: "maritalStatus", equals: "Married" },
            { field: "maritalStatus", equals: "De facto" },
          ],
        },
      }),
      date("spouseDob", "Spouse or partner date of birth", {
        visibleWhen: {
          any: [
            { field: "maritalStatus", equals: "Married" },
            { field: "maritalStatus", equals: "De facto" },
          ],
        },
      }),
      select("spouseCitizenship", "Spouse or partner citizenship", countries, {
        visibleWhen: {
          any: [
            { field: "maritalStatus", equals: "Married" },
            { field: "maritalStatus", equals: "De facto" },
          ],
        },
      }),
    ]
  ),
  step(
    "dependants",
    "Dependants",
    "List any dependants that will be included in the application.",
    [
      radio("hasDependants", "Do you have dependants?", ["Yes", "No"]),
      number("dependantsCount", "Number of dependants", {
        visibleWhen: { field: "hasDependants", equals: "Yes" },
      }),
      repeater(
        "dependantDetails",
        "Dependant details",
        [
          { id: "name", label: "Full name" },
          { id: "dob", label: "Date of birth" },
          { id: "relationship", label: "Relationship" },
        ],
        {
          visibleWhen: { field: "hasDependants", equals: "Yes" },
          ui: { colSpan: 2 },
        }
      ),
    ]
  ),
  step(
    "health-declarations",
    "Health declarations",
    "Answer health and insurance questions honestly.",
    [
      checkbox("healthCondition", "I have a significant health condition."),
      textarea("healthDetails", "Health condition details", {
        visibleWhen: { field: "healthCondition", equals: true },
        ui: { colSpan: 2 },
      }),
      toggle("healthInsurance", "I have valid health insurance"),
      accordion(
        "healthAccordion",
        "Health guidance",
        [
          {
            title: "Medical checks",
            content: "Some applicants may need additional medical screening.",
          },
          {
            title: "Insurance evidence",
            content: "Provide evidence of coverage before travel where requested.",
          },
        ],
        { ui: { colSpan: 2 } }
      ),
    ]
  ),
  step(
    "character-declarations",
    "Character declarations",
    "Provide character-related information.",
    [
      radio("criminalConvictions", "Have you ever been convicted of an offence?", [
        "Yes",
        "No",
      ]),
      textarea("convictionDetails", "Provide details of convictions", {
        visibleWhen: { field: "criminalConvictions", equals: "Yes" },
        ui: { colSpan: 2 },
      }),
      checkbox("convictionAck", "I acknowledge this information is complete", {
        visibleWhen: { field: "criminalConvictions", equals: "Yes" },
      }),
    ]
  ),
  step(
    "previous-applications",
    "Previous applications",
    "Tell us about any prior visa applications.",
    [
      radio("previouslyApplied", "Have you previously applied for an Australian visa?", [
        "Yes",
        "No",
      ]),
      text("previousVisaType", "Previous visa type", {
        visibleWhen: { field: "previouslyApplied", equals: "Yes" },
      }),
      date("previousVisaDate", "Date of previous application", {
        visibleWhen: { field: "previouslyApplied", equals: "Yes" },
      }),
      textarea("previousVisaOutcome", "Outcome details", {
        visibleWhen: { field: "previouslyApplied", equals: "Yes" },
        ui: { colSpan: 2 },
      }),
    ]
  ),
  step(
    "supporting-documents",
    "Supporting documents",
    "Upload supporting documents to strengthen your application.",
    [
      file("resumeUpload", "Upload resume", { ui: { colSpan: 2 } }),
      file("policeCheckUpload", "Upload police check", { ui: { colSpan: 2 } }),
      checkbox("docsConfirm", "I confirm the documents are accurate."),
      info("Uploads are simulated. Keep the files ready for the real portal.", {
        ui: { colSpan: 2 },
      }),
    ]
  ),
  step(
    "emergency-contact",
    "Emergency contact",
    "Provide a contact person in case of an emergency.",
    [
      shadowComponent(
        "emergencyContact",
        "Emergency contact details",
        [
          { id: "ecName", label: "Full name", type: "text" },
          { id: "ecRelationship", label: "Relationship", type: "select", options: ["Parent", "Partner", "Friend", "Other"] },
          { id: "ecRelationshipOther", label: "Please specify", type: "text", visibleWhen: { field: "ecRelationship", equals: "Other" } },
          { id: "ecPhone", label: "Phone", type: "tel" },
          { id: "ecEmail", label: "Email", type: "email" },
        ],
        { ui: { colSpan: 2 } }
      ),
    ]
  ),
  step(
    "review-confirm",
    "Review and confirm details",
    "Check key information and confirm your answers.",
    [
      info(
        "You can still change details later, but ensure names and dates are correct.",
        { ui: { colSpan: 2 } }
      ),
      checkbox("reviewedDetails", "I have reviewed my details for accuracy."),
      textarea("reviewNotes", "Notes or corrections", {
        ui: { colSpan: 2 },
        required: false,
      }),
    ]
  ),
  step(
    "declarations-consent",
    "Declarations and consent",
    "Provide declarations before payment.",
    [
      checkbox("declarationTrue", "I declare the information is true and correct."),
      toggle("consentUpdates", "I consent to electronic communications"),
      select("contactPreference", "Preferred contact method", [
        "Email",
        "SMS",
        "Phone",
      ]),
    ]
  ),
  step(
    "payment",
    "Payment",
    "Simulate the payment required to lodge your application.",
    [
      info(
        "Payment is simulated. Click Pay now to see the processing modal.",
        { ui: { colSpan: 2 } }
      ),
      text("cardName", "Name on card"),
      text("cardNumber", "Card number", {
        validators: [
          { type: "required", message: "Card number is required." },
          { type: "pattern", pattern: "^\\d{16}$", message: "Enter a 16 digit card number." },
        ],
      }),
      text("cardExpiry", "Expiry (MM/YY)"),
      text("cardCvv", "CVV"),
    ],
    { payment: true }
  ),
  step(
    "final-review",
    "Final review summary",
    "Review the key details before submitting your application.",
    [
      info("Review the summary and submit when ready.", { ui: { colSpan: 2 } }),
    ],
    { summary: true }
  ),
];

window.steps = steps;
