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
import { formatSlashCommands } from './utils/slashCommandBuilder';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST().setToken(ENV.token);

// const limitedMessageHandler = rateLimiter(COMMAND_COOLDOWN, MessageRouter);

// Listen for the ready event
client.once(Events.ClientReady, start);

async function start() {
  console.log(`Logged in as ${client.user.tag}!`);

  // Register commands
  const TradingCommands = formatSlashCommands(TradingCommandHandler.commands);
  const BotStatusCommands = formatSlashCommands(BotStatusHandler.commands);
  const data: any = await rest.put(
    Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId),
    { body: [...TradingCommands, ...BotStatusCommands] }
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
