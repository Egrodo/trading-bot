import * as ENV from "../env.json";

// import helpers from "./helpers";
// const { rateLimiter } = helpers;

// 1.5 second cooldown to limit spam
// const COMMAND_COOLDOWN = 1.5 * 1000;
export const TRADING_SIM_CHANNEL_ID = "759562306417328148";

import {
  APIInteraction,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  InteractionType,
  REST,
  Routes,
} from "discord.js";

import TradingCommandHandler, {
  commands as TradingCommands,
} from "./command-handlers/TradingCommandHandler";
import BotStatusHandler, {
  commands as BotStatusCommands,
} from "./command-handlers/BotStatusHandler";
import ErrorReporter from "./utils/ErrorReporter";
import { WithIntrinsicProps } from "@discordjs/core";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST().setToken(ENV.token);
const commands = [...TradingCommands, ...BotStatusCommands];

// const limitedMessageHandler = rateLimiter(COMMAND_COOLDOWN, MessageRouter);

// Listen for the ready event
client.once(Events.ClientReady, start);

async function start() {
  console.log(`Logged in as ${client.user.tag}!`);
  // Register commands
  const data: any = await rest.put(
    Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId),
    { body: commands },
  );
  console.log(
    `Successfully reloaded ${data.length ?? 0} application (/) commands.`,
  );

  // Initialize command handlers
  TradingCommandHandler.init(client);
  ErrorReporter.init(client);

  client.on(
    Events.InteractionCreate,
    CommandRouter,
  );
  // client.on("message", limitedMessageHandler);
  // ErrorReporterInit(client);
  // OutgoingMessageHandlerInit(client);
  // IEXCloudApisInit(AUTH.iexKey);
}

// if (
//   interaction.type !== InteractionType.ApplicationCommand ||
//   interaction.data.name !== "ping"
// ) {
// await api.interactions.reply(interaction.id, interaction.token, {
//   content: "Pong!",
//   flags: MessageFlags.Ephemeral,
// });
/**
 * So maybe we have different CommandSources that export lists of commands that they handle
 * that way we can cleanly separate concerns for account management vs trading requests etc
 */
async function CommandRouter(
  interaction: Interaction,
) {
  if (interaction.type !== InteractionType.ApplicationCommand) {
    console.error("Invalid interaction type");
    return;
  }
  const { commandName } = interaction;

  console.log("Received command: ", commandName);

  // if (TradingCommands.some((c) => c.name === commandName)) {
  //   return TradingCommandHandler.onMessage(interaction, api);
  // }

  if (BotStatusCommands.some((c) => c.name === commandName)) {
    ErrorReporter.reportToCreator("pinged");
    // return BotStatusHandler.onMessage(interaction, api);
  }

  // const commandHandlers = [TradingCommandHandler];
  // for (const handler of commandHandlers) {
  //   if (handler.commandList.has(commandName)) {
  //     return handler.onMessage(interaction, api);
  //   }
  // }
}

// // Handles the direction of messages into their respective handler class
// function MessageRouter(msg) {
//   if (msg?.channel?.id === TRADING_SIM_CHANNEL_ID) {
//     console.log("Trading message handler");
//     new TradingMessageHandler(client).onMessage(msg);
//   }
// }

console.log("Logging in...");
client.login(ENV.token);

// client.on("error", (err) => {
//   console.error("Failed to log in: ", err);
// });
