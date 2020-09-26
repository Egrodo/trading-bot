import * as Discord from 'discord.js';

import TradingMessageHandler from './classes/TradingMessageHandler';
import * as AUTH from '../auth.json';

import { RateLimiter } from './helpers';

// 1.5 second cooldown to limit spam
const COMMAND_COOLDOWN = 1.5 * 1000;
const TRADING_SIM_CHANNEL_ID = '759562306417328148';

const client = new Discord.Client();

function init() {
  const limitedMessageHandler = RateLimiter(COMMAND_COOLDOWN, MessageHandler);
  client.on('message', limitedMessageHandler);
}

// Handles the direction of messages into their respective handler class
function MessageHandler(msg: Discord.Message) {
  if (msg?.channel?.id === TRADING_SIM_CHANNEL_ID) {
    new TradingMessageHandler().onMessage(msg);
  }
}

console.log('Logging in...');
client.login(AUTH.token);
client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  init();
});

client.on('error', (err) => {
  console.error('Failed to log in: ', err);
});
