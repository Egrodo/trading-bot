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

import TradingHandler from './command-handlers/TradingHandler';
import BotStatusHandler from './command-handlers/BotStatusHandler';
import ErrorReporter from './utils/ErrorReporter';
import { formatSlashCommands } from './utils/slashCommandBuilder';
import DatabaseManager from './classes/DatabaseManager';
import UserAccountManager from './command-handlers/UserAccountHandler';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const rest = new REST().setToken(ENV.token);
let guild = null;

// const limitedMessageHandler = rateLimiter(COMMAND_COOLDOWN, MessageRouter);

// Listen for the ready event
client.once(Events.ClientReady, start);

async function start() {
  console.log(`Logged in as ${client.user.tag}!`);

  guild = await client.guilds.fetch(ENV.guildId);
  console.log(`Guild fetched: ${guild.name} (${guild.id})`);

  console.log('Registering commands...');
  const data = await registerCommands();
  console.log(
    `Successfully registered ${data.length ?? 0} application (/) commands.`
  );

  console.log('Initializing listeners...');
  BotStatusHandler.initWithGuild(client, guild);
  TradingHandler.init(client);
  ErrorReporter.init(client);
  UserAccountManager.init(client);

  console.log('Connecting to db...');
  DatabaseManager.init();

  client.on(Events.InteractionCreate, CommandRouter);
  console.log('Ready!');
}

export async function registerCommands(): Promise<Array<unknown>> {
  // Register commands
  const TradingCommands = formatSlashCommands(TradingHandler.commands);
  const BotStatusCommands = formatSlashCommands(BotStatusHandler.commands);
  const UserAccountHandler = formatSlashCommands(UserAccountManager.commands);
  const data: any = await rest.put(
    Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId),
    { body: [...TradingCommands, ...BotStatusCommands, ...UserAccountHandler] }
  );

  return data;
}

async function CommandRouter(interaction: Interaction) {
  if (interaction.type !== InteractionType.ApplicationCommand) {
    console.error('Invalid interaction type');
    return;
  }
  const { commandName } = interaction;

  console.count(`Received ${commandName} command`);

  if (TradingHandler.commands.hasOwnProperty(commandName)) {
    return TradingHandler.onMessage(interaction);
  }
  if (BotStatusHandler.commands.hasOwnProperty(commandName)) {
    return BotStatusHandler.onMessage(interaction);
  }
  if (UserAccountManager.commands.hasOwnProperty(commandName)) {
    return UserAccountManager.onMessage(interaction);
  }
}

console.log('Logging in...');
client.login(ENV.token);
