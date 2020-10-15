const messages = {
  signupSuccess: `Congrats, you've signed up for the Bearcat Trading Game and have a starting balance of $10,000.00. Check your PMs for an intro tutorial!`,
  signupFailure: `Failed to sign up user. I'll PM my creator to report this :(`,
  signupAgainSuccess: (balance) =>
    `Congrats, you've signed up for the Bearcat Trading Game and have a starting balance of ${balance}. Check your PMs for an intro tutorial!`,
  noAccount: `You do not have an account with us. Create one with "$signup".`,
  noAccountForUser: (userName) =>
    `${userName} does not have an account with us. They may create one with "$signup".`,
  failedToDelete: `Failed to delete account. I'll PM my creator to report this :(`,
  deleteSuccess: `Successfully deleted your account. If you'd like to recreate it at any point use the "$signup" command.`,
  dupAccount: `You already have an account with us. Use `,
  failedToGetAccount: `Failed to get your account. I'll PM my creator to report this :(`,
  checkBalance: (balance, user?) =>
    `${user ? user : ''} ${user ? 'has' : 'You have'} a balance of ${balance}.`,
  invalidCommandSyntax: (properSyntax) =>
    `Invalid syntax, type your command like this: \n\`${properSyntax}\``,
  notEnoughMoney: (balance) =>
    `Sorry, you don't have enough money in your account for this operation. ${messages.checkBalance(
      balance
    )}`,
  notEnoughMoneyForBuy: (balance, ticker, price, totalAmount) =>
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
