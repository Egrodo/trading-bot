import { Client, User, Message, MessageEmbed } from 'discord.js';

const SERVER_ID = '482608530105434112';

export default {
  // User specific debouncer. NOTE: Potential memory leak here if runs too long without clearing userMap.
  rateLimiter: (delay: number, fn: Function): ((msg: Message) => void) => {
    const userMap = new Map();

    return (msg: Message): void => {
      // Don't rate limit myself.
      if (msg.author.bot) {
        return;
      }

      if (userMap.has(msg.author.id)) {
        clearTimeout(userMap.get(msg.author.id));
      }

      userMap.set(
        msg.author.id,
        setTimeout(() => {
          fn(msg);
          userMap.delete(msg.author.id);
        }, delay)
      );
    };
  },

  isCommand: (msgContent: string, ...commandTypes: string[]): boolean => {
    const message = msgContent.trim();
    if (message.charAt(0) === '$') {
      const commandSubStr = message.split(/\s+/)[0];
      const command = commandSubStr
        .substring(1, message.length)
        .trim()
        .toLowerCase();
      return commandTypes.includes(command);
    }
  },

  formatAmountToReadable: (balance: number): string => {
    if (balance < 0) {
      return `-$${Math.abs(balance / 100).toLocaleString()}`;
    }
    return `$${(balance / 100).toLocaleString()}`;
  },

  getUserFromMention: (client: Client, mention: string): Promise<User> => {
    if (!mention) return;

    if (mention.startsWith('<@') && mention.endsWith('>')) {
      mention = mention.slice(2, -1);

      if (mention.startsWith('!')) {
        mention = mention.slice(1);
      }

      return client.users.fetch(mention);

      // Allow the user to use mention commands with a direct userid rather than @'ing them.
    } else if (!isNaN(Number(mention))) {
      return client.users.fetch(mention);
    }

    return null;
  },

  isUserAdminOrMod: async (client: Client, user: User): Promise<boolean> => {
    const guild = await client.guilds.fetch(SERVER_ID);
    const member = await guild.members.fetch(user);
    return member.hasPermission('ADMINISTRATOR');
  },

  composeHelpCommand: (): MessageEmbed => {
    const message = new MessageEmbed();
    const commands: { name: string; value: string }[] = [
      {
        name: '$signup',
        value:
          'Use this to create a new account if you do not already have one',
      },
      {
        name: '$deleteAccount',
        value:
          "Deletes your account. Careful though, you'll lose all your stocks and your balance won't change if you recreate your account in the future.",
      },
      {
        name: '$getCashBalance \\|| $balance |\\| $checkBalance',
        value: 'Retrieves the current cash balance in your account',
      },
      {
        name: '$help',
        value: 'Shows this menu!',
      },
      {
        name: '$priceCheck TICKER || $p TICKER',
        value:
          'Checks the real-time price of a stock by ticker. Example: "$priceCheck TSLA" or "$p $FB".',
      },
    ];
    message
      .setTitle('Bearcat Trading Game Commands')
      .setDescription(
        'Use these to interact with the Trading Bot and manage your portfolio'
      )
      .setColor('#823CD6')
      .addFields({ name: '\u200B', value: '\u200B' }, ...commands, {
        name: '\u200B',
        value: '\u200B',
      })
      .setFooter(
        'Anything missing or out of place? Message my creator, @egrodo#5991'
      );

    return message;
  },

  composePriceCheckMessage: (
    ticker: string,
    price: number,
    companyName: string,
    priceChange: number,
    percentChange: number
  ): MessageEmbed => {
    const message = new MessageEmbed();

    if (priceChange < 0) {
      message.setColor('#ff0033');
    } else if (priceChange > 0) {
      message.setColor('#00ce00');
    } else message.setColor('#823CD6');

    if (companyName) message.addField('Company:', companyName);
    if (!companyName && ticker) message.addField('Company:', ticker);
    if (price) message.addField('Price:', `$${price}`);
    if (priceChange) message.addField('Price Change Today:', `$${priceChange}`);
    if (percentChange)
      message.addField('Percent Change Today:', `${percentChange * 100}%`);

    return message;
  },

  // Parses the second argument of message content to be a stock ticker
  parseTickerFromMsg: (msgContent: string): string => {
    const tickerArr = msgContent.split(' ');
    if (tickerArr.length < 2) return '';
    let ticker = tickerArr[1];
    if (ticker[0] === '$') ticker = ticker.substring(1, ticker.length);
    if (!ticker.match(/[A-z]/i)) return '';

    return ticker;
  },
};
