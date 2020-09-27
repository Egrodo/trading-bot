const messages = {
  signupSuccess: `Congrats, you've signed up for the Bearcat Trading Game and have a starting balance of $10,000.00. Check your PMs for an intro tutorial!`,
  signupFailure: `Failed to sign up user. I'll PM my creator to report this :(`,
  signupAgainSuccess: (balance) =>
    `Congrats, you've signed up for the Bearcat Trading Game and have a starting balance of ${balance}. Check your PMs for an intro tutorial!`,
};

export default { ...messages };
