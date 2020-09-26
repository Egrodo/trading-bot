import { Message } from 'discord.js';

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

export { RateLimiter };
