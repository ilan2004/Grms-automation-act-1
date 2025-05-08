import { Page, BrowserContext } from "@browserbasehq/stagehand";
import { clickWithRetry, typeWithRetry, observeWithRetry } from "../utils/browserUtils";
import { log } from "../utils/logging";
import { drawObserveOverlay, clearOverlays } from "../utils/overlay";

export async function login(page: Page, context: BrowserContext, credentials: { username: string; password: string }) {
  log("Navigating to GRMS login page");
  await page.goto("https://grms.gardencity.university/login.htm");
  await page.waitForLoadState("domcontentloaded");
  log(`Current URL: ${page.url()}`);
  
  // Enter username
  log("Entering username");
  try {
    await clickWithRetry(page, "Click on the username or email field");
    await typeWithRetry(page, `Type '${credentials.username}' in the username field`);
  } catch (e) {
    log("Error with username field, trying alternative approach");
    const observations = await observeWithRetry(page, "Identify the username or email input field");
    if (observations && observations.length > 0) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
      await page.keyboard.type(credentials.username);
    } else {
      throw new Error("Could not find username field");
    }
  }
  
  // Enter password
  log("Entering password");
  try {
    await clickWithRetry(page, "Click on the password field");
    await typeWithRetry(page, `Type '${credentials.password}' in the password field`);
  } catch (e) {
    log("Error with password field, trying alternative approach");
    const observations = await observeWithRetry(page, "Identify the password input field");
    if (observations && observations.length > 0) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await page.act(observations[0]);
      await page.keyboard.type(credentials.password);
    } else {
      throw new Error("Could not find password field");
    }
  }
  
  // Click login button and wait for navigation
  log("Clicking login button");
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: "domcontentloaded" }),
      clickWithRetry(page, "Click the login button"),
    ]);
  } catch (e) {
    log("Error clicking login button, trying alternative approach");
    const observations = await observeWithRetry(page, "Identify the login button");
    if (observations && observations.length > 0) {
      await drawObserveOverlay(page, observations);
      await page.waitForTimeout(1000);
      await clearOverlays(page);
      await Promise.all([
        page.waitForNavigation({ waitUntil: "domcontentloaded" }),
        page.act(observations[0]),
      ]);
    } else {
      throw new Error("Could not find login button");
    }
  }
  
  // Validate login
  const currentUrl = page.url();
  log(`Post-login URL: ${currentUrl}`);
  if (currentUrl === "https://grms.gardencity.university/login.htm") {
    try {
      // Using the simple version of extract that takes just an instruction
      const extractResult = await page.extract("Extract any error messages on the login page");
      throw new Error(`Login failed: ${extractResult.extraction || "Unknown error"}`);
    } catch (extractError) {
      throw new Error(`Login failed: Unable to extract error message - ${extractError instanceof Error ? extractError.message : String(extractError)}`);
    }
  }
  log("Login successful!");
}