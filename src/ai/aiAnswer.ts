import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
import { log } from "../utils/logging";
import { getEnvVar } from "../utils/env";

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(getEnvVar("GOOGLE_GENERATIVE_AI_API_KEY")!);
const model: GenerativeModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export interface AIAnswerResponse {
  answer: string;
  confidence?: number;
}

/**
 * Finds the closest matching option to the AI's answer
 */
function findClosestOption(answer: string, options: string[]): string | null {
  const normalizedAnswer = answer.toLowerCase().trim();
  let bestMatch: string | null = null;
  let maxSimilarity = 0;
  
  // First try exact matches or contains
  for (const option of options) {
    const normalizedOption = option.toLowerCase().trim();
    
    // Check for exact match
    if (normalizedAnswer === normalizedOption) {
      return option;
    }
    
    // Check if option contains the answer or answer contains the option
    if (normalizedOption.includes(normalizedAnswer) || normalizedAnswer.includes(normalizedOption)) {
      const similarity = Math.min(normalizedAnswer.length, normalizedOption.length) / 
                         Math.max(normalizedAnswer.length, normalizedOption.length);
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity;
        bestMatch = option;
      }
    }
  }
  
  // If no good match found, try word-by-word comparison
  if (!bestMatch || maxSimilarity < 0.7) {
    for (const option of options) {
      const normalizedOption = option.toLowerCase().trim();
      
      // Split into words and count matching words
      const answerWords = normalizedAnswer.split(/\s+/);
      const optionWords = normalizedOption.split(/\s+/);
      
      let matchingWords = 0;
      for (const word of answerWords) {
        if (word.length < 3) continue; // Skip very short words
        if (optionWords.some(w => w.includes(word) || word.includes(w))) {
          matchingWords++;
        }
      }
      
      const similarity = matchingWords / Math.max(answerWords.length, optionWords.length);
      if (similarity > maxSimilarity && similarity > 0.5) {
        maxSimilarity = similarity;
        bestMatch = option;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Gets an answer from the AI model for a given question and options
 */
export async function getAIAnswer(questionText: string, options: string[]): Promise<AIAnswerResponse> {
  try {
    // Handle empty or invalid inputs
    if (!questionText || !options.length) {
      log(`Warning: Invalid input for AI answer. Question: "${questionText}", Options count: ${options.length}`);
      return { answer: options[0] || "" };
    }

    // Clean options (remove "Option X:" prefixes if present)
    const cleanOptions = options.map(opt => 
      opt.replace(/^(Option|Answer)\s*[A-Za-z0-9]+\s*[:\.]\s*/i, "").trim()
    );
    
    const prompt = `
      You are an expert assistant. Given the following multiple-choice question and options, identify the correct answer. 
      
      Return **only** the exact text of the correct option as it appears in the options list. Do not include any prefixes, 
      explanations, or modifications to the option text. Be precise.
      
      Question: ${questionText}
      
      Options:
      ${cleanOptions.map((opt, index) => `${index + 1}. ${opt}`).join("\n")}
      
      Correct Answer:
    `;
    
    log(`Querying AI for question: "${questionText.substring(0, 50)}..."`);
    const result = await model.generateContent(prompt);
    const response = await result.response;
    let answer = response.text().trim();
    log(`AI returned answer: "${answer}"`);
    
    // Process the AI's answer
    
    // First check if the answer is a direct match with any option
    const directMatch = cleanOptions.find(opt => 
      opt.toLowerCase() === answer.toLowerCase() || 
      answer.toLowerCase().includes(opt.toLowerCase())
    );
    
    if (directMatch) {
      log(`Direct match found: "${directMatch}"`);
      return { answer: directMatch, confidence: 0.9 };
    }
    
    // Next try to find the closest match
    const matchedOption = findClosestOption(answer, cleanOptions);
    if (matchedOption) {
      log(`Mapped AI answer '${answer}' to option '${matchedOption}'`);
      return { answer: matchedOption, confidence: 0.7 };
    }
    
    // If we can't match, try to see if the answer is a simple option number or letter
    const numMatch = answer.match(/^\s*(\d+)\s*$/);
    if (numMatch && cleanOptions[parseInt(numMatch[1]) - 1]) {
      const indexedOption = cleanOptions[parseInt(numMatch[1]) - 1];
      log(`Using indexed option ${numMatch[1]}: "${indexedOption}"`);
      return { answer: indexedOption, confidence: 0.6 };
    }
    
    const letterMatch = answer.match(/^\s*([A-Za-z])\s*$/i);
    if (letterMatch) {
      const index = letterMatch[1].toUpperCase().charCodeAt(0) - 65; // Convert A->0, B->1, etc.
      if (cleanOptions[index]) {
        const letterOption = cleanOptions[index];
        log(`Using letter option ${letterMatch[1]}: "${letterOption}"`);
        return { answer: letterOption, confidence: 0.6 };
      }
    }
    
    // Last resort: return the first option
    log(`Warning: Could not match AI answer to any option. Defaulting to first option`);
    return { answer: cleanOptions[0], confidence: 0.3 };
    
  } catch (error) {
    log(`Error querying AI: ${error instanceof Error ? error.message : String(error)}`);
    // Fallback to first option if available
    return { answer: options[0] || "", confidence: 0 };
  }
}