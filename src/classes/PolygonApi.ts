import ENV from '../../env.json';
import ErrorReporter from '../utils/ErrorReporter';

const BASE_URL = 'https://api.polygon.io/v2';

interface PreviousCloseResponse {
  ticker: string;
  adjusted: boolean;
  queryCount: number;
  request_id: string;
  resultsCount: number;
  status: string;
  results: {
    c: number; // The close price for the symbol in the given time period
    h: number; // The highest price for the symbol in the given time period.
    l: number; //The lowest price for the symbol in the given time period.
    n: number; // The number of transactions in the aggregate window.
    o: number; // The open price for the symbol in the given time period.
    t: number; // The Unix Msec timestamp for the start of the aggregate window.
    v: number; // The trading volume of the symbol in the given time period.
    vw: number; // The volume weighted average price.
  };
}

class PolygonApi {
  public async getPrevClosePriceData(
    ticker: string
  ): Promise<PreviousCloseResponse> {
    const reqType = 'aggs/ticker';
    const composedUrl = `${BASE_URL}/${reqType}/${ticker}/prev?adjusted=true&apiKey=${ENV.polygonKey}`;
    try {
      const res = await fetch(composedUrl);
      const data: PreviousCloseResponse = await res.json();
      return data;
    } catch (err) {
      ErrorReporter.reportErrorInDebugChannel(
        'Request to Polygon API failed',
        err
      );
    }
  }
}

export default new PolygonApi();
