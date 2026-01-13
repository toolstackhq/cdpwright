import { describe, it, expect as vitestExpect } from "vitest";
import path from "path";
import { pathToFileURL } from "url";
import { chromium } from "../src/index.js";

const runIntegration = process.env.RUN_INTEGRATION === "1";
const testFn = runIntegration ? it : it.skip;

const appPath = path.resolve(process.cwd(), "index.html");



async function waitForStep(page: any, stepId: string) {
  await page.expect(`[data-testid="step-${stepId}"]`).toBeVisible();
  await page.expect('[data-testid="loading-overlay"]').toBeHidden();
}

async function nextStep(page: any, stepId: string) {
  await page.click("#next");
  await waitForStep(page, stepId);
}

describe("visa wizard integration", () => {
  testFn("completes the wizard and validates automation primitives", async () => {
    let browser;
    try {
      browser = await chromium.launch({
        headless: false,
        maximize: true,
        args: process.platform === "linux"
          ? ["--no-sandbox", "--no-zygote", "--disable-dev-shm-usage"]
          : []
      });
      const page = await browser.newPage();

      await page.goto(pathToFileURL(appPath).toString(), { allowFileUrl: true, waitUntil: "load" });
      await waitForStep(page, "start-eligibility");

      await page.click("#settings-gear");
      await page.expect('[data-testid="settings-panel"]').toBeVisible();
      await page.click("#deterministic-toggle");
      await page.expect("#deterministic-toggle").toBeChecked();
      await page.fillInput("#deterministic-seed", "42");
      await page.click("#settings-gear");

      await page.click('[data-testid="fld-visaStream-0"]');
      await page.selectOption('[data-testid="fld-visitPurpose"]', "Work and contribute");
      await page.click('[data-testid="fld-eligibilityConfirm"]');
      await page.click('[data-testid="fld-portalUpdates"]');
      await page.click("#fld-eligibilityAccordion-toggle-0");
      await page.expect('[data-testid="fld-eligibilityAccordion-section-0"]').toContainText("Document checklist");

      await page.click("#save-draft");
      await page.expect('[data-testid="draft-modal"]').toBeVisible();
      await page.click("#draft-close");

      await nextStep(page, "applicant-name-dob");
      await page.type("#input-firstName", "Ava");
      await page.type("#input-middleName", "Rose");
      await page.type("#input-lastName", "Patel");
      await page.type("#input-dob", "1992-06-18");
      await page.selectOption('[data-testid="fld-gender"]', "Other");
      await page.type("#input-genderOther", "Non-binary");

      await nextStep(page, "citizenship-residency");
      await page.selectOption('[data-testid="fld-citizenship"]', "India");
      await page.selectOption('[data-testid="fld-residencyStatus"]', "Temporary resident");
      await page.type("#input-passportNumber", "P1234567");
      await page.type("#input-passportExpiry", "2029-04-30");
      await page.click('[data-testid="fld-dualCitizen"]');

      await nextStep(page, "passport-identity");
      await page.type("#input-passportIssuePlace", "Mumbai");
      await page.selectOption('[data-testid="fld-passportIssueCountry"]', "India");
      await page.type("#input-passportIssueDate", "2019-05-20");
      await page.setFileInput('[data-testid="fld-passportUpload"]', "passport.txt", "passport data");
      await page.expect('[data-testid="fld-passportUpload-progress-bar"]').toHaveAttribute("style", /100%/);
      await page.type("#input-nationalId", "IND-789456");

      await nextStep(page, "contact-details");
      await page.type("#input-email", "bad-email");
      await page.click("#next");
      await page.expect('[data-testid="fld-email-error"]').toHaveText("Enter a valid email.");
      await page.evaluate(() => {
        const email = document.querySelector("#input-email");
        if (email instanceof HTMLInputElement) {
          email.value = "";
          email.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
      await page.type("#input-email", "ava.patel@example.com");
      await page.type("#input-mobile", "+61 412 555 111");
      await page.type("#input-altPhone", "+61 412 555 222");
      await page.type("#input-preferredSuburb", "Syd");
      await page.click("#fld-preferredSuburb-option-0");

      await nextStep(page, "address-current");
      await page.type("#input-addressLine1", "88 Harbour Street");
      await page.type("#input-addressLine2", "Unit 10");
      await page.type("#input-city", "Sydney");
      await page.selectOption('[data-testid="fld-state"]', "New South Wales");
      await page.type("#input-postcode", "2000");
      await page.click('[data-testid="fld-postalSame"]');
      await page.expect('[data-testid="fld-postalSame"]').toBeChecked();

      await nextStep(page, "address-history");
      await page.click("#fld-addressHistory-add");
      await page.expect("#input-addressHistory-0-address").toBeVisible();
      await page.type("#input-addressHistory-0-address", "12 Market Street, Perth");
      await page.type("#input-addressHistory-0-from", "2019-01");
      await page.type("#input-addressHistory-0-to", "2021-06");
      await page.type("#input-addressHistory-0-country", "Australia");

      await nextStep(page, "employment-details");
      await page.selectOption('[data-testid="fld-employmentStatus"]', "Employed");
      await page.type("#input-employer", "Southern Tech" );
      await page.type("#input-occupation", "Software developer");
      await page.type("#input-occupationList", "Software");
      await page.click("#fld-occupationList-option-0");
      await page.type("#input-employmentYears", "4");
      await page.click('[data-testid="fld-industryAreas-2"]');
      await page.click('[data-testid="fld-industryAreas-4"]');

      await nextStep(page, "education");
      await page.selectOption('[data-testid="fld-highestQualification"]', "Bachelor degree");
      await page.type("#input-institution", "University of Sydney");
      await page.type("#input-gradYear", "2014");
      await page.type("#input-educationNotes", "Completed additional DevOps training.");

      await nextStep(page, "travel-history");
      await page.click("#fld-travelHistory-add");
      await page.type("#input-travelHistory-0-country", "Japan");
      await page.type("#input-travelHistory-0-from", "2018-10");
      await page.type("#input-travelHistory-0-to", "2018-11");
      await page.type("#input-travelHistory-0-reason", "Conference");

      await nextStep(page, "family-details");
      await page.click('[data-testid="fld-maritalStatus-1"]');
      await page.type("#input-spouseName", "Chris Patel");
      await page.type("#input-spouseDob", "1990-03-12");
      await page.selectOption('[data-testid="fld-spouseCitizenship"]', "Australia");

      await nextStep(page, "dependants");
      await page.click('[data-testid="fld-hasDependants-0"]');
      await page.type("#input-dependantsCount", "1");
      await page.click("#fld-dependantDetails-add");
      await page.type("#input-dependantDetails-0-name", "Riley Patel");
      await page.type("#input-dependantDetails-0-dob", "2015-08-20");
      await page.type("#input-dependantDetails-0-relationship", "Child");

      await nextStep(page, "health-declarations");
      await page.click('[data-testid="fld-healthCondition"]');
      await page.type("#input-healthDetails", "Asthma managed with medication.");
      await page.click('[data-testid="fld-healthInsurance"]');

      await nextStep(page, "character-declarations");
      await page.click('[data-testid="fld-criminalConvictions-0"]');
      await page.type("#input-convictionDetails", "Minor traffic offence in 2016.");
      await page.click('[data-testid="fld-convictionAck"]');
      await page.expect('[data-testid="fld-convictionAck"]').toBeChecked();

      await nextStep(page, "previous-applications");
      await page.click('[data-testid="fld-previouslyApplied-0"]');
      await page.type("#input-previousVisaType", "Visitor visa");
      await page.type("#input-previousVisaDate", "2017-02-01");
      await page.type("#input-previousVisaOutcome", "Granted and complied with conditions.");

      await nextStep(page, "supporting-documents");
      await page.setFileInput('[data-testid="fld-resumeUpload"]', "resume.txt", "resume content");
      await page.setFileInput('[data-testid="fld-policeCheckUpload"]', "police.txt", "police check");
      await page.click('[data-testid="fld-docsConfirm"]');

      await nextStep(page, "emergency-contact");
      await page.expect("emergency-contact").toBeVisible();
      await page.evaluate(() => {
        const host = document.querySelector("emergency-contact");
        if (!host || !host.shadowRoot) return;
        const setValue = (sel: string, val: string) => {
          const el = host.shadowRoot!.querySelector(sel) as HTMLInputElement | HTMLSelectElement | null;
          if (!el) return;
          el.value = val;
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        };
        setValue('[data-testid="fld-ecName"]', "Jordan Lee");
        const rel = host.shadowRoot!.querySelector('[data-testid="fld-ecRelationship"]') as HTMLSelectElement | null;
        if (rel) {
          rel.value = "Other";
          rel.dispatchEvent(new Event("change", { bubbles: true }));
        }
        setValue('[data-testid="fld-ecRelationshipOther"]', "Neighbour");
        setValue('[data-testid="fld-ecPhone"]', "+61 401 222 333");
        setValue('[data-testid="fld-ecEmail"]', "jordan.lee@example.com");
      });

      await nextStep(page, "review-confirm");
      await page.click('[data-testid="fld-reviewedDetails"]');
      await page.type("#input-reviewNotes", "All details reviewed.");

      await nextStep(page, "declarations-consent");
      await page.click('[data-testid="fld-declarationTrue"]');
      await page.click('[data-testid="fld-consentUpdates"]');
      await page.selectOption('[data-testid="fld-contactPreference"]', "Email");

      await nextStep(page, "payment");
      await page.type("#input-cardName", "Ava Patel");
    await page.type("#input-cardNumber", "4242424242424242");
    await page.type("#input-cardExpiry", "12/28");
    await page.type("#input-cardCvv", "123");
    await page.click("#pay-now");
    await page.expect('[data-testid="toast"]').toHaveText("Payment successful");
    await page.expect('[data-testid="toast"]').toBeHidden();

    await nextStep(page, "final-review");
    await page.expect('[data-testid="summary-table"]').toContainText("Ava Patel");

      await page.click("#next");
      await page.expect('[data-testid="submission-screen"]').toBeVisible();
      await page.expect('[data-testid="application-ref"]').toContainText("EVO-2026-");
      await page.click("#download-receipt");
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }, 180000);
});
