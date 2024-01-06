import { PastTrade, TradeType } from '../types';
import { formatAmountToReadable } from '../utils/helpers';
/* eslint quotes: ["error", "backtick"] */

interface StringsType {
  strings: Record<string, string>;
  richStrings: Record<string, (...any) => string>;
}

function getStrings(): StringsType {
  const strings: Record<string, string> = {};
  const richStrings: Record<string, (...any) => string> = {};
  strings.reportedAlready = `I've reported this error, please try again later.`;
  strings.signupFailure = `Failed to sign up user. ${strings.reportedAlready}`;
  strings.signupFailureNoSeason = `There is no active season to sign up for. Bug your admins to create one!`;
  strings.noAccount = `You haven't registered for this season yet! Do so with "/signup".`;
  strings.dupAccount = `You have already signed up for this season.`;

  strings.invalidStockTicker = `Invalid stock ticker or stock not found. Ticker must be 1-5 English letters only.`;
  strings.invalidDateFormat =
    'Invalid date format. Please use a valid date format like YYYY-MM-DD';

  strings.noActiveSeason = `There is no active season right now. Bug your admins to create one!`;
  strings.duplicateSeasonName = `There is already a season with that name.`;
  strings.errorBuyingStock = `Failed to buy stock. ${strings.reportedAlready}`;
  strings.errorSellingStock = `Failed to sell stock. ${strings.reportedAlready}`;
  strings.errorFetchingPrice = `Error fetching price data, might be rate-limited. Try again in a few minutes.`;
  strings.errorCalculatingLeaderboard = `Error calculating leaderboard data. ${strings.reportedAlready}`;
  strings.errorAddingSeason = `There was an error adding your season. I've reported this error, please try again later.`;
  strings.invalidStartingBalance = `Starting balance must be an integer no smaller than 1 and no bigger than 100,000,000.`;
  strings.noPermission = `You don't have permission do that`;
  strings.noTraderRole = `Only verified users are allowed to trade at this time`;

  strings.dailyLeaderboardTitle = 'Daily Leaderboard';
  strings.noLeaderboardData =
    'No leaderboard data found, likely no registered users';
  strings.tradeSummaryTotalSpend = 'Total Spend';
  strings.tradeSummaryCostBasis = 'Cost basis';
  strings.tradeSummaryLowestCost = 'Lowest cost';
  strings.tradeSummaryHighestCost = 'Highest cost';
  strings.tradeSummaryFirstTrade = 'First trade';
  strings.tradeSummaryLastTrade = 'Last trade';
  strings.penniesBanned =
    "Stocks with values less than $0.01 aren't supported at this time";
  strings.noAssetOwned = "You don't own this asset";
  strings.portfolioOverflow = 'You own more stocks than can be shown here';
  strings.cash = 'Cash';
  strings.portfolioNoStocks = `You don't have any stocks in your portfolio! Buy some with /buy`;

  richStrings.checkBalance = (balance: number, user?: string) =>
    `${user ? user : ''} ${
      user ? 'has' : 'You have'
    } a balance of ${formatAmountToReadable(balance)}.`;
  richStrings.checkNewBalance = (balance: number, user?: string) =>
    `${user ? user : ''} ${
      user ? 'has' : 'You now have'
    } a balance of ${formatAmountToReadable(balance)}.`;

  richStrings.notEnoughMoneyForBuy = (
    userBalance: number,
    quantity: number,
    ticker: string,
    totalCost: number
  ) =>
    `You don't have enough money to buy ${quantity} shares of ${ticker}. You have ${formatAmountToReadable(
      userBalance
    )} but need ${formatAmountToReadable(totalCost)}.`;
  richStrings.seasonAddSuccess = (
    seasonName: string,
    startDate: Date,
    endDate: Date
  ) =>
    `Successfully added season ${seasonName} from ${startDate.toDateString()} to ${endDate.toDateString()}. Recommend posting an announcement in the channel.`;
  richStrings.signupSuccess = (balance: number) =>
    `Congrats, you've signed up for this season and have a starting balance of ${formatAmountToReadable(
      balance
    )}. Check out #todo for a list of commands & game information!`;
  richStrings.buySuccess = (
    quantity: number,
    ticker: string,
    stockPrice: number,
    totalCost: number
  ) =>
    `Succesfully purchased ${quantity} shares of ${ticker} at ${formatAmountToReadable(
      stockPrice
    )} per share for a total of ${formatAmountToReadable(totalCost)}`;
  richStrings.invalidStartDateFuture = (startDate: Date) =>
    `Your start date must be in the future, you passed in "${startDate.toDateString()}".`;
  richStrings.invalidStartDateEnd = (startDate: Date, endDate: Date) =>
    `Your start date must be before your end date, you passed in "${startDate.toDateString()}" and "${endDate.toDateString()}".`;
  richStrings.seasonOverlap = (
    seasonName: string,
    seasonStart: Date,
    seasonEnd: Date
  ) =>
    `Your season overlaps with an existing season, ${seasonName} which runs from ${seasonStart.toDateString()} to ${seasonEnd.toDateString()}`;
  richStrings.dontOwnStock = (ticker: string) =>
    `You don't own any shares of ${ticker}.`;
  richStrings.notEnoughStock = (ticker: string, quantity: number) =>
    `You don't have enough shares of ${ticker} to sell ${quantity}.`;
  richStrings.tooSoonToSell = (ticker) =>
    `You can't sell ${ticker} yet since you bought it within the last 24 hours. This is to prevent price arbitrage.`;
  richStrings.seasonNameMismatch = (name: string, activeName: string) =>
    `The season you're trying to end, ${name}, doesn't match the active season, ${activeName}.`;
  richStrings.leaderboardDescription = (n: number) =>
    `Top ${n} traders this season, by current account value. As of ${new Date().toLocaleDateString(
      'en-US',
      { timeZone: 'EST' }
    )}`;

  richStrings.portfolioShares = (quantity: number, unitPrice: number) =>
    `${quantity} ${
      quantity === 1 ? 'share' : 'shares'
    } currently valued at ${formatAmountToReadable(
      unitPrice
    )} each, worth ${formatAmountToReadable(quantity * unitPrice)}`;
  richStrings.wrongChannel = (channelId: string) =>
    `This command is only available in <#${channelId}>`;

  richStrings.userPlacementMedal = (username: string, place: number) => {
    const placeMedals = ['🥇', '🥈', '🥉'];
    const placeMedal = place < 3 ? `${placeMedals[place]}` : `${place}:`;
    return `${placeMedal} ${username}`;
  };

  richStrings.tradeSummaryTitle = (ticker: string) =>
    `Your trade summary for ${ticker}`;
  richStrings.tradeSummaryDesc = (tradeCount: number) =>
    `You've traded this stock ${tradeCount} ${
      tradeCount === 1 ? 'time' : 'times'
    } in total`;
  richStrings.tradeSummaryTimeStr = (type: TradeType, trade: PastTrade) =>
    `${type === TradeType.BUY ? 'Bought' : 'Sold'} ${
      trade.quantity
    } for ${formatAmountToReadable(trade.price)} on ${new Date(
      trade.timestamp
    ).toLocaleDateString()}`;
  richStrings.portfolioTitle = (username: string) => `${username}'s Portfolio`;
  richStrings.portfolioDesc = (seasonName: string) =>
    `Your current holdings for ${seasonName} are as follows`;
  richStrings.portfolioOverflow = (n: number) => `And ${n} more...`;
  richStrings.portfolioTotalValue = (totalValue: number) =>
    `Total value: ${formatAmountToReadable(totalValue)}`;

  return { strings, richStrings };
}

export const strings = getStrings().strings;
export const richStrings = getStrings().richStrings;
