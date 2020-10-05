import { Client, User, Message } from 'discord.js';

const SERVER_ID = '482608530105434112';

// User specific debounce function
function RateLimiter(delay: number, fn: Function): (msg: Message) => void {
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
      }, delay),
    );
  };
}

function isCommand(msgContent: string, commandType: string): boolean {
  const message = msgContent.trim();
  if (message.charAt(0) === '!') {
    const commandSubStr = message.split(/\s+/)[0];
    return commandSubStr.substring(1, message.length).trim().toLowerCase() === commandType;
  }
}

function formatAmountToReadable(balance: number): string {
  if (balance < 0) {
    return `-$${Math.abs(balance / 100).toLocaleString()}`;
  }
  return `$${(balance / 100).toLocaleString()}`;
}

function getUserFromMention(client: Client, mention: string): Promise<User> {
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
}

async function isUserAdminOrMod(client: Client, user: User): Promise<boolean> {
  const guild = await client.guilds.fetch(SERVER_ID);
  const member = await guild.members.fetch(user);
  return member.hasPermission('ADMINISTRATOR');
}

export { RateLimiter, isCommand, formatAmountToReadable, isUserAdminOrMod, getUserFromMention };
