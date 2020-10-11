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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const ErrorReporter_1 = require("./ErrorReporter");
const messages_1 = __importDefault(require("../static/messages"));
const BASE_URL = 'https://cloud.iexapis.com/stable';
let _apiKey;
function init(apiKey) {
    _apiKey = apiKey;
}
exports.init = init;
exports.default = {
    getPrice: (stock) => __awaiter(void 0, void 0, void 0, function* () {
        const composedUrl = `${BASE_URL}/stock/${stock}/quote?token=${_apiKey}`;
        try {
            const result = yield node_fetch_1.default(composedUrl);
            if (result.status === 404) {
                return { error: 404, reason: 'Invalid stock ticker, stock not found.' };
            }
            if (!result || !result.body || !result.ok) {
                throw new Error('Improperly formatted response data for price check');
            }
            const parsedData = yield result.json();
            const { companyName, latestPrice, change, changePercent } = parsedData;
            return {
                companyName,
                price: latestPrice,
                priceChange: change,
                percentChange: changePercent,
            };
        }
        catch (err) {
            ErrorReporter_1.warnChannel(messages_1.default.failedToGetStockPrice);
            ErrorReporter_1.errorReportToCreator('getPrice failed but unrecognized error?', stock, err);
            return { error: 500, reason: 'unknown' };
        }
    }),
};
//# sourceMappingURL=IEXCloudApis.js.map