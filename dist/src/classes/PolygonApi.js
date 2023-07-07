"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_json_1 = __importDefault(require("../../env.json"));
const ErrorReporter_1 = __importDefault(require("../utils/ErrorReporter"));
const BASE_URL = 'https://api.polygon.io/v2';
class PolygonApi {
    async getPrevClosePriceData(ticker) {
        const reqType = 'aggs/ticker';
        const composedUrl = `${BASE_URL}/${reqType}/${ticker}/prev?adjusted=true&apiKey=${env_json_1.default.polygonKey}`;
        try {
            const res = await fetch(composedUrl);
            const data = await res.json();
            return data;
        }
        catch (err) {
            ErrorReporter_1.default.reportErrorInDebugChannel('Request to Polygon API failed', err);
        }
    }
}
exports.default = new PolygonApi();
//# sourceMappingURL=PolygonApi.js.map