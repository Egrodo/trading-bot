import ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';
import {
  IAggsPreviousClose,
  ITickerDetails,
  restClient,
} from '@polygon.io/client-js';
const BASE_URL = 'https://api.polygon.io/v2';

/**
 * Results description:
 * c: number; The close price for the symbol in the given time period
 * h: number; The highest price for the symbol in the given time period.
 * l: number; The lowest price for the symbol in the given time period.
 * n: number; The number of transactions in the aggregate window.*
 * o: number; The open price for the symbol in the given time period.
 * t: number; The Unix Msec timestamp for the start of the aggregate window.
 * v: number; The trading volume of the symbol in the given time period.
 * vw: number; The volume weighted average price.
 */

class PolygonApi {
  _restClient = restClient(ENV.polygonKey);

  public async getPrevClosePriceData(
    ticker: string
  ): Promise<IAggsPreviousClose> {
    return this._restClient.stocks.previousClose(ticker);
  }

  public async getTickerInfo(ticker: string): Promise<ITickerDetails> {
    return this._restClient.reference.tickerDetails(ticker);
  }
}

export default new PolygonApi();
