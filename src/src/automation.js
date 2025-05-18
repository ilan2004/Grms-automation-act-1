"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = main;
var generative_ai_1 = require("@google/generative-ai");
var zod_1 = require("zod");
var utils_js_1 = require("../utils.js");
// Initialize Google Generative AI
var genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");
var model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
// Zod schema for quiz content
var quizSchema = zod_1.z.object({
    questionText: zod_1.z.string(),
    options: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string(),
    })),
});
// Fuzzy matching for options
function findClosestOption(answer, options) {
    var normalizedAnswer = answer.toLowerCase().trim();
    var bestMatch = null;
    var maxSimilarity = 0;
    for (var _i = 0, options_1 = options; _i < options_1.length; _i++) {
        var option = options_1[_i];
        var normalizedOption = option.toLowerCase().trim();
        var matches = 0;
        for (var i = 0; i < Math.min(normalizedAnswer.length, normalizedOption.length); i++) {
            if (normalizedAnswer[i] === normalizedOption[i])
                matches++;
        }
        var similarity = matches / Math.max(normalizedAnswer.length, normalizedOption.length);
        if (similarity > maxSimilarity && similarity > 0.6) {
            maxSimilarity = similarity;
            bestMatch = option;
        }
    }
    return bestMatch;
}
// Get AI answer using Google Generative AI
function getAIAnswer(stagehand, questionText, options) {
    return __awaiter(this, void 0, void 0, function () {
        var prompt_1, result, response, answer, multipleAnswers, matchedOption, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 3, , 4]);
                    prompt_1 = "\n      You are an expert assistant. Given the following question and options, identify the correct answer(s).\n      IMPORTANT: Determine if this is a single-select (one correct answer) or multiple-select (multiple correct answers) question.\n      For single-select, return ONLY the exact text of the correct option.\n      For multiple-select, start with \"MULTIPLE:\" followed by each correct option on a new line.\n\n      Question: ".concat(questionText, "\n      Options:\n      ").concat(options.map(function (opt, index) { return "".concat(index + 1, ". ").concat(opt); }).join("\n"), "\n\n      Correct Answer:\n    ");
                    stagehand.log({
                        category: "grms-automation",
                        message: "Querying Google Generative AI for question: ".concat(questionText.substring(0, 50), "..."),
                    });
                    return [4 /*yield*/, model.generateContent(prompt_1)];
                case 1:
                    result = _a.sent();
                    return [4 /*yield*/, result.response];
                case 2:
                    response = _a.sent();
                    answer = response.text().trim();
                    stagehand.log({
                        category: "grms-automation",
                        message: "AI returned answer: ".concat(answer),
                    });
                    if (answer.startsWith("MULTIPLE:")) {
                        multipleAnswers = answer
                            .replace("MULTIPLE:", "")
                            .split("\n")
                            .map(function (line) { return line.trim(); })
                            .filter(function (line) { return line.length > 0; });
                        stagehand.log({
                            category: "grms-automation",
                            message: "Detected multiple-select question with ".concat(multipleAnswers.length, " answers"),
                        });
                        return [2 /*return*/, {
                                answer: multipleAnswers[0] || "",
                                isMultipleSelect: true,
                                multipleAnswers: multipleAnswers
                            }];
                    }
                    if (options.includes(answer)) {
                        return [2 /*return*/, { answer: answer }];
                    }
                    else {
                        matchedOption = findClosestOption(answer, options);
                        if (matchedOption) {
                            stagehand.log({
                                category: "grms-automation",
                                message: "Mapped AI answer '".concat(answer, "' to option '").concat(matchedOption, "'"),
                            });
                            return [2 /*return*/, { answer: matchedOption }];
                        }
                        stagehand.log({
                            category: "grms-automation",
                            message: "Warning: Could not match AI answer '".concat(answer, "' to any option"),
                        });
                        return [2 /*return*/, { answer: answer }];
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    stagehand.log({
                        category: "grms-automation",
                        message: "Error querying AI: ".concat(error_1 instanceof Error ? error_1.message : String(error_1)),
                    });
                    throw error_1;
                case 4: return [2 /*return*/];
            }
        });
    });
}
function main(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var currentUrl, e_1, e_2, e_3, usernameObservations, e_4, e_5, e_6, passwordObservations, e_7, loginObservations, currentUrlAfterLogin, isOnAssessmentPage, e_8, academicObservations, e_9, assessmentObservations, hasAssessments, e_10, startObservations, e_11, keyObservations, e_12, verifyObservations, e_13, startAssessmentObservations, _loop_1, i, e_14, yesObservations, e_15, okObservations, e_16, backObservations, hasMoreAssessments;
        var page = _b.page, context = _b.context, stagehand = _b.stagehand, username = _b.username, password = _b.password;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // Navigate to GRMS login page
                    stagehand.log({ category: "grms-automation", message: "Navigating to GRMS login page" });
                    return [4 /*yield*/, page.goto("https://grms.gardencity.university/login.htm")];
                case 1:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 2:
                    _c.sent();
                    currentUrl = page.url();
                    stagehand.log({ category: "grms-automation", message: "Current URL: ".concat(currentUrl) });
                    // Enter username
                    stagehand.log({ category: "grms-automation", message: "Entering username" });
                    _c.label = 3;
                case 3:
                    _c.trys.push([3, 6, , 12]);
                    return [4 /*yield*/, page.act("Click on the username or email field")];
                case 4:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 5:
                    _c.sent();
                    return [3 /*break*/, 12];
                case 6:
                    e_1 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not find username field, trying alternative" });
                    _c.label = 7;
                case 7:
                    _c.trys.push([7, 10, , 11]);
                    return [4 /*yield*/, page.act("Click on the input field for email or username")];
                case 8:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 9:
                    _c.sent();
                    return [3 /*break*/, 11];
                case 10:
                    e_2 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Warning: Could not click username field" });
                    return [3 /*break*/, 11];
                case 11: return [3 /*break*/, 12];
                case 12:
                    _c.trys.push([12, 14, , 24]);
                    return [4 /*yield*/, page.act("Type '".concat(username, "' in the username field"))];
                case 13:
                    _c.sent();
                    return [3 /*break*/, 24];
                case 14:
                    e_3 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Error typing username, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the username or email input field")];
                case 15:
                    usernameObservations = _c.sent();
                    if (!(usernameObservations && usernameObservations.length > 0)) return [3 /*break*/, 22];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, usernameObservations)];
                case 16:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 17:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 18:
                    _c.sent();
                    return [4 /*yield*/, page.act(usernameObservations[0])];
                case 19:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 20:
                    _c.sent();
                    return [4 /*yield*/, page.keyboard.type(username, { delay: 50 })];
                case 21:
                    _c.sent();
                    return [3 /*break*/, 23];
                case 22:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find username field" });
                    throw new Error("Could not find username field");
                case 23: return [3 /*break*/, 24];
                case 24: return [4 /*yield*/, page.waitForTimeout(500)];
                case 25:
                    _c.sent();
                    // Enter.Monad
                    stagehand.log({ category: "grms-automation", message: "Entering password" });
                    _c.label = 26;
                case 26:
                    _c.trys.push([26, 29, , 35]);
                    return [4 /*yield*/, page.act("Click on the password field")];
                case 27:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 28:
                    _c.sent();
                    return [3 /*break*/, 35];
                case 29:
                    e_4 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not find password field, trying alternative" });
                    _c.label = 30;
                case 30:
                    _c.trys.push([30, 33, , 34]);
                    return [4 /*yield*/, page.act("Click on the input field for password")];
                case 31:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 32:
                    _c.sent();
                    return [3 /*break*/, 34];
                case 33:
                    e_5 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Warning: Could not click password field" });
                    return [3 /*break*/, 34];
                case 34: return [3 /*break*/, 35];
                case 35:
                    _c.trys.push([35, 37, , 47]);
                    return [4 /*yield*/, page.act("Type '".concat(password, "' in the password field"))];
                case 36:
                    _c.sent();
                    return [3 /*break*/, 47];
                case 37:
                    e_6 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Error typing password, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the password input field")];
                case 38:
                    passwordObservations = _c.sent();
                    if (!(passwordObservations && passwordObservations.length > 0)) return [3 /*break*/, 45];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, passwordObservations)];
                case 39:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 40:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 41:
                    _c.sent();
                    return [4 /*yield*/, page.act(passwordObservations[0])];
                case 42:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 43:
                    _c.sent();
                    return [4 /*yield*/, page.keyboard.type(password, { delay: 50 })];
                case 44:
                    _c.sent();
                    return [3 /*break*/, 46];
                case 45:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find password field" });
                    throw new Error("Could not find password field");
                case 46: return [3 /*break*/, 47];
                case 47: return [4 /*yield*/, page.waitForTimeout(500)];
                case 48:
                    _c.sent();
                    // Click login button
                    stagehand.log({ category: "grms-automation", message: "Clicking login button" });
                    _c.label = 49;
                case 49:
                    _c.trys.push([49, 51, , 59]);
                    return [4 /*yield*/, page.act("Click the login button")];
                case 50:
                    _c.sent();
                    return [3 /*break*/, 59];
                case 51:
                    e_7 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Error clicking login button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the login button")];
                case 52:
                    loginObservations = _c.sent();
                    if (!(loginObservations && loginObservations.length > 0)) return [3 /*break*/, 57];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, loginObservations)];
                case 53:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 54:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 55:
                    _c.sent();
                    return [4 /*yield*/, page.act(loginObservations[0])];
                case 56:
                    _c.sent();
                    return [3 /*break*/, 58];
                case 57:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find login button" });
                    throw new Error("Could not find login button");
                case 58: return [3 /*break*/, 59];
                case 59: return [4 /*yield*/, page.waitForTimeout(2000)];
                case 60:
                    _c.sent();
                    currentUrlAfterLogin = page.url();
                    if (!(currentUrlAfterLogin !== "https://grms.gardencity.university/login.htm")) return [3 /*break*/, 188];
                    stagehand.log({ category: "grms-automation", message: "Login successful! Redirected to: " + currentUrlAfterLogin });
                    return [4 /*yield*/, page.evaluate(function () {
                            var startButtons = Array.from(document.querySelectorAll('button, input[type="button"]'))
                                .filter(function (el) { var _a, _b; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.includes('Start')) || ((_b = el.value) === null || _b === void 0 ? void 0 : _b.includes('Start')); });
                            return startButtons.length > 0;
                        })];
                case 61:
                    isOnAssessmentPage = _c.sent();
                    if (!isOnAssessmentPage) return [3 /*break*/, 62];
                    stagehand.log({
                        category: "grms-automation",
                        message: "Already on assessment list page, skipping navigation"
                    });
                    return [3 /*break*/, 90];
                case 62:
                    // Navigate to academic functions
                    stagehand.log({ category: "grms-automation", message: "On home page, navigating to academic functions" });
                    _c.label = 63;
                case 63:
                    _c.trys.push([63, 66, , 75]);
                    return [4 /*yield*/, page.act("Click on the academic functions menu in the navbar or dashboard")];
                case 64:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 65:
                    _c.sent();
                    return [3 /*break*/, 75];
                case 66:
                    e_8 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click academic functions, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the academic functions menu in the navbar or dashboard")];
                case 67:
                    academicObservations = _c.sent();
                    if (!(academicObservations && academicObservations.length > 0)) return [3 /*break*/, 73];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, academicObservations)];
                case 68:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 69:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 70:
                    _c.sent();
                    return [4 /*yield*/, page.act(academicObservations[0])];
                case 71:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 72:
                    _c.sent();
                    return [3 /*break*/, 74];
                case 73:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find academic functions menu" });
                    throw new Error("Could not find academic functions menu");
                case 74: return [3 /*break*/, 75];
                case 75:
                    // Click online assessment
                    stagehand.log({ category: "grms-automation", message: "Clicking online assessment option" });
                    _c.label = 76;
                case 76:
                    _c.trys.push([76, 79, , 88]);
                    return [4 /*yield*/, page.act("Click on the online assessment option in the dropdown")];
                case 77:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 78:
                    _c.sent();
                    return [3 /*break*/, 88];
                case 79:
                    e_9 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click online assessment, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the online assessment option in the dropdown")];
                case 80:
                    assessmentObservations = _c.sent();
                    if (!(assessmentObservations && assessmentObservations.length > 0)) return [3 /*break*/, 86];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, assessmentObservations)];
                case 81:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 82:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 83:
                    _c.sent();
                    return [4 /*yield*/, page.act(assessmentObservations[0])];
                case 84:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 85:
                    _c.sent();
                    return [3 /*break*/, 87];
                case 86:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find online assessment option" });
                    throw new Error("Could not find online assessment option");
                case 87: return [3 /*break*/, 88];
                case 88: return [4 /*yield*/, page.waitForTimeout(3000)];
                case 89:
                    _c.sent();
                    _c.label = 90;
                case 90:
                    if (!true) return [3 /*break*/, 187];
                    return [4 /*yield*/, page.evaluate(function () {
                            var startButtons = Array.from(document.querySelectorAll('button, input[type="button"]'))
                                .filter(function (el) { var _a, _b; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.includes('Start')) || ((_b = el.value) === null || _b === void 0 ? void 0 : _b.includes('Start')); });
                            return startButtons.length > 0;
                        })];
                case 91:
                    hasAssessments = _c.sent();
                    if (!hasAssessments) {
                        stagehand.log({ category: "grms-automation", message: "No assessments found to start" });
                        return [3 /*break*/, 187];
                    }
                    // Start uncompleted assessment
                    stagehand.log({ category: "grms-automation", message: "Selecting an uncompleted assessment and clicking Start" });
                    _c.label = 92;
                case 92:
                    _c.trys.push([92, 95, , 104]);
                    return [4 /*yield*/, page.act("Click the Start button of an uncompleted online assessment")];
                case 93:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 94:
                    _c.sent();
                    return [3 /*break*/, 104];
                case 95:
                    e_10 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click Start button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the Start button of an uncompleted online assessment at the top")];
                case 96:
                    startObservations = _c.sent();
                    if (!(startObservations && startObservations.length > 0)) return [3 /*break*/, 102];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, startObservations)];
                case 97:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 98:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 99:
                    _c.sent();
                    return [4 /*yield*/, page.act(startObservations[0])];
                case 100:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 101:
                    _c.sent();
                    return [3 /*break*/, 103];
                case 102:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Start button" });
                    throw new Error("Could not find Start button");
                case 103: return [3 /*break*/, 104];
                case 104:
                    // Enter assessment key
                    stagehand.log({ category: "grms-automation", message: "Entering assessment key for verification" });
                    _c.label = 105;
                case 105:
                    _c.trys.push([105, 108, , 118]);
                    return [4 /*yield*/, page.act("Type '1234' in the Student Online Assessment Key Verification input field")];
                case 106:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 107:
                    _c.sent();
                    return [3 /*break*/, 118];
                case 108:
                    e_11 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not type key, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the input field for Student Online Assessment Key Verification")];
                case 109:
                    keyObservations = _c.sent();
                    if (!(keyObservations && keyObservations.length > 0)) return [3 /*break*/, 116];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, keyObservations)];
                case 110:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 111:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 112:
                    _c.sent();
                    return [4 /*yield*/, page.act(keyObservations[0])];
                case 113:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(300)];
                case 114:
                    _c.sent();
                    return [4 /*yield*/, page.keyboard.type("1234", { delay: 50 })];
                case 115:
                    _c.sent();
                    return [3 /*break*/, 117];
                case 116:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find key verification input field" });
                    throw new Error("Could not find key verification input field");
                case 117: return [3 /*break*/, 118];
                case 118:
                    // Click Verify button
                    stagehand.log({ category: "grms-automation", message: "Clicking Verify button" });
                    _c.label = 119;
                case 119:
                    _c.trys.push([119, 122, , 131]);
                    return [4 /*yield*/, page.act("Click the Verify button in the Student Online Assessment Key Verification prompt")];
                case 120:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 121:
                    _c.sent();
                    return [3 /*break*/, 131];
                case 122:
                    e_12 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click Verify button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the Verify button in the Student Online Assessment Key Verification prompt")];
                case 123:
                    verifyObservations = _c.sent();
                    if (!(verifyObservations && verifyObservations.length > 0)) return [3 /*break*/, 129];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, verifyObservations)];
                case 124:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 125:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 126:
                    _c.sent();
                    return [4 /*yield*/, page.act(verifyObservations[0])];
                case 127:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 128:
                    _c.sent();
                    return [3 /*break*/, 130];
                case 129:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Verify button" });
                    throw new Error("Could not find Verify button");
                case 130: return [3 /*break*/, 131];
                case 131:
                    // Click Start Assessment button
                    stagehand.log({ category: "grms-automation", message: "Clicking Start Assessment button" });
                    _c.label = 132;
                case 132:
                    _c.trys.push([132, 135, , 144]);
                    return [4 /*yield*/, page.act("Click the Start Assessment button")];
                case 133:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 134:
                    _c.sent();
                    return [3 /*break*/, 144];
                case 135:
                    e_13 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click Start Assessment button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the Start Assessment button")];
                case 136:
                    startAssessmentObservations = _c.sent();
                    if (!(startAssessmentObservations && startAssessmentObservations.length > 0)) return [3 /*break*/, 142];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, startAssessmentObservations)];
                case 137:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 138:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 139:
                    _c.sent();
                    return [4 /*yield*/, page.act(startAssessmentObservations[0])];
                case 140:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 141:
                    _c.sent();
                    return [3 /*break*/, 143];
                case 142:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Start Assessment button" });
                    throw new Error("Could not find Start Assessment button");
                case 143: return [3 /*break*/, 144];
                case 144:
                    // Answer 10 questions
                    stagehand.log({ category: "grms-automation", message: "Starting to answer 10 questions" });
                    _loop_1 = function (i) {
                        var extractResult, detailedExtract, questionMatch, questionText, options, fullOptions, aiResponse, _loop_2, _i, _d, answerText, answer_1, optionIndex, selectedOption, attempt, actError_1, indexError_1, fallbackError_1, saveError_1, saveNextObservations, e_17;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    stagehand.log({ category: "grms-automation", message: "Processing question ".concat(i) });
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 41, , 42]);
                                    return [4 /*yield*/, page.extract({
                                            instruction: "Extract the current quiz question and all answer options",
                                            schema: quizSchema,
                                        })];
                                case 2:
                                    extractResult = _e.sent();
                                    if (!(!extractResult || !extractResult.questionText || !extractResult.options || extractResult.options.length === 0)) return [3 /*break*/, 4];
                                    return [4 /*yield*/, page.extract({
                                            instruction: "Look for a quiz question (usually starts with 'Question X of Y') and multiple choice options (usually labeled as Option 1, Option 2, etc). Extract the question text and all available options.",
                                            schema: quizSchema,
                                        })];
                                case 3:
                                    detailedExtract = _e.sent();
                                    if (!detailedExtract || !detailedExtract.questionText || !detailedExtract.options || detailedExtract.options.length === 0) {
                                        throw new Error("Failed to extract question content");
                                    }
                                    extractResult = detailedExtract;
                                    _e.label = 4;
                                case 4:
                                    questionMatch = extractResult.questionText.match(/Question \d+ of \d+[:\s]+(.*)/s);
                                    questionText = questionMatch ? questionMatch[1].trim() : extractResult.questionText.trim();
                                    options = extractResult.options.map(function (opt) { return opt.text.replace(/^Option \d+\s*/, "").trim(); });
                                    fullOptions = extractResult.options.map(function (opt) { return opt.text.trim(); });
                                    if (!questionText || options.length === 0) {
                                        throw new Error("Failed to extract valid question text or options");
                                    }
                                    stagehand.log({ category: "grms-automation", message: "Extracted question: ".concat(questionText.substring(0, 50), "... with ").concat(options.length, " options") });
                                    return [4 /*yield*/, Promise.all([
                                            getAIAnswer(stagehand, questionText, options),
                                            page.waitForTimeout(500)
                                        ])];
                                case 5:
                                    aiResponse = (_e.sent())[0];
                                    if (!(aiResponse.isMultipleSelect && aiResponse.multipleAnswers && aiResponse.multipleAnswers.length > 0)) return [3 /*break*/, 10];
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Processing multiple-select question with ".concat(aiResponse.multipleAnswers.length, " answers")
                                    });
                                    _loop_2 = function (answerText) {
                                        var optionIndex, selectedOption, attempt, actError_2;
                                        return __generator(this, function (_f) {
                                            switch (_f.label) {
                                                case 0:
                                                    optionIndex = options.findIndex(function (opt) {
                                                        return opt === answerText ||
                                                            opt.includes(answerText) ||
                                                            answerText.includes(opt);
                                                    });
                                                    if (!(optionIndex >= 0)) return [3 /*break*/, 8];
                                                    selectedOption = fullOptions[optionIndex];
                                                    stagehand.log({
                                                        category: "grms-automation",
                                                        message: "Selecting multiple-select option: '".concat(selectedOption, "'")
                                                    });
                                                    attempt = 1;
                                                    _f.label = 1;
                                                case 1:
                                                    if (!(attempt <= 2)) return [3 /*break*/, 7];
                                                    _f.label = 2;
                                                case 2:
                                                    _f.trys.push([2, 5, , 6]);
                                                    return [4 /*yield*/, page.act("Select the option '".concat(selectedOption, "' for the current question"))];
                                                case 3:
                                                    _f.sent();
                                                    return [4 /*yield*/, page.waitForTimeout(300)];
                                                case 4:
                                                    _f.sent();
                                                    return [3 /*break*/, 7];
                                                case 5:
                                                    actError_2 = _f.sent();
                                                    stagehand.log({
                                                        category: "grms-automation",
                                                        message: "Error during selection attempt ".concat(attempt, ": ").concat(actError_2 instanceof Error ? actError_2.message : String(actError_2))
                                                    });
                                                    if (attempt === 2) {
                                                        stagehand.log({
                                                            category: "grms-automation",
                                                            message: "Warning: Failed to select option '".concat(selectedOption, "' after ").concat(attempt, " attempts")
                                                        });
                                                    }
                                                    return [3 /*break*/, 6];
                                                case 6:
                                                    attempt++;
                                                    return [3 /*break*/, 1];
                                                case 7: return [3 /*break*/, 9];
                                                case 8:
                                                    stagehand.log({
                                                        category: "grms-automation",
                                                        message: "Warning: Could not map answer '".concat(answerText, "' to any option")
                                                    });
                                                    _f.label = 9;
                                                case 9: return [2 /*return*/];
                                            }
                                        });
                                    };
                                    _i = 0, _d = aiResponse.multipleAnswers;
                                    _e.label = 6;
                                case 6:
                                    if (!(_i < _d.length)) return [3 /*break*/, 9];
                                    answerText = _d[_i];
                                    return [5 /*yield**/, _loop_2(answerText)];
                                case 7:
                                    _e.sent();
                                    _e.label = 8;
                                case 8:
                                    _i++;
                                    return [3 /*break*/, 6];
                                case 9: return [3 /*break*/, 28];
                                case 10:
                                    answer_1 = aiResponse.answer;
                                    optionIndex = options.findIndex(function (opt) { return opt === answer_1 || opt.includes(answer_1) || answer_1.includes(opt); });
                                    if (!(optionIndex >= 0)) return [3 /*break*/, 23];
                                    selectedOption = fullOptions[optionIndex];
                                    attempt = 1;
                                    _e.label = 11;
                                case 11:
                                    if (!(attempt <= 2)) return [3 /*break*/, 22];
                                    _e.label = 12;
                                case 12:
                                    _e.trys.push([12, 15, , 21]);
                                    return [4 /*yield*/, page.act("Select the option '".concat(selectedOption, "' for the current question"))];
                                case 13:
                                    _e.sent();
                                    return [4 /*yield*/, page.waitForTimeout(300)];
                                case 14:
                                    _e.sent();
                                    return [3 /*break*/, 22];
                                case 15:
                                    actError_1 = _e.sent();
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Error during selection attempt ".concat(attempt, ": ").concat(actError_1 instanceof Error ? actError_1.message : String(actError_1))
                                    });
                                    if (!(attempt === 2)) return [3 /*break*/, 20];
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Warning: Failed to select option after ".concat(attempt, " attempts")
                                    });
                                    _e.label = 16;
                                case 16:
                                    _e.trys.push([16, 19, , 20]);
                                    return [4 /*yield*/, page.act("Select option ".concat(optionIndex + 1, " for the current question"))];
                                case 17:
                                    _e.sent();
                                    return [4 /*yield*/, page.waitForTimeout(300)];
                                case 18:
                                    _e.sent();
                                    return [3 /*break*/, 20];
                                case 19:
                                    indexError_1 = _e.sent();
                                    throw new Error("Failed to select option: ".concat(indexError_1 instanceof Error ? indexError_1.message : String(indexError_1)));
                                case 20: return [3 /*break*/, 21];
                                case 21:
                                    attempt++;
                                    return [3 /*break*/, 11];
                                case 22: return [3 /*break*/, 28];
                                case 23:
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Warning: Could not map AI answer '".concat(answer_1, "' to any option, trying first option")
                                    });
                                    _e.label = 24;
                                case 24:
                                    _e.trys.push([24, 27, , 28]);
                                    return [4 /*yield*/, page.act("Select the first option for the current question")];
                                case 25:
                                    _e.sent();
                                    return [4 /*yield*/, page.waitForTimeout(300)];
                                case 26:
                                    _e.sent();
                                    return [3 /*break*/, 28];
                                case 27:
                                    fallbackError_1 = _e.sent();
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Warning: Fallback selection failed: ".concat(fallbackError_1 instanceof Error ? fallbackError_1.message : String(fallbackError_1))
                                    });
                                    return [3 /*break*/, 28];
                                case 28:
                                    _e.trys.push([28, 31, , 40]);
                                    return [4 /*yield*/, page.act("Click the Save and Next button")];
                                case 29:
                                    _e.sent();
                                    return [4 /*yield*/, page.waitForTimeout(1000)];
                                case 30:
                                    _e.sent();
                                    return [3 /*break*/, 40];
                                case 31:
                                    saveError_1 = _e.sent();
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Could not click Save and Next button: ".concat(saveError_1 instanceof Error ? saveError_1.message : String(saveError_1))
                                    });
                                    return [4 /*yield*/, page.observe("Identify the Save and Next button")];
                                case 32:
                                    saveNextObservations = _e.sent();
                                    if (!(saveNextObservations && saveNextObservations.length > 0)) return [3 /*break*/, 38];
                                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, saveNextObservations)];
                                case 33:
                                    _e.sent();
                                    return [4 /*yield*/, page.waitForTimeout(500)];
                                case 34:
                                    _e.sent();
                                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                                case 35:
                                    _e.sent();
                                    return [4 /*yield*/, page.act(saveNextObservations[0])];
                                case 36:
                                    _e.sent();
                                    return [4 /*yield*/, page.waitForTimeout(1000)];
                                case 37:
                                    _e.sent();
                                    return [3 /*break*/, 39];
                                case 38:
                                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Save and Next button" });
                                    throw new Error("Could not find Save and Next button");
                                case 39: return [3 /*break*/, 40];
                                case 40: return [3 /*break*/, 42];
                                case 41:
                                    e_17 = _e.sent();
                                    stagehand.log({
                                        category: "grms-automation",
                                        message: "Error processing question ".concat(i, ": ").concat(e_17 instanceof Error ? e_17.message : String(e_17))
                                    });
                                    throw new Error("Failed to process question ".concat(i));
                                case 42: return [2 /*return*/];
                            }
                        });
                    };
                    i = 1;
                    _c.label = 145;
                case 145:
                    if (!(i <= 10)) return [3 /*break*/, 148];
                    return [5 /*yield**/, _loop_1(i)];
                case 146:
                    _c.sent();
                    _c.label = 147;
                case 147:
                    i++;
                    return [3 /*break*/, 145];
                case 148:
                    // Handle end of assessment
                    stagehand.log({ category: "grms-automation", message: "Handling Confirm End Online Assessment prompt" });
                    _c.label = 149;
                case 149:
                    _c.trys.push([149, 152, , 161]);
                    return [4 /*yield*/, page.act("Click the Yes button in the Confirm End Online Assessment prompt")];
                case 150:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 151:
                    _c.sent();
                    return [3 /*break*/, 161];
                case 152:
                    e_14 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click Yes button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the Yes button in the Confirm End Online Assessment prompt")];
                case 153:
                    yesObservations = _c.sent();
                    if (!(yesObservations && yesObservations.length > 0)) return [3 /*break*/, 159];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, yesObservations)];
                case 154:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 155:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 156:
                    _c.sent();
                    return [4 /*yield*/, page.act(yesObservations[0])];
                case 157:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 158:
                    _c.sent();
                    return [3 /*break*/, 160];
                case 159:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Yes button" });
                    throw new Error("Could not find Yes button");
                case 160: return [3 /*break*/, 161];
                case 161:
                    _c.trys.push([161, 164, , 173]);
                    return [4 /*yield*/, page.act("Click the OK button in the Assessment completed successfully message")];
                case 162:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 163:
                    _c.sent();
                    return [3 /*break*/, 173];
                case 164:
                    e_15 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click OK button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the OK button in the Assessment completed successfully message")];
                case 165:
                    okObservations = _c.sent();
                    if (!(okObservations && okObservations.length > 0)) return [3 /*break*/, 171];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, okObservations)];
                case 166:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 167:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 168:
                    _c.sent();
                    return [4 /*yield*/, page.act(okObservations[0])];
                case 169:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 170:
                    _c.sent();
                    return [3 /*break*/, 172];
                case 171:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find OK button" });
                    throw new Error("Could not find OK button");
                case 172: return [3 /*break*/, 173];
                case 173:
                    _c.trys.push([173, 176, , 185]);
                    return [4 /*yield*/, page.act("Click the Back button")];
                case 174:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 175:
                    _c.sent();
                    return [3 /*break*/, 185];
                case 176:
                    e_16 = _c.sent();
                    stagehand.log({ category: "grms-automation", message: "Could not click Back button, trying alternative" });
                    return [4 /*yield*/, page.observe("Identify the Back button")];
                case 177:
                    backObservations = _c.sent();
                    if (!(backObservations && backObservations.length > 0)) return [3 /*break*/, 183];
                    return [4 /*yield*/, (0, utils_js_1.drawObserveOverlay)(page, backObservations)];
                case 178:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(500)];
                case 179:
                    _c.sent();
                    return [4 /*yield*/, (0, utils_js_1.clearOverlays)(page)];
                case 180:
                    _c.sent();
                    return [4 /*yield*/, page.act(backObservations[0])];
                case 181:
                    _c.sent();
                    return [4 /*yield*/, page.waitForTimeout(1500)];
                case 182:
                    _c.sent();
                    return [3 /*break*/, 184];
                case 183:
                    stagehand.log({ category: "grms-automation", message: "ERROR: Could not find Back button" });
                    throw new Error("Could not find Back button");
                case 184: return [3 /*break*/, 185];
                case 185: return [4 /*yield*/, page.evaluate(function () {
                        return Array.from(document.querySelectorAll('button, input[type="button"]'))
                            .some(function (el) { var _a, _b; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.includes('Start')) || ((_b = el.value) === null || _b === void 0 ? void 0 : _b.includes('Start')); });
                    })];
                case 186:
                    hasMoreAssessments = _c.sent();
                    if (!hasMoreAssessments)
                        return [3 /*break*/, 187];
                    return [3 /*break*/, 90];
                case 187: return [3 /*break*/, 189];
                case 188:
                    stagehand.log({ category: "grms-automation", message: "Login failed, still on login page" });
                    throw new Error("Login failed");
                case 189: return [2 /*return*/];
            }
        });
    });
}
