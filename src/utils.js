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
exports.announce = announce;
exports.getEnvVar = getEnvVar;
exports.validateZodSchema = validateZodSchema;
exports.drawObserveOverlay = drawObserveOverlay;
exports.clearOverlays = clearOverlays;
exports.simpleCache = simpleCache;
exports.readCache = readCache;
exports.actWithCache = actWithCache;
var boxen_1 = require("boxen");
var chalk_1 = require("chalk");
var promises_1 = require("fs/promises");
function announce(message, title) {
    console.log((0, boxen_1.default)(message, {
        padding: 1,
        margin: 3,
        title: title || "Stagehand",
    }));
}
/**
 * Get an environment variable and throw an error if it's not found
 * @param name - The name of the environment variable
 * @returns The value of the environment variable
 */
function getEnvVar(name, required) {
    if (required === void 0) { required = true; }
    var value = process.env[name];
    if (!value && required) {
        throw new Error("".concat(name, " not found in environment variables"));
    }
    return value;
}
/**
 * Validate a Zod schema against some data
 * @param schema - The Zod schema to validate against
 * @param data - The data to validate
 * @returns Whether the data is valid against the schema
 */
function validateZodSchema(schema, data) {
    try {
        schema.parse(data);
        return true;
    }
    catch (_a) {
        return false;
    }
}
function drawObserveOverlay(page, results) {
    return __awaiter(this, void 0, void 0, function () {
        var xpathList, validXpaths;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    xpathList = results.map(function (result) { return result.selector; });
                    validXpaths = xpathList.filter(function (xpath) { return xpath !== "xpath="; });
                    return [4 /*yield*/, page.evaluate(function (selectors) {
                            selectors.forEach(function (selector) {
                                var element;
                                if (selector.startsWith("xpath=")) {
                                    var xpath = selector.substring(6);
                                    element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                }
                                else {
                                    element = document.querySelector(selector);
                                }
                                if (element instanceof HTMLElement) {
                                    var overlay = document.createElement("div");
                                    overlay.setAttribute("stagehandObserve", "true");
                                    var rect = element.getBoundingClientRect();
                                    overlay.style.position = "absolute";
                                    overlay.style.left = rect.left + "px";
                                    overlay.style.top = rect.top + "px";
                                    overlay.style.width = rect.width + "px";
                                    overlay.style.height = rect.height + "px";
                                    overlay.style.backgroundColor = "rgba(255, 255, 0, 0.3)";
                                    overlay.style.pointerEvents = "none";
                                    overlay.style.zIndex = "10000";
                                    document.body.appendChild(overlay);
                                }
                            });
                        }, validXpaths)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function clearOverlays(page) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: 
                // remove existing stagehandObserve attributes
                return [4 /*yield*/, page.evaluate(function () {
                        var elements = document.querySelectorAll('[stagehandObserve="true"]');
                        elements.forEach(function (el) {
                            var parent = el.parentNode;
                            while (el.firstChild) {
                                parent === null || parent === void 0 ? void 0 : parent.insertBefore(el.firstChild, el);
                            }
                            parent === null || parent === void 0 ? void 0 : parent.removeChild(el);
                        });
                    })];
                case 1:
                    // remove existing stagehandObserve attributes
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function simpleCache(instruction, actionToCache) {
    return __awaiter(this, void 0, void 0, function () {
        var cache, existingCache, error_1, error_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    cache = {};
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, promises_1.default.readFile("cache.json", "utf-8")];
                case 2:
                    existingCache = _a.sent();
                    cache = JSON.parse(existingCache);
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    return [3 /*break*/, 4];
                case 4:
                    // Add new action to cache
                    cache[instruction] = actionToCache;
                    // Write updated cache to file
                    return [4 /*yield*/, promises_1.default.writeFile("cache.json", JSON.stringify(cache, null, 2))];
                case 5:
                    // Write updated cache to file
                    _a.sent();
                    return [3 /*break*/, 7];
                case 6:
                    error_2 = _a.sent();
                    console.error(chalk_1.default.red("Failed to save to cache:"), error_2);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
function readCache(instruction) {
    return __awaiter(this, void 0, void 0, function () {
        var existingCache, cache, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, promises_1.default.readFile("cache.json", "utf-8")];
                case 1:
                    existingCache = _a.sent();
                    cache = JSON.parse(existingCache);
                    return [2 /*return*/, cache[instruction] || null];
                case 2:
                    error_3 = _a.sent();
                    return [2 /*return*/, null];
                case 3: return [2 /*return*/];
            }
        });
    });
}
/**
 * This function is used to act with a cacheable action.
 * It will first try to get the action from the cache.
 * If not in cache, it will observe the page and cache the result.
 * Then it will execute the action.
 * @param instruction - The instruction to act with.
 */
function actWithCache(page, instruction) {
    return __awaiter(this, void 0, void 0, function () {
        var cachedAction, results, actionToCache;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, readCache(instruction)];
                case 1:
                    cachedAction = _a.sent();
                    if (!cachedAction) return [3 /*break*/, 3];
                    console.log(chalk_1.default.blue("Using cached action for:"), instruction);
                    return [4 /*yield*/, page.act(cachedAction)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
                case 3: return [4 /*yield*/, page.observe(instruction)];
                case 4:
                    results = _a.sent();
                    console.log(chalk_1.default.blue("Got results:"), results);
                    actionToCache = results[0];
                    console.log(chalk_1.default.blue("Taking cacheable action:"), actionToCache);
                    return [4 /*yield*/, simpleCache(instruction, actionToCache)];
                case 5:
                    _a.sent();
                    // OPTIONAL: Draw an overlay over the relevant xpaths
                    return [4 /*yield*/, drawObserveOverlay(page, results)];
                case 6:
                    // OPTIONAL: Draw an overlay over the relevant xpaths
                    _a.sent();
                    return [4 /*yield*/, page.waitForTimeout(1000)];
                case 7:
                    _a.sent(); // Can delete this line, just a pause to see the overlay
                    return [4 /*yield*/, clearOverlays(page)];
                case 8:
                    _a.sent();
                    // Execute the action
                    return [4 /*yield*/, page.act(actionToCache)];
                case 9:
                    // Execute the action
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
