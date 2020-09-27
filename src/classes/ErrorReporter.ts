import { User, Message, Client, TextChannel } from 'discord.js';
import { TRADING_SIM_CHANNEL_ID } from '../bot';

let client: Client;
export function init(c: Client) {
  client = c;
}

export async function warnChannel(msg: string, silent: boolean = false) {
  // @ts-expect-error
  const tradingChannel: TextChannel = await client.channels.fetch(TRADING_SIM_CHANNEL_ID);
  let message = '';
  if (!silent) {
    message = 'Trading Bot Error: ';
  }
  message += msg;
  tradingChannel.send(message);
}

export async function errorReportToCreator(msg: string, ...errorInformation) {
  // TODO: Send to me if serious error happens.
  console.error(msg);
  console.error(errorInformation); // Log this somewhere externally?
}
