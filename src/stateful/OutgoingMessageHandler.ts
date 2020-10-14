import { TextChannel, Client, MessageEmbed } from 'discord.js';
import { TRADING_SIM_CHANNEL_ID } from '../bot';

let client: Client;
export function init(c: Client) {
  client = c;
}

export async function sendToTrading(...msgs: (string | MessageEmbed)[]) {
  // @ts-expect-error
  const tradingChannel: TextChannel = await client.channels.fetch(
    TRADING_SIM_CHANNEL_ID
  );

  msgs.forEach((msg) => tradingChannel.send(msg));
}

export default { sendToTrading };
