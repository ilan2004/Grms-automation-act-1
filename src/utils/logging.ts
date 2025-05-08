import { Stagehand } from "@browserbasehq/stagehand";
import boxen from "boxen";
import chalk from "chalk";

let stagehand: Stagehand | null = null;

export function setStagehand(instance: Stagehand) {
  stagehand = instance;
}

export function log(message: string) {
  const logMessage = { category: "grms-automation", message };
  if (stagehand) {
    stagehand.log(logMessage);
  }
  console.log(`[${logMessage.category}] ${logMessage.message}`);
}

export function announce(message: string, title?: string) {
  console.log(
    boxen(message, {
      padding: 1,
      margin: 3,
      title: title || "Stagehand",
    }),
  );
}