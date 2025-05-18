"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.startAutomation = startAutomation;
var stagehand_1 = require("@browserbasehq/stagehand");
var stagehand_config_js_1 = require("../stagehand.config.js");
var chalk_1 = require("chalk");
var boxen_1 = require("boxen");
var automation_js_1 = require("./automation.js");
// Declare stagehand as a global variable
var stagehand;
function runAutomation(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var page, context, error_1, errorMessage;
        var username = _b.username, password = _b.password, apiKey = _b.apiKey;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    // Set the Google Generative AI API key
                    process.env.GOOGLE_GENERATIVE_AI_API_KEY = apiKey;
                    // Initialize Stagehand
                    stagehand = new stagehand_1.Stagehand(__assign({}, stagehand_config_js_1.default));
                    return [4 /*yield*/, stagehand.init()];
                case 1:
                    _c.sent();
                    // Log Browserbase session URL if applicable
                    if (stagehand_config_js_1.default.env === "BROWSERBASE" && stagehand.browserbaseSessionID) {
                        console.log((0, boxen_1.default)("View this session live in your browser: \n".concat(chalk_1.default.blue("https://browserbase.com/sessions/".concat(stagehand.browserbaseSessionID))), { title: "Browserbase", padding: 1, margin: 3 }));
                    }
                    page = stagehand.page;
                    context = stagehand.context;
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 4, 5, 7]);
                    // Call main automation function with dynamic credentials
                    return [4 /*yield*/, (0, automation_js_1.main)({ page: page, context: context, stagehand: stagehand, username: username, password: password })];
                case 3:
                    // Call main automation function with dynamic credentials
                    _c.sent();
                    console.log("\n\uD83E\uDD18 GRMS login automation completed! Reach out on Slack if you have any feedback: ".concat(chalk_1.default.blue("https://stagehand.dev/slack"), "\n"));
                    return [2 /*return*/, { status: "success", message: "Automation completed successfully" }];
                case 4:
                    error_1 = _c.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : String(error_1);
                    stagehand.log({
                        category: "grms-automation",
                        message: "Automation failed: ".concat(errorMessage),
                    });
                    throw new Error(errorMessage);
                case 5: return [4 /*yield*/, stagehand.close()];
                case 6:
                    _c.sent();
                    return [7 /*endfinally*/];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// Export startAutomation function for server
function startAutomation(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var result, error_2, errorMessage;
        var username = _b.username, password = _b.password, apiKey = _b.apiKey;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, runAutomation({ username: username, password: password, apiKey: apiKey })];
                case 1:
                    result = _c.sent();
                    return [2 /*return*/, result];
                case 2:
                    error_2 = _c.sent();
                    errorMessage = error_2 instanceof Error ? error_2.message : "Unknown error";
                    return [2 /*return*/, { status: "error", message: errorMessage }];
                case 3: return [2 /*return*/];
            }
        });
    });
}
