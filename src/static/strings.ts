import { formatAmountToReadable } from "../utils/helpers";

interface StringsType {
  strings: Record<string, string>;
  richStrings: Record<string, (...any) => string>;
}

function getStrings(): StringsType {
  const strings: Record<string, string> = {};
  const richStrings: Record<string, (...any) => string> = {};
  strings.reportedAlready = `I've reported this error, please try again later.`;
  strings.signupFailure = `Failed to sign up user. ${strings.reportedAlready}`;
  strings.signupFailureNoSeason =
    `There is no active season to sign up for. Bug your admins to create one!`;
  strings.noAccount =
    `You haven't registered for this season yet! Do so with "/signup".`;
  strings.dupAccount = `You have already signed up for this season.`;

  strings.invalidStockTicker =
    `Invalid stock ticker or stock not found. Ticker must be 1-5 English letters only.`;
  strings.invalidDateFormat =
    "Invalid date format. Please use a valid date format like YYYY-MM-DD";

  strings.noActiveSeason =
    `There is no active season right now. Bug your admins to create one!`;
  strings.errorBuyingStock = `Failed to buy stock. ${strings.reportedAlready}`;
  strings.errorFetchingPrice =
    `Error fetching price data, might be rate-limited. Try again in a few minutes.`,
    strings.errorAddingSeason =
      `There was an error adding your season. I've reported this error, please try again later.`;

  richStrings.checkBalance = (balance: number, user?: string) =>
    `${user ? user : ""} ${user ? "has" : "You have"} a balance of ${
      formatAmountToReadable(balance)
    }.`;
  richStrings.checkNewBalance = (balance: number, user?: string) =>
    `${user ? user : ""} ${user ? "has" : "You now have"} a balance of ${
      formatAmountToReadable(balance)
    }.`;

  richStrings.notEnoughMoneyForBuy = (
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
  richStrings.seasonAddSuccess = (
    seasonName: string,
    startDate: Date,
    endDate: Date,
  ) =>
    `Successfully added season ${seasonName} from ${startDate.toDateString()} to ${endDate.toDateString()}`;
  richStrings.signupSuccess = (balance: number) =>
    `Congrats, you've signed up for this season and have a starting balance of ${
      formatAmountToReadable(
        balance,
      )
    }. Check out #todo for a list of commands & game information!`;
  richStrings.invalidStartDateFuture = (startDate: Date) =>
    `Your start date must be in the future, you passed in "${startDate.toDateString()}".`;
  richStrings.invalidStartDateEnd = (startDate: Date, endDate: Date) =>
    `Your start date must be before your end date, you passed in "${startDate.toDateString()}" and "${endDate.toDateString()}".`;
  richStrings.seasonOverlap = (
    seasonName: string,
    seasonStart: Date,
    seasonEnd: Date,
  ) =>
    `Your season overlaps with an existing season, ${seasonName} which runs from ${seasonStart.toDateString()} to ${seasonEnd.toDateString()}`;

  return { strings, richStrings };
}

export const strings = getStrings().strings;
export const richStrings = getStrings().richStrings;
