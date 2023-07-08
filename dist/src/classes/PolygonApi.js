"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_json_1 = __importDefault(require("../../env.json"));
const client_js_1 = require("@polygon.io/client-js");
const BASE_URL = 'https://api.polygon.io/v2';
class PolygonApi {
    constructor() {
        this._restClient = (0, client_js_1.restClient)(env_json_1.default.polygonKey);
    }
    async getPrevClosePriceData(ticker) {
        return this._restClient.stocks.previousClose(ticker);
    }
    async getTickerInfo(ticker) {
        return this._restClient.reference.tickerDetails(ticker);
    }
}
exports.default = new PolygonApi();
//# sourceMappingURL=PolygonApi.js.map