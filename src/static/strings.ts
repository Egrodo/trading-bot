import { formatAmountToReadable } from "../utils/helpers";

interface StringsType {
  strings: Record<string, string>;
  richStrings: Record<string, (...any) => string>;
}

function getStrings(): StringsType {
  const _strings: Record<string, string> = {};
  const _richStrings: Record<string, (...any) => string> = {};
  _strings.reportedAlready =
    `I've reported this error, please try again later.`;
  _strings.signupFailure =
    `Failed to sign up user. ${_strings.reportedAlready}`;
  _strings.signupFailureNoSeason =
    `There is no active season to sign up for. Bug your admins to create one!`;
  _strings.noAccount =
    `You haven't registered for this season yet! Do so with "/signup".`;
  _strings.dupAccount = `You have already signed up for this season.`;

  _strings.invalidStockTicker =
    `Invalid stock ticker or stock not found. Ticker must be 1-5 English letters only.`;
  _strings.invalidDateFormat =
    "Invalid date format. Please use a valid date format like YYYY-MM-DD";

  _strings.noActiveSeason =
    `There is no active season right now. Bug your admins to create one!`;
  _strings.errorBuyingStock =
    `Failed to buy stock. ${_strings.reportedAlready}`;
  _strings.errorFetchingPrice =
    `Error fetching price data, might be rate-limited. Try again in a few minutes.`,
    _strings.errorAddingSeason =
      `There was an error adding your season. I've reported this error, please try again later.`;

  _richStrings.checkBalance = (balance: number, user?: string) =>
    `${user ? user : ""} ${user ? "has" : "You have"} a balance of ${
      formatAmountToReadable(balance)
    }.`;
  _richStrings.checkNewBalance = (balance: number, user?: string) =>
    `${user ? user : ""} ${user ? "has" : "You now have"} a balance of ${
      formatAmountToReadable(balance)
    }.`;

  _richStrings.notEnoughMoneyForBuy = (
    userBalance: number,
    quantity: number,
    ticker: string,
    totalCost: number,
  ) =>
    `You don't have enough money to buy ${quantity} shares of ${ticker}. You have ${
      formatAmountToReadable(
        userBalance,
      )
    } but need ${formatAmountToReadable(totalCost)}.`;
  _richStrings.seasonAddSuccess = (
    seasonName: string,
    startDate: Date,
    endDate: Date,
  ) =>
    `Successfully added season ${seasonName} from ${startDate.toDateString()} to ${endDate.toDateString()}`;
  _richStrings.signupSuccess = (balance: number) =>
    `Congrats, you've signed up for this season and have a starting balance of ${
      formatAmountToReadable(
        balance,
      )
    }. Check out #todo for a list of commands & game information!`;
  _richStrings.invalidStartDateFuture = (startDate: Date) =>
    `Your start date must be in the future, you passed in "${startDate.toDateString()}".`;
  _richStrings.invalidStartDateEnd = (startDate: Date, endDate: Date) =>
    `Your start date must be before your end date, you passed in "${startDate.toDateString()}" and "${endDate.toDateString()}".`;
  _richStrings.seasonOverlap = (
    seasonName: string,
    seasonStart: Date,
    seasonEnd: Date,
  ) =>
    `Your season overlaps with an existing season, ${seasonName} which runs from ${seasonStart.toDateString()} to ${seasonEnd.toDateString()}`;

  return { strings: _strings, richStrings: _richStrings };
}

export const strings = getStrings().strings;
export const richStrings = getStrings().richStrings;
