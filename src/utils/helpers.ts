// import { Client, Message, PermissionsBitField, User } from "discord.js";

// const SERVER_ID = "482608530105434112";
import fsPromise from 'fs/promises';
import ErrorReporter from './ErrorReporter';

export function Guard() {
  return function (
    target: any,
    methodName: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    descriptor.value = function (...args: any[]) {
      if (this._client != null) {
        return originalMethod.apply(this, args);
      } else {
        throw new Error(
          `Cannot use ${target.constructor.name} until it has been init'd with client`
        );
      }
    };
    return descriptor;
  };
}

export function getNextStockMarketOpeningTimestamp(): number {
  const now = new Date();
  const nextOpening = new Date(now);

  // Set the opening time to 9:30 AM Eastern Time (ET)
  nextOpening.setHours(9);
  nextOpening.setMinutes(30);
  nextOpening.setSeconds(0);
  nextOpening.setMilliseconds(0);

  // If the market is already open, move to the next trading day
  if (nextOpening.getTime() - now.getTime() <= 0) {
    nextOpening.setDate(nextOpening.getDate() + 1);
  }

  // Move to the next Monday if the current day is a weekend
  while (nextOpening.getDay() === 0 || nextOpening.getDay() === 6) {
    nextOpening.setDate(nextOpening.getDate() + 1);
  }

  // Set the opening time to 9:30 AM Eastern Time (ET) for the next trading day
  nextOpening.setHours(9);
  nextOpening.setMinutes(30);
  nextOpening.setSeconds(0);
  nextOpening.setMilliseconds(0);

  // Get the Unix timestamp in seconds
  const unixTimestamp = Math.floor(nextOpening.getTime() / 1000);
  return unixTimestamp;
}

export function formatAmountToReadable(balance: number): string {
  if (balance < 0) {
    return `-$${Number(balance.toFixed(2)).toLocaleString()}`;
  }
  return `$${Number(balance.toFixed(2)).toLocaleString()}`;
}

// export default {
//   // User specific debouncer. NOTE: Potential memory leak here if runs too long without clearing userMap.
//   rateLimiter: (delay: number, fn: Function): (msg: Message) => void => {
//     const userMap = new Map();

//     return (msg: Message): void => {
//       // Don't rate limit myself.
//       if (msg.author.bot) {
//         return;
//       }

//       if (userMap.has(msg.author.id)) {
//         clearTimeout(userMap.get(msg.author.id));
//       }

//       userMap.set(
//         msg.author.id,
//         setTimeout(() => {
//           fn(msg);
//           userMap.delete(msg.author.id);
//         }, delay),
//       );
//     };
//   },

//   isCommand: (msgContent: string, ...commandTypes: string[]): boolean => {
//     const message = msgContent.trim();
//     if (message.charAt(0) === "$") {
//       const commandSubStr = message.split(/\s+/)[0];
//       const command = commandSubStr
//         .substring(1, message.length)
//         .trim()
//         .toLowerCase();
//       return commandTypes.includes(command);
//     }
//   },

//   // Expects amount to be in cents.
//   formatAmountToReadable: (balance: number): string => {
//     if (balance < 0) {
//       return `-$${Math.abs(balance / 100).toLocaleString()}`;
//     }
//     const dollarified = Math.round((balance / 100 + Number.EPSILON) * 100) /
//       100;
//     //
//     return `$${dollarified.toLocaleString()}`;
//   },

//   getUserFromMention: (client: Client, mention: string): Promise<User> => {
//     if (!mention) return;

//     if (mention.startsWith("<@") && mention.endsWith(">")) {
//       mention = mention.slice(2, -1);

//       if (mention.startsWith("!")) {
//         mention = mention.slice(1);
//       }

//       return client.users.fetch(mention);

//       // Allow the user to use mention commands with a direct userid rather than @'ing them.
//     } else if (!isNaN(Number(mention))) {
//       return client.users.fetch(mention);
//     }

//     return null;
//   },

//   isUserAdminOrMod: async (client: Client, user: User): Promise<boolean> => {
//     const guild = await client.guilds.fetch(SERVER_ID);
//     const member = await guild.members.fetch(user);
//     return member.permissions.has(PermissionsBitField.Flags.Administrator);
//   },

// composeHelpCommand: (): MessageEmbed => {
//   const message = new MessageEmbed();
//   const commands: { name: string; value: string }[] = [
//     {
//       name: '$signup',
//       value:
//         'Use this to create a new account if you do not already have one',
//     },
//     {
//       name: '$deleteAccount',
//       value:
//         "Deletes your account. Careful though, you'll lose all your stocks and your balance won't change if you recreate your account in the future.",
//     },
//     {
//       name: '$getCashBalance \\|| $balance |\\| $checkBalance',
//       value: 'Retrieves the current cash balance in your account',
//     },
//     {
//       name: '$help',
//       value: 'Shows this menu!',
//     },
//     {
//       name: '$priceCheck TICKER || $p TICKER',
//       value:
//         'Checks the real-time price of a stock by ticker. Example: "$priceCheck TSLA" or "$p $FB".',
//     },
//   ];
//   message
//     .setTitle('Bearcat Trading Game Commands')
//     .setDescription(
//       'Use these to interact with the Trading Bot and manage your portfolio'
//     )
//     .setColor('#823CD6')
//     .addFields({ name: '\u200B', value: '\u200B' }, ...commands, {
//       name: '\u200B',
//       value: '\u200B',
//     })
//     .setFooter(
//       'Anything missing or out of place? Message my creator, @egrodo#5991'
//     );

//   return message;
// },

// composePriceCheckMessage: (
//   ticker: string,
//   price: number,
//   companyName: string,
//   priceChange: number,
//   percentChange: number
// ): MessageEmbed => {
//   const message = new MessageEmbed();

//   if (priceChange < 0) {
//     message.setColor('#ff0033');
//   } else if (priceChange > 0) {
//     message.setColor('#00ce00');
//   } else message.setColor('#823CD6');

//   if (companyName) message.addField('Company:', companyName);
//   if (!companyName && ticker) message.addField('Company:', ticker);
//   if (price) message.addField('Price:', `$${price}`);
//   if (priceChange) message.addField('Price Change Today:', `$${priceChange}`);
//   if (percentChange)
//     message.addField('Percent Change Today:', `${percentChange * 100}%`);

//   return message;
// },

// Parses the second argument of message content to be a stock ticker
//   parseTickerFromMsg: (msgContent: string): string => {
//     const tickerArr = msgContent.split(" ");
//     if (tickerArr.length < 2) return "";
//     let ticker = tickerArr[1];
//     if (ticker[0] === "$") ticker = ticker.substring(1, ticker.length);
//     if (!ticker.match(/[A-z]/i)) return "";

//     return ticker.toUpperCase();
//   },
// };
