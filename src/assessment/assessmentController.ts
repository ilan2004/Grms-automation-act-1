import { Page, BrowserContext } from "@browserbasehq/stagehand";
import { clickWithRetry, typeWithRetry, observeWithRetry } from "../utils/browserUtils";
import { log } from "../utils/logging";
import { drawObserveOverlay, clearOverlays } from "../utils/overlay";
import { answerQuestion } from "./questionHandler";

export async function runAssessment(page: Page, context: BrowserContext, questionCount: number = 10) {
  // Validate current page
  const currentUrl = page.url();
  if (currentUrl.includes("home.htm")) {
    log(`ERROR: Cannot start assessment from home page: ${currentUrl}`);
    throw new Error("Not on assessment page");
  }

  // Start assessment
  log("Selecting an uncompleted assessment and clicking Start");
  try {
    await clickWithRetry(page, "Click the Start button of an uncompleted online assessment", { retries: 3, timeout: 15000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    const observations = await observeWithRetry(page, "Identify the Start button of an uncompleted online assessment at the top", { retries: 3, timeout: 15000 });
    if (observations?.length) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
      await page.waitForTimeout(3000);
    } else {
      log(`ERROR: Could not find Start button. Current URL: ${currentUrl}`);
      throw new Error("Could not find Start button");
    }
  }

  // Enter assessment key
  log("Entering assessment key for verification");
  try {
    await typeWithRetry(page, "Type '1234' in the Student Online Assessment Key Verification input field", { retries: 3, timeout: 10000 });
    await page.waitForTimeout(2000);
  } catch (e) {
    const observations = await observeWithRetry(page, "Identify the input field for Student Online Assessment Key Verification", { retries: 3, timeout: 10000 });
    if (observations?.length) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
      await page.keyboard.type("1234");
      await page.waitForTimeout(2000);
    } else {
      log(`ERROR: Could not find key verification input field. Current URL: ${currentUrl}`);
      throw new Error("Could not find key verification input field");
    }
  }

  // Click Verify button
  log("Clicking Verify button");
  try {
    await clickWithRetry(page, "Click the Verify button in the Student Online Assessment Key Verification prompt", { retries: 3, timeout: 10000 });
    await page.waitForTimeout(3000);
  } catch (e) {
    const observations = await observeWithRetry(page, "Identify the Verify button in the Student Online Assessment Key Verification prompt", { retries: 3, timeout: 10000 });
    if (observations?.length) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
      await page.waitForTimeout(3000);
    } else {
      log(`ERROR: Could not find Verify button. Current URL: ${currentUrl}`);
      throw new Error("Could not find Verify button");
    }
  }

  // Click Start Assessment button
  log("Clicking Start Assessment button");
  try {
    await clickWithRetry(page, "Click the Start Assessment button", { retries: 3, timeout: 10000 });
    await page.waitForTimeout(4000);
  } catch (e) {
    const observations = await observeWithRetry(page, "Identify the Start Assessment button", { retries: 3, timeout: 10000 });
    if (observations?.length) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
      await page.waitForTimeout(4000);
    } else {
      log(`ERROR: Could not find Start Assessment button. Current URL: ${currentUrl}`);
      throw new Error("Could not find Start Assessment button");
    }
  }

  // Answer questions
  log("Starting to answer questions");
  for (let i = 1; i <= questionCount; i++) {
    const success = await answerQuestion(page, i);
    if (!success) {
      log(`Failed to answer question ${i}, aborting`);
      throw new Error(`Failed to answer question ${i}`);
    }
  }

  // End assessment
  log("Handling Confirm End Online Assessment prompt");
  try {
    await clickWithRetry(page, "Click the Yes button in the Confirm End Online Assessment prompt", { retries: 3, timeout: 10000 });
    log("Assessment completed successfully");
  } catch (e) {
    const observations = await observeWithRetry(page, "Identify the Yes button in the Confirm End Online Assessment prompt", { retries: 3, timeout: 10000 });
    if (observations?.length) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
    } else {
      log(`ERROR: Could not find Yes button in Confirm End Online Assessment prompt. Current URL: ${currentUrl}`);
      throw new Error("Could not find Yes button in Confirm End Online Assessment prompt");
    }
  }
}