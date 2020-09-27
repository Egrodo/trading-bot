const messages = {
  signupSuccess: `Congrats, you've signed up for the Bearcat Trading Game and have a starting balance of $10,000.00. Check your PMs for an intro tutorial!`,
  signupFailure: `Failed to sign up user. I'll PM my creator to report this :(`,
  signupAgainSuccess: (balance) =>
    `Congrats, you've signed up for the Bearcat Trading Game and have a starting balance of ${balance}. Check your PMs for an intro tutorial!`,
  noAccount: `You do not have an account with us. Create one with "!signup".`,
  failedToDelete: `Failed to delete account. I'll PM my creator to report this :(`,
  deleteSuccess: `Successfully deleted your account. If you'd like to recreate it at any point use the "!signup" command.`,
  dupAccount: `You already have an account with us. Use `,
  failedToGetAccount: `Failed to get your account. I'll PM my creator to report this :(`,
  checkBalance: (balance) => `You have a balance of ${balance}.`,
};

export default { ...messages };
