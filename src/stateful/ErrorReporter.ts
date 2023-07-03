// import { Client, TextChannel, MessageEmbed } from 'discord.js';

// import { TRADING_SIM_CHANNEL_ID } from '../bot';

// let client: Client;
// export function init(c: Client) {
//   client = c;
// }

// const CREATOR_ID = '162278177933230081';

// export async function warnChannel(msg: string, silent: boolean = false) {
//   // @ts-expect-error
//   const tradingChannel: TextChannel = await client.channels.fetch(
//     TRADING_SIM_CHANNEL_ID
//   );
//   const message = new MessageEmbed();
//   if (!silent) {
//     message.setColor('#ff0000').setTitle('Trading Bot Error:');
//   }

//   message.setDescription(msg);
//   tradingChannel.send(message);
// }

// // For use in serious errors only, PM me with error info.
// export async function errorReportToCreator(
//   msg: string,
//   ...errorInformation: any
// ) {
//   console.error(msg);
//   console.error(errorInformation);

//   const creator = await client.users.fetch(CREATOR_ID);
//   const message = new MessageEmbed()
//     .setColor('#ff0000')
//     .setTitle('Trading Bot Error Report')
//     .setDescription(msg);

//   creator.send(message);
// }
