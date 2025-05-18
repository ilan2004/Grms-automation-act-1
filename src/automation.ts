import { Stagehand, Page, BrowserContext } from "@browserbasehq/stagehand";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from 'zod';
import { drawObserveOverlay, clearOverlays } from "../utils.js";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// Rate limiting variables
const REQUESTS_PER_MINUTE = 15;
const MINUTE_IN_MS = 60 * 1000;
let requestTimestamps: number[] = [];

// Zod schema for quiz content
const quizSchema = z.object({
  questionText: z.string(),
  options: z.array(z.object({
    text: z.string(),
  })),
});

// Interface for AI answer response
interface AIAnswerResponse {
  answer: string;
  isMultipleSelect?: boolean;
  multipleAnswers?: string[];
}

// Fuzzy matching for options
function findClosestOption(answer: string, options: string[]): string | null {
  const normalizedAnswer = answer.toLowerCase().trim();
  let bestMatch: string | null = null;
  let maxSimilarity = 0;

  for (const option of options) {
    const normalizedOption = option.toLowerCase().trim();
    let matches = 0;
    for (let i = 0; i < Math.min(normalizedAnswer.length, normalizedOption.length); i++) {
      if (normalizedAnswer[i] === normalizedOption[i]) matches++;
    }
    const similarity = matches / Math.max(normalizedAnswer.length, normalizedOption.length);
    if (similarity > maxSimilarity && similarity > 0.6) {
      maxSimilarity = similarity;
      bestMatch = option;
    }
  }

  return bestMatch;
}

// Rate limiting function
async function rateLimit(): Promise<void> {
  const now = Date.now();
  requestTimestamps = requestTimestamps.filter(ts => now - ts < MINUTE_IN_MS);
  
  if (requestTimestamps.length >= REQUESTS_PER_MINUTE) {
    const oldestRequest = requestTimestamps[0];
    const waitTime = MINUTE_IN_MS - (now - oldestRequest) + 100; // +100ms buffer
    console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    requestTimestamps = [];
  }
  
  requestTimestamps.push(now);
}

// Get AI answer with retry logic
async function getAIAnswer(stagehand: Stagehand, questionText: string, options: string[]): Promise<AIAnswerResponse> {
  const maxRetries = 3;
  let retryCount = 0;

  while (retryCount <= maxRetries) {
    try {
      await rateLimit();

      const prompt = `
        You are an expert assistant. Given the following question and options, identify the correct answer(s).
        IMPORTANT: Determine if this is a single-select (one correct answer) or multiple-select (multiple correct answers) question.
        For single-select, return ONLY the exact text of the correct option.
        For multiple-select, start with "MULTIPLE:" followed by each correct option on a new line.

        Question: ${questionText}
        Options:
        ${options.map((opt, index) => `${index + 1}. ${opt}`).join("\n")}

        Correct Answer:
      `;

      stagehand.log({
        category: "grms-automation",
        message: `Querying Google Generative AI for question: ${questionText.substring(0, 50)}... (Attempt ${retryCount + 1}/${maxRetries + 1})`,
      });

      const result = await model.generateContent(prompt);
      const response = await result.response;
      let answer = response.text().trim();

      stagehand.log({
        category: "grms-automation",
        message: `AI returned answer: ${answer}`,
      });

      if (answer.startsWith("MULTIPLE:")) {
        const multipleAnswers = answer
          .replace("MULTIPLE:", "")
          .split("\n")
          .map(line => line.trim())
          .filter(line => line.length > 0);
        
        stagehand.log({
          category: "grms-automation",
          message: `Detected multiple-select question with ${multipleAnswers.length} answers`,
        });
        
        return { 
          answer: multipleAnswers[0] || "", 
          isMultipleSelect: true, 
          multipleAnswers 
        };
      }

      if (options.includes(answer)) {
        return { answer };
      } else {
        const matchedOption = findClosestOption(answer, options);
        if (matchedOption) {
          stagehand.log({
            category: "grms-automation",
            message: `Mapped AI answer '${answer}' to option '${matchedOption}'`,
          });
          return { answer: matchedOption };
        }
        stagehand.log({
          category: "grms-automation",
          message: `Warning: Could not match AI answer '${answer}' to any option`,
        });
        return { answer };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      stagehand.log({
        category: "grms-automation",
        message: `Error querying AI: ${errorMessage}`,
      });

      if (errorMessage.includes("429 Too Many Requests")) {
        retryCount++;
        const retryDelay = errorMessage.includes("retryDelay") 
          ? parseInt(errorMessage.match(/retryDelay":"(\d+)s"/)?.[1] || "55") * 1000
          : 55000;
        stagehand.log({
          category: "grms-automation",
          message: `Quota exceeded. Retrying in ${retryDelay}ms... (Attempt ${retryCount}/${maxRetries})`,
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }

      throw error;
    }
  }

  stagehand.log({
    category: "grms-automation",
    message: `Failed to query AI after ${maxRetries} retries`,
  });
  throw new Error("Exceeded retry limit for AI query");
}

export async function main({
  page,
  context,
  stagehand,
  username,
  password,
}: {
  page: Page;
  context: BrowserContext;
  stagehand: Stagehand;
  username: string;
  password: string;
}) {
  // Navigate to GRMS login page
  stagehand.log({ category: "grms-automation", message: "Navigating to GRMS login page" });
  await page.goto("https://grms.gardencity.university/login.htm");
  await page.waitForTimeout(1000);

  // Log current URL
  const currentUrl = page.url();
  stagehand.log({ category: "grms-automation", message: `Current URL: ${currentUrl}` });

  // Enter username
  stagehand.log({ category: "grms-automation", message: "Entering username" });
  try {
    await page.act("Click on the username or email field");
    await page.waitForTimeout(500);
  } catch (e) {
    stagehand.log({ category: "grms-automation", message: "Could not find username field, trying alternative" });
    try {
      await page.act("Click on the input field for email or username");
      await page.waitForTimeout(500);
    } catch (e) {
      stagehand.log({ category: "grms-automation", message: "Warning: Could not click username field" });
    }
  }

  try {
    await page.act(`Type '${username}' in the username field`);
  } catch (e) {
    stagehand.log({ category: "grms-automation", message: "Error typing username, trying alternative" });
    const usernameObservations = await page.observe("Identify the username or email input field");
    if (usernameObservations && usernameObservations.length > 0) {
      await drawObserveOverlay(page, usernameObservations);
      await page.waitForTimeout(500);
      await clearOverlays(page);
      await page.act(usernameObservations[0]);
      await page.waitForTimeout(300);
      await page.keyboard.type(username, { delay: 50 });
    } else {
      stagehand.log({ category: "grms-automation", message: "ERROR: Could not find username field" });
      throw new Error("Could not find username field");
    }
  }

  await page.waitForTimeout(500);

  // Enter password
  stagehand.log({ category: "grms-automation", message: "Entering password" });
  try {
    await page.act("Click on the password field");
    await page.waitForTimeout(500);
  } catch (e) {
    stagehand.log({ category: "grms-automation", message: "Could not find password field, trying alternative" });
    try {
      await page.act("Click on the input field for password");
      await page.waitForTimeout(500);
    } catch (e) {
      stagehand.log({ category: "grms-automation", message: "Warning: Could not click password field" });
    }
  }

  try {
    await page.act(`Type '${password}' in the password field`);
  } catch (e) {
    stagehand.log({ category: "grms-automation", message: "Error typing password, trying alternative" });
    const passwordObservations = await page.observe("Identify the password input field");
    if (passwordObservations && passwordObservations.length > 0) {
      await drawObserveOverlay(page, passwordObservations);
      await page.waitForTimeout(500);
      await clearOverlays(page);
      await page.act(passwordObservations[0]);
      await page.waitForTimeout(300);
      await page.keyboard.type(password, { delay: 50 });
    } else {
      stagehand.log({ category: "grms-automation", message: "ERROR: Could not find password field" });
      throw new Error("Could not find password field");
    }
  }

  await page.waitForTimeout(500);

  // Click login button
  stagehand.log({ category: "grms-automation", message: "Clicking login button" });
  try {
    await page.act("Click the login button");
  } catch (e) {
    stagehand.log({ category: "grms-automation", message: "Error clicking login button, trying alternative" });
    const loginObservations = await page.observe("Identify the login button");
    if (loginObservations && loginObservations.length > 0) {
      await drawObserveOverlay(page, loginObservations);
      await page.waitForTimeout(500);
      await clearOverlays(page);
      await page.act(loginObservations[0]);
    } else {
      stagehand.log({ category: "grms-automation", message: "ERROR: Could not find login button" });
      throw new Error("Could not find login button");
    }
  }

  await page.waitForTimeout(2000);

  // Check login success
  const currentUrlAfterLogin = page.url();
  if (currentUrlAfterLogin !== "https://grms.gardencity.university/login.htm") {
    stagehand.log({ category: "grms-automation", message: "Login successful! Redirected to: " + currentUrlAfterLogin });

    // Check if on assessment list page
    const isOnAssessmentPage = await page.evaluate(() => {
      const startButtons = Array.from(document.querySelectorAll('button, input[type="button"]'))
        .filter(el => el.textContent?.includes('Start') || (el as HTMLInputElement).value?.includes('Start'));
      return startButtons.length > 0;
    });

    if (isOnAssessmentPage) {
      stagehand.log({ 
        category: "grms-automation", 
        message: "Already on assessment list page, skipping navigation" 
      });
    } else {
      // Navigate to academic functions
      stagehand.log({ category: "grms-automation", message: "On home page, navigating to academic functions" });
      try {
        await page.act("Click on the academic functions menu in the navbar or dashboard");
        await page.waitForTimeout(1000);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click academic functions, trying alternative" });
        const academicObservations = await page.observe("Identify the academic functions menu in the navbar or dashboard");
        if (academicObservations && academicObservations.length > 0) {
          await drawObserveOverlay(page, academicObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(academicObservations[0]);
          await page.waitForTimeout(1000);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find academic functions menu" });
          throw new Error("Could not find academic functions menu");
        }
      }

      // Click online assessment
      stagehand.log({ category: "grms-automation", message: "Clicking online assessment option" });
      try {
        await page.act("Click on the online assessment option in the dropdown");
        await page.waitForTimeout(1500);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click online assessment, trying alternative" });
        const assessmentObservations = await page.observe("Identify the online assessment option in the dropdown");
        if (assessmentObservations && assessmentObservations.length > 0) {
          await drawObserveOverlay(page, assessmentObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(assessmentObservations[0]);
          await page.waitForTimeout(1500);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find online assessment option" });
          throw new Error("Could not find online assessment option");
        }
      }

      await page.waitForTimeout(3000);
    }
    
    // Loop until no more assessments
    while (true) {
      // Check for Start buttons
      const hasAssessments = await page.evaluate(() => {
        const startButtons = Array.from(document.querySelectorAll('button, input[type="button"]'))
          .filter(el => el.textContent?.includes('Start') || (el as HTMLInputElement).value?.includes('Start'));
        return startButtons.length > 0;
      });
      
      if (!hasAssessments) {
        stagehand.log({ category: "grms-automation", message: "No assessments found to start" });
        break;
      }
      
      // Start uncompleted assessment
      stagehand.log({ category: "grms-automation", message: "Selecting an uncompleted assessment and clicking Start" });
      try {
        await page.act("Click the Start button of an uncompleted online assessment");
        await page.waitForTimeout(1000);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click Start button, trying alternative" });
        const startObservations = await page.observe("Identify the Start button of an uncompleted online assessment at the top");
        if (startObservations && startObservations.length > 0) {
          await drawObserveOverlay(page, startObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(startObservations[0]);
          await page.waitForTimeout(1000);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Start button" });
          throw new Error("Could not find Start button");
        }
      }
      
      // Enter assessment key
      stagehand.log({ category: "grms-automation", message: "Entering assessment key for verification" });
      try {
        await page.act("Type '1234' in the Student Online Assessment Key Verification input field");
        await page.waitForTimeout(500);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not type key, trying alternative" });
        const keyObservations = await page.observe("Identify the input field for Student Online Assessment Key Verification");
        if (keyObservations && keyObservations.length > 0) {
          await drawObserveOverlay(page, keyObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(keyObservations[0]);
          await page.waitForTimeout(300);
          await page.keyboard.type("1234", { delay: 50 });
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find key verification input field" });
          throw new Error("Could not find key verification input field");
        }
      }

      // Click Verify button
      stagehand.log({ category: "grms-automation", message: "Clicking Verify button" });
      try {
        await page.act("Click the Verify button in the Student Online Assessment Key Verification prompt");
        await page.waitForTimeout(1000);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click Verify button, trying alternative" });
        const verifyObservations = await page.observe("Identify the Verify button in the Student Online Assessment Key Verification prompt");
        if (verifyObservations && verifyObservations.length > 0) {
          await drawObserveOverlay(page, verifyObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(verifyObservations[0]);
          await page.waitForTimeout(1000);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Verify button" });
          throw new Error("Could not find Verify button");
        }
      }
      
      // Click Start Assessment button
      stagehand.log({ category: "grms-automation", message: "Clicking Start Assessment button" });
      try {
        await page.act("Click the Start Assessment button");
        await page.waitForTimeout(1500);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click Start Assessment button, trying alternative" });
        const startAssessmentObservations = await page.observe("Identify the Start Assessment button");
        if (startAssessmentObservations && startAssessmentObservations.length > 0) {
          await drawObserveOverlay(page, startAssessmentObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(startAssessmentObservations[0]);
          await page.waitForTimeout(1500);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Start Assessment button" });
          throw new Error("Could not find Start Assessment button");
        }
      }

      // Answer 10 questions
      stagehand.log({ category: "grms-automation", message: "Starting to answer 10 questions" });
      for (let i = 1; i <= 10; i++) {
        stagehand.log({ category: "grms-automation", message: `Processing question ${i}` });

        try {
          // Extract question and options
          let extractResult = await page.extract({
            instruction: "Extract the current quiz question and all answer options",
            schema: quizSchema,
          });

          if (!extractResult || !extractResult.questionText || !extractResult.options || extractResult.options.length === 0) {
            const detailedExtract = await page.extract({
              instruction: "Look for a quiz question (usually starts with 'Question X of Y') and multiple choice options (usually labeled as Option 1, Option 2, etc). Extract the question text and all available options.",
              schema: quizSchema,
            });
            
            if (!detailedExtract || !detailedExtract.questionText || !detailedExtract.options || detailedExtract.options.length === 0) {
              throw new Error("Failed to extract question content");
            }
            
            extractResult = detailedExtract;
          }

          const questionMatch = extractResult.questionText.match(/Question \d+ of \d+[:\s]+(.*)/s);
          const questionText = questionMatch ? questionMatch[1].trim() : extractResult.questionText.trim();
          const options = extractResult.options.map(opt => opt.text.replace(/^Option \d+\s*/, "").trim());
          const fullOptions = extractResult.options.map(opt => opt.text.trim());

          if (!questionText || options.length === 0) {
            throw new Error("Failed to extract valid question text or options");
          }

          stagehand.log({ category: "grms-automation", message: `Extracted question: ${questionText.substring(0, 50)}... with ${options.length} options` });

          // Get AI answer
          const [aiResponse] = await Promise.all([
            getAIAnswer(stagehand, questionText, options),
            page.waitForTimeout(500)
          ]);
          
          // Handle multiple-select questions
          if (aiResponse.isMultipleSelect && aiResponse.multipleAnswers && aiResponse.multipleAnswers.length > 0) {
            stagehand.log({ 
              category: "grms-automation", 
              message: `Processing multiple-select question with ${aiResponse.multipleAnswers.length} answers` 
            });
            
            for (const answerText of aiResponse.multipleAnswers) {
              const optionIndex = options.findIndex(opt => 
                opt === answerText || 
                opt.includes(answerText) || 
                answerText.includes(opt) || 
                findClosestOption(answerText, options) === opt
              );
              
              if (optionIndex >= 0) {
                const selectedOption = fullOptions[optionIndex];
                stagehand.log({ 
                  category: "grms-automation", 
                  message: `Attempting to select multiple-select option: '${selectedOption}'` 
                });
                
                for (let attempt = 1; attempt <= 3; attempt++) {
                  try {
                    // Try direct checkbox click
                    const checkboxSelector = await page.evaluate((opt) => {
                      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
                      const label = checkboxes.find(cb => {
                        const parent = cb.closest('label') || cb.nextElementSibling;
                        return parent?.textContent?.includes(opt);
                      });
                      return label ? `[id="${label.getAttribute('id')}"]` : null;
                    }, selectedOption);
                    
                    if (checkboxSelector) {
                      await page.click(checkboxSelector);
                      stagehand.log({ 
                        category: "grms-automation", 
                        message: `Clicked checkbox for option: '${selectedOption}'` 
                      });
                    } else {
                      await page.act(`Select the option '${selectedOption}' for the current question`);
                    }
                    
                    // Verify selection
                    const isSelected = await page.evaluate((opt) => {
                      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
                      const checkbox = checkboxes.find(cb => {
                        const parent = cb.closest('label') || cb.nextElementSibling;
                        return parent?.textContent?.includes(opt);
                      });
                      return (checkbox as HTMLInputElement)?.checked;
                    }, selectedOption);
                    
                    if (isSelected) {
                      stagehand.log({ 
                        category: "grms-automation", 
                        message: `Verified selection of option: '${selectedOption}'` 
                      });
                      break;
                    } else {
                      throw new Error(`Option '${selectedOption}' not selected`);
                    }
                  } catch (actError) {
                    stagehand.log({ 
                      category: "grms-automation", 
                      message: `Error during selection attempt ${attempt}: ${actError instanceof Error ? actError.message : String(actError)}` 
                    });
                    if (attempt === 3) {
                      stagehand.log({ 
                        category: "grms-automation", 
                        message: `Warning: Failed to select option '${selectedOption}' after ${attempt} attempts` 
                      });
                    }
                    await page.waitForTimeout(500);
                  }
                }
              } else {
                stagehand.log({ 
                  category: "grms-automation", 
                  message: `Warning: Could not map answer '${answerText}' to any option` 
                });
              }
            }
          } else {
            // Single-select question
            const answer = aiResponse.answer;
            const optionIndex = options.findIndex(opt => opt === answer || opt.includes(answer) || answer.includes(opt));
            
            if (optionIndex >= 0) {
              const selectedOption = fullOptions[optionIndex];
              
              for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                  await page.act(`Select the option '${selectedOption}' for the current question`);
                  await page.waitForTimeout(300);
                  break;
                } catch (actError) {
                  stagehand.log({ 
                    category: "grms-automation", 
                    message: `Error during selection attempt ${attempt}: ${actError instanceof Error ? actError.message : String(actError)}` 
                  });
                  if (attempt === 3) {
                    stagehand.log({ 
                      category: "grms-automation", 
                      message: `Warning: Failed to select option after ${attempt} attempts` 
                    });
                    try {
                      await page.act(`Select option ${optionIndex + 1} for the current question`);
                      await page.waitForTimeout(300);
                    } catch (indexError) {
                      throw new Error(`Failed to select option: ${indexError instanceof Error ? indexError.message : String(indexError)}`);
                    }
                  }
                }
              }
            } else {
              stagehand.log({ 
                category: "grms-automation", 
                message: `Warning: Could not map AI answer '${answer}' to any option, trying first option` 
              });
              
              try {
                await page.act(`Select the first option for the current question`);
                await page.waitForTimeout(300);
              } catch (fallbackError) {
                stagehand.log({ 
                  category: "grms-automation", 
                  message: `Warning: Fallback selection failed: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}` 
                });
              }
            }
          }

          // Click Save and Next
          try {
            await page.act("Click the Save and Next button");
            await page.waitForTimeout(1000);
          } catch (saveError) {
            stagehand.log({ 
              category: "grms-automation", 
              message: `Could not click Save and Next button: ${saveError instanceof Error ? saveError.message : String(saveError)}` 
            });
            const saveNextObservations = await page.observe("Identify the Save and Next button");
            if (saveNextObservations && saveNextObservations.length > 0) {
              await drawObserveOverlay(page, saveNextObservations);
              await page.waitForTimeout(500);
              await clearOverlays(page);
              await page.act(saveNextObservations[0]);
              await page.waitForTimeout(1000);
            } else {
              stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Save and Next button" });
              throw new Error("Could not find Save and Next button");
            }
          }
        } catch (e) {
          stagehand.log({ 
            category: "grms-automation", 
            message: `Error processing question ${i}: ${e instanceof Error ? e.message : String(e)}` 
          });
          throw new Error(`Failed to process question ${i}`);
        }
      }

      // Handle end of assessment
      stagehand.log({ category: "grms-automation", message: "Handling Confirm End Online Assessment prompt" });
      try {
        await page.act("Click the Yes button in the Confirm End Online Assessment prompt");
        await page.waitForTimeout(1500);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click Yes button, trying alternative" });
        const yesObservations = await page.observe("Identify the Yes button in the Confirm End Online Assessment prompt");
        if (yesObservations && yesObservations.length > 0) {
          await drawObserveOverlay(page, yesObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(yesObservations[0]);
          await page.waitForTimeout(1500);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Yes button" });
          throw new Error("Could not find Yes button");
        }
      }
      
      // Handle completion message
      try {
        await page.act("Click the OK button in the Assessment completed successfully message");
        await page.waitForTimeout(1000);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click OK button, trying alternative" });
        const okObservations = await page.observe("Identify the OK button in the Assessment completed successfully message");
        if (okObservations && okObservations.length > 0) {
          await drawObserveOverlay(page, okObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(okObservations[0]);
          await page.waitForTimeout(1000);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find OK button" });
          throw new Error("Could not find OK button");
        }
      }
      
      // Return to assessment list
      try {
        await page.act("Click the Back button");
        await page.waitForTimeout(1500);
      } catch (e) {
        stagehand.log({ category: "grms-automation", message: "Could not click Back button, trying alternative" });
        const backObservations = await page.observe("Identify the Back button");
        if (backObservations && backObservations.length > 0) {
          await drawObserveOverlay(page, backObservations);
          await page.waitForTimeout(500);
          await clearOverlays(page);
          await page.act(backObservations[0]);
          await page.waitForTimeout(1500);
        } else {
          stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Back button" });
          throw new Error("Could not find Back button");
        }
      }
      
      // Check for more assessments
      const hasMoreAssessments = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('button, input[type="button"]'))
          .some(el => el.textContent?.includes('Start') || (el as HTMLInputElement).value?.includes('Start'));
      });
      
      if (!hasMoreAssessments) break;
    }
  } else {
    stagehand.log({ category: "grms-automation", message: "Login failed, still on login page" });
    throw new Error("Login failed");
  }
}