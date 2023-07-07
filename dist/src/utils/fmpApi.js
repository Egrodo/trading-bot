"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuote = void 0;
const env_json_1 = __importDefault(require("../../env.json"));
const BASE_URL = 'https://financialmodelingprep.com/api/v3/quote';
async function getQuote(ticker) {
    const composedUrl = `${BASE_URL}/${ticker}?apikey=${env_json_1.default.fmpKey}`;
    try {
        const result = await fetch(composedUrl);
        if (result.status === 404) {
            throw new Error('Invalid stock ticker, stock not found.');
        }
        if (!result || !result.body || !result.ok) {
            throw new Error('Improperly formatted response data for price check');
        }
        const parsedData = await result.json();
        return parsedData;
    }
    catch (err) {
        console.error(err);
        throw new Error('Error fetching stock price');
    }
}
exports.getQuote = getQuote;
//# sourceMappingURL=fmpApi.js.map