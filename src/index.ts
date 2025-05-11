import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "../stagehand.config.js";
import chalk from "chalk";
import boxen from "boxen";
import { main } from "./automation.js";

// Declare stagehand as a global variable
let stagehand: Stagehand;

async function runAutomation({
  username,
  password,
  apiKey,
}: {
  username: string;
  password: string;
  apiKey: string;
}) {
  // Set the Google Generative AI API key
  process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;

  // Initialize Stagehand
  stagehand = new Stagehand({ ...StagehandConfig });
  await stagehand.init();

  // Log Browserbase session URL if applicable
  if (StagehandConfig.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
    console.log(
      boxen(
        `View this session live in your browser: \n${chalk.blue(
          `https://browserbase.com/sessions/${stagehand.browserbaseSessionID}`
        )}`,
        { title: "Browserbase", padding: 1, margin: 3 }
      )
    );
  }

  const page = stagehand.page;
  const context = stagehand.context;

  try {
    // Call main automation function with dynamic credentials
    await main({ page, context, stagehand, username, password });
    console.log(
      `\n🤘 GRMS login automation completed! Reach out on Slack if you have any feedback: ${chalk.blue(
        "https://stagehand.dev/slack"
      )}\n`
    );
    return { status: "success", message: "Automation completed successfully" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    stagehand.log({
      category: "grms-automation",
      message: `Automation failed: ${errorMessage}`,
    });
    throw new Error(errorMessage);
  } finally {
    await stagehand.close();
  }
}

// Export startAutomation function for server
export async function startAutomation({
  username,
  password,
  apiKey,
}: {
  username: string;
  password: string;
  apiKey: string;
}) {
  try {
    const result = await runAutomation({ username, password, apiKey });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return { status: "error", message: errorMessage };
  }
}