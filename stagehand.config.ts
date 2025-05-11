import type { ConstructorParams } from "@browserbasehq/stagehand";
import dotenv from "dotenv";

dotenv.config();

const StagehandConfig: ConstructorParams = {
  verbose: 1, // Verbosity level for logging: 0 = silent, 1 = info, 2 = all
  domSettleTimeoutMs: 30_000, // Timeout for DOM to settle in milliseconds

  // LLM configuration
  modelName: "google/gemini-2.0-flash", // Name of the model to use
  modelClientOptions: {
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, // API key set dynamically in index.ts
  },

  // Browser configuration
  env: "LOCAL", // Run locally, no Browserbase
  localBrowserLaunchOptions: {
    viewport: {
      width: 1024,
      height: 768,
    },
  },
};

export default StagehandConfig;