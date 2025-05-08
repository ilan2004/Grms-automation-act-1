import { Page } from "@browserbasehq/stagehand";
import { clickWithRetry, observeWithRetry, typeWithRetry } from "../utils/browserUtils";
import { log } from "../utils/logging";
import { drawObserveOverlay, clearOverlays } from "../utils/overlay";
import { getAIAnswer, AIAnswerResponse } from "../ai/aiAnswer";

export async function answerQuestion(page: Page, questionNumber: number): Promise<boolean> {
  log(`Processing question ${questionNumber}`);

  // Validate quiz page
  const currentUrl = page.url();
  if (!currentUrl.includes("studentTest")) {
    log(`ERROR: Not on the test page: ${currentUrl}`);
    return false;
  }

  try {
    // Try multiple observation strategies to extract questions and options
    let questionText = "";
    let options: string[] = [];
    
    // Strategy 1: Direct observation with specific instruction
    log("Attempting to extract question and options via direct observation");
    const observations = await observeWithRetry(page, 
      "Identify the current quiz question and its answer options", 
      { retries: 2, timeout: 10000 });
    
    if (observations && observations.length > 0) {
      // Try to extract question text
      const questionData = observations.find(obs => 
        obs.description?.toLowerCase().includes("question") ||
        (obs.arguments?.[0] && typeof obs.arguments[0] === 'string' && 
         obs.arguments[0].includes("?"))
      );
      
      if (questionData?.arguments?.[0]) {
        questionText = questionData.arguments[0].trim();
        log(`Found question text: ${questionText.substring(0, 50)}...`);
      }
      
      // Try to extract options
      const optionsData = observations.find(obs => 
        obs.description?.toLowerCase().includes("option") ||
        obs.description?.toLowerCase().includes("answer")
      );
      
      if (optionsData?.arguments?.[0]) {
        // Try to parse options with different patterns
        const optionsText = optionsData.arguments[0];
        
        // Pattern 1: "Option X: text"
        let optionMatches = optionsText.match(/Option \d+:?\s*([^\n]+)/gi);
        if (optionMatches && optionMatches.length > 0) {
          options = optionMatches.map(opt => 
            opt.replace(/^Option \d+:?\s*/i, "").trim()
          );
          log(`Found ${options.length} options via pattern 1`);
        } 
        // Pattern 2: Just extract options by looking for option-like text
        else {
          options = optionsText.split(/\n|\\n/)
            .map(line => line.trim())
            .filter(line => line.length > 0 && !line.toLowerCase().includes("question"));
          log(`Found ${options.length} options via pattern 2`);
        }
      }
    }
    
    // Strategy 2: If strategy 1 failed, try DOM-based extraction
    if (!questionText || options.length === 0) {
      log("Strategy 1 failed, trying DOM-based extraction");
      
      const extractionResult = await page.evaluate(() => {
        // Find question text
        let question = "";
        const questionEls = Array.from(document.querySelectorAll('.question-text, .quiz-question, h3, p, div'))
          .filter(el => el.textContent?.trim().length > 10 && el.textContent?.includes("?"));
        
        if (questionEls.length > 0) {
          question = questionEls[0].textContent?.trim() || "";
        }
        
        // Find options
        const optionsList: string[] = [];
        // Look for radio inputs with labels
        const radioOptions = document.querySelectorAll('input[type="radio"]');
        if (radioOptions.length > 0) {
          radioOptions.forEach(radio => {
            const label = radio.closest('label') || 
                         document.querySelector(`label[for="${radio.id}"]`) ||
                         radio.parentElement?.querySelector('label');
            
            if (label && label.textContent) {
              optionsList.push(label.textContent.trim());
            }
          });
        }
        
        // If no radio buttons found, try looking for option-like elements
        if (optionsList.length === 0) {
          const potentialOptions = document.querySelectorAll('.option, .answer, li, .mcq-option');
          potentialOptions.forEach(el => {
            if (el.textContent && el.textContent.trim().length > 0) {
              optionsList.push(el.textContent.trim());
            }
          });
        }
        
        return { question, options: optionsList };
      });
      
      if (extractionResult.question) {
        questionText = extractionResult.question;
        log(`DOM extraction found question: ${questionText.substring(0, 50)}...`);
      }
      
      if (extractionResult.options && extractionResult.options.length > 0) {
        options = extractionResult.options;
        log(`DOM extraction found ${options.length} options`);
      }
    }
    
    // Strategy 3: Use visual inspection and OCR-like approach
    if (!questionText || options.length === 0) {
      log("Strategy 2 failed, trying visual inspection");
      
      // Take a screenshot and use more general observation to identify elements
      const visualObservations = await observeWithRetry(page, 
        "Look at the current page and identify any question text and multiple choice options visible", 
        { retries: 1, timeout: 15000 });
      
      if (visualObservations && visualObservations.length > 0) {
        // Draw overlays to visualize what was found
        await drawObserveOverlay(page, visualObservations);
        await page.waitForTimeout(1000);
        await clearOverlays(page);
        
        // Process the observations
        for (const obs of visualObservations) {
          const text = obs.arguments?.[0] || "";
          if (text.includes("?") && text.length > 10 && !questionText) {
            questionText = text;
            log(`Visual inspection found question: ${questionText.substring(0, 50)}...`);
          } else if (text.length > 0 && text.length < 100) {
            options.push(text);
          }
        }
        
        // Filter options to remove duplicates and non-option-like text
        if (options.length > 0) {
          options = [...new Set(options)].filter(opt => 
            opt.length > 0 && 
            opt.length < 100 && 
            !opt.includes("question") &&
            !opt.includes("next") &&
            !opt.includes("previous")
          );
          log(`Visual inspection found ${options.length} options`);
        }
      }
    }
    
    // Final validation
    if (!questionText || options.length < 2) {
      // Log detailed debug information
      log(`ERROR: Failed to extract question data. Question text found: ${questionText ? "YES" : "NO"}`);
      log(`Options found: ${options.length}`);
      log(`Options: ${JSON.stringify(options)}`);
      throw new Error("Failed to extract question text or options");
    }
    
    log(`Successfully extracted question: "${questionText.substring(0, 50)}..."`);
    log(`Options (${options.length}): ${JSON.stringify(options)}`);
    
    // Get AI answer
    const aiResponse: AIAnswerResponse = await getAIAnswer(questionText, options);
    const selectedOption = aiResponse.answer;
    
    if (!selectedOption || !options.some(opt => opt.includes(selectedOption))) {
      log(`WARNING: AI answer '${selectedOption}' may not match any option perfectly`);
    }
    
    // Select answer with retry using multiple strategies
    let optionSelected = false;
    
    // Strategy 1: Try clicking by text description
    for (let attempt = 1; attempt <= 2 && !optionSelected; attempt++) {
      try {
        log(`Selecting option: ${selectedOption} (attempt ${attempt})`);
        await clickWithRetry(page, `Select the option '${selectedOption}' for the question`, 
          { retries: 1, timeout: 5000 });
        
        // Verify selection
        const verificationResult = await page.evaluate((answerText) => {
          const inputs = document.querySelectorAll('input[type="radio"]');
          for (const input of inputs) {
            const label = input.closest('label') || 
                         document.querySelector(`label[for="${input.id}"]`) ||
                         input.parentElement?.querySelector('label');
            
            if (label && label.textContent?.includes(answerText)) {
              return (input as HTMLInputElement).checked;
            }
          }
          return false;
        }, selectedOption);
        
        if (verificationResult) {
          optionSelected = true;
          log(`Successfully selected option '${selectedOption}'`);
        }
      } catch (e) {
        log(`Selection attempt ${attempt} failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    // Strategy 2: Try to find and click the radio button directly
    if (!optionSelected) {
      log("Trying direct option element selection");
      const optionElements = await observeWithRetry(page, 
        `Find all answer option elements for the current question`, 
        { retries: 1, timeout: 5000 });
      
      if (optionElements && optionElements.length > 0) {
        await drawObserveOverlay(page, optionElements);
        await page.waitForTimeout(1000);
        await clearOverlays(page);
        
        // Find the best matching option element
        let bestMatch: any = null;
        let bestScore = 0;
        
        for (const elem of optionElements) {
          const elemText = elem.arguments?.[0] || "";
          if (elemText.includes(selectedOption)) {
            bestMatch = elem;
            break; // Exact match
          } else {
            // Calculate similarity score
            const score = calculateSimilarity(elemText, selectedOption);
            if (score > bestScore && score > 0.6) {
              bestScore = score;
              bestMatch = elem;
            }
          }
        }
        
        if (bestMatch) {
          try {
            await page.act(bestMatch);
            await page.waitForTimeout(1000);
            
            // Verify selection
            const verificationResult = await page.evaluate(() => {
              const inputs = document.querySelectorAll('input[type="radio"]:checked');
              return inputs.length > 0;
            });
            
            if (verificationResult) {
              optionSelected = true;
              log(`Successfully selected option via direct element interaction`);
            }
          } catch (e) {
            log(`Direct element selection failed: ${e instanceof Error ? e.message : String(e)}`);
          }
        }
      }
    }
    
    // Strategy 3: Try keyboard navigation
    if (!optionSelected) {
      log("Trying keyboard navigation to select option");
      try {
        // Try to focus the first option and then use keyboard to navigate
        const firstOption = await observeWithRetry(page, 
          "Find the first answer option element", 
          { retries: 1, timeout: 3000 });
        
        if (firstOption?.[0]) {
          await page.act(firstOption[0]);
          await page.waitForTimeout(500);
          
          // Press Tab and Space in sequence to try to select options
          for (let i = 0; i < options.length; i++) {
            if (i > 0) {
              await page.keyboard.press("Tab");
              await page.waitForTimeout(300);
            }
            
            // Check if current option matches desired answer
            const currentFocus = await page.evaluate(() => {
              const activeEl = document.activeElement;
              if (activeEl) {
                if (activeEl.tagName === 'INPUT' && activeEl.getAttribute('type') === 'radio') {
                  const label = activeEl.closest('label') || 
                              document.querySelector(`label[for="${activeEl.id}"]`) ||
                              activeEl.parentElement?.querySelector('label');
                  return label?.textContent || "";
                }
                return activeEl.textContent || "";
              }
              return "";
            });
            
            if (currentFocus.includes(selectedOption)) {
              await page.keyboard.press("Space");
              await page.waitForTimeout(500);
              
              // Verify selection
              const isSelected = await page.evaluate(() => {
                const activeEl = document.activeElement;
                return activeEl && activeEl.tagName === 'INPUT' && 
                      (activeEl as HTMLInputElement).checked;
              });
              
              if (isSelected) {
                optionSelected = true;
                log(`Successfully selected option via keyboard navigation`);
                break;
              }
            }
          }
        }
      } catch (e) {
        log(`Keyboard navigation failed: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    
    if (!optionSelected) {
      throw new Error(`Failed to select answer option after trying multiple methods`);
    }
    
    // Save and next
    log("Clicking Save and Next button");
    try {
      await clickWithRetry(page, "Click the Save and Next button", { retries: 2, timeout: 5000 });
    } catch (e) {
      // Try alternative button text
      const nextButtons = await observeWithRetry(page, 
        "Find the button to proceed to the next question", 
        { retries: 1, timeout: 5000 });
      
      if (nextButtons && nextButtons.length > 0) {
        await drawObserveOverlay(page, nextButtons);
        await page.waitForTimeout(1000);
        await clearOverlays(page);
        await page.act(nextButtons[0]);
      } else {
        throw new Error("Could not find Save and Next button");
      }
    }
    
    await page.waitForTimeout(3000);
    log(`Question ${questionNumber} answered and saved`);
    return true;
  } catch (e) {
    log(`Error processing question ${questionNumber}: ${e instanceof Error ? e.message : String(e)}. Current URL: ${currentUrl}`);
    return false;
  }
}

// Helper function to calculate similarity between two strings
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  
  let matches = 0;
  const maxLen = Math.max(s1.length, s2.length);
  const minLen = Math.min(s1.length, s2.length);
  
  // Check for exact substring match
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9; // High score for substring match
  }
  
  // Check for word matches
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  
  for (const word1 of words1) {
    if (word1.length < 3) continue; // Skip very short words
    for (const word2 of words2) {
      if (word2.length < 3) continue;
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches += Math.min(word1.length, word2.length);
      }
    }
  }
  
  return minLen > 0 ? matches / maxLen : 0;
}