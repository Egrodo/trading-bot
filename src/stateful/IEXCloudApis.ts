// import Fetch from 'node-fetch';
// import { errorReportToCreator, warnChannel } from './ErrorReporter';
// import Messages from '../static/messages';

// const BASE_URL = 'https://cloud.iexapis.com/stable';

// let _apiKey: string;

// interface StockQuote {
//   symbol: string;
//   companyName: string;
//   primaryExchange: string;
//   high: number;
//   latestPrice: number;
//   low: number;
//   open: number;
//   close: number;
//   iexRealtimePrice: number;
//   change: number;
//   changePercent: number;
//   week52High: number;
//   week52Low: number;
//   marketCap: number;
//   volume: number;
//   peRatio: number;
//   avgTotalVolume: number;
// }

// export interface GetPriceReturnType {
//   companyName: string;
//   price: number;
//   priceChange: number;
//   percentChange: number;
// }

// export interface ErrorType {
//   error: number;
//   reason: string;
// }

// export function init(apiKey: string): void {
//   _apiKey = apiKey;
// }

// export default {
//   getPrice: async (stock: string): Promise<GetPriceReturnType | ErrorType> => {
//     const composedUrl = `${BASE_URL}/stock/${stock}/quote?token=${_apiKey}`;
//     try {
//       const result = await Fetch(composedUrl);
//       if (result.status === 404) {
//         return { error: 404, reason: 'Invalid stock ticker, stock not found.' };
//       }
//       if (!result || !result.body || !result.ok) {
//         throw new Error('Improperly formatted response data for price check');
//       }

//       // Check for iexRealtimePrice which will be defined if market is open.
//       // otherwise return price at close.
//       const parsedData: StockQuote = await result.json();
//       const { companyName, latestPrice, change, changePercent } = parsedData;

//       return {
//         companyName,
//         price: latestPrice,
//         priceChange: change,
//         percentChange: changePercent,
//       };
//     } catch (err) {
//       warnChannel(Messages.failedToGetStockPrice);
//       errorReportToCreator(
//         'getPrice failed but unrecognized error? See console',
//         stock,
//         err
//       );
//       return { error: 500, reason: 'unknown' };
//     }
//   },
// };

// // https://cloud.iexapis.com/stable/tops?token=YOUR_TOKEN_HERE&symbols=aapl
