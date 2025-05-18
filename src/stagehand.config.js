"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = require("dotenv");
dotenv_1.default.config();
var StagehandConfig = {
    verbose: 1, // Verbosity level for logging: 0 = silent, 1 = info, 2 = all
    domSettleTimeoutMs: 30000, // Timeout for DOM to settle in milliseconds
    // LLM configuration
    modelName: "google/gemini-2.0-flash", // Name of the model to use
    modelClientOptions: {
        apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY, // API key set dynamically in index.ts
    },
    // Browser configuration
    env: "LOCAL", // Run locally, no Browserbase
    localBrowserLaunchOptions: {
        headless: false, // Run in headed mode so users can see the browser
        viewport: {
            width: 1024,
            height: 768,
        },
    },
};
exports.default = StagehandConfig;
