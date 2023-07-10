import { formatAmountToReadable } from '../utils/helpers';

const messages = {
  signupFailure: `Failed to sign up user. I'll PM my creator to report this :(`,
  signupSuccess: (balance: number) =>
    `Congrats, you've signed up for this season and have a starting balance of ${formatAmountToReadable(
      balance
    )}. Check out #todo for a list of commands & game information!`,
  noAccount: `You haven't registered yet! Do so with "/signup".`,
  noAccountForUser: (userName) =>
    `${userName} does not have an account with us. They may create one with "$signup".`,
  failedToDelete: `Failed to delete account. I'll PM my creator to report this :(`,
  deleteSuccess: `Successfully deleted your account. If you'd like to recreate it at any point use the "$signup" command.`,
  dupAccount: `You have already signed up.`,
  failedToGetAccount: `Failed to get your account. I'll PM my creator to report this :(`,
  checkBalance: (balance: number, user?) =>
    `${user ? user : ''} ${
      user ? 'has' : 'You have'
    } a balance of ${formatAmountToReadable(balance)}.`,
  invalidCommandSyntax: (properSyntax) =>
    `Invalid syntax, type your command like this: \n\`${properSyntax}\``,
  notEnoughMoney: (balance: number) =>
    `Sorry, you don't have enough money in your account for this operation. ${messages.checkBalance(
      balance
    )}`,
  notEnoughMoneyForBuy: (balance: number, ticker, price, totalAmount) =>
    `${messages.notEnoughMoney(
      balance
    )} ${ticker} is at ${price}, so you would need ${totalAmount} to do this.`,
  moneyGranted: (user, amount, balance) =>
    `Congrats ${user}, you've been granted ${amount}. ${messages.checkBalance(
      balance
    )}`,
  noPermission: `You do not have permission to complete that operation.`,
  invalidStockTicker: `Invalid stock ticker, stock not found.`,
  failedToGetStockPrice: `Failed to get stock price. I'll PM my creator to report this :(`,
  successfulPurchaseOrder: (ticker, price, buyAmount, totalAmount, balance) =>
    `Purchase order for ${ticker} completed for ${buyAmount} at ${price} / share. You now own ${totalAmount} stocks of ${ticker} and have a remaining balance of ${balance}`,
};

export default { ...messages };
