import * as ENV from '../env.json';

// import helpers from "./helpers";
// const { rateLimiter } = helpers;

// 1.5 second cooldown to limit spam
// const COMMAND_COOLDOWN = 1.5 * 1000;

import {
  APIInteraction,
  Client,
  Events,
  GatewayIntentBits,
  Interaction,
  InteractionType,
  REST,
  Routes,
} from 'discord.js';

import TradingCommandHandler from './command-handlers/TradingCommandHandler';
import BotStatusHandler from './command-handlers/BotStatusHandler';
import ErrorReporter from './utils/ErrorReporter';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST().setToken(ENV.token);

// const limitedMessageHandler = rateLimiter(COMMAND_COOLDOWN, MessageRouter);

// Listen for the ready event
client.once(Events.ClientReady, start);

async function start() {
  console.log(`Logged in as ${client.user.tag}!`);
  // Register commands
  // TODO: Clean this up
  const TradingCommands = Object.entries(TradingCommandHandler.commands).map(
    ([name, command]) => ({
      name,
      description: command.description,
    })
  );
  const BotStatusCommands = Object.entries(BotStatusHandler.commands).map(
    ([name, command]) => ({
      name,
      description: command.description,
    })
  );
  const commands = [...TradingCommands, ...BotStatusCommands];
  const data: any = await rest.put(
    Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId),
    { body: commands }
  );
  console.log(
    `Successfully reloaded ${data.length ?? 0} application (/) commands.`
  );

  // Initialize command handlers
  TradingCommandHandler.init(client);
  ErrorReporter.init(client);

  client.on(Events.InteractionCreate, CommandRouter);
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
async function CommandRouter(interaction: Interaction) {
  if (interaction.type !== InteractionType.ApplicationCommand) {
    console.error('Invalid interaction type');
    return;
  }
  const { commandName } = interaction;

  console.log('Received command: ', commandName);

  if (TradingCommandHandler.commands.hasOwnProperty(commandName)) {
    return TradingCommandHandler.onMessage(interaction);
  }
  if (BotStatusHandler.commands.hasOwnProperty(commandName)) {
    return BotStatusHandler.onMessage(interaction);
  }
}

console.log('Logging in...');
client.login(ENV.token);
