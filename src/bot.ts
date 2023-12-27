import * as ENV from '../env.json';

import {
  ChatInputCommandInteraction,
  Client,
  Events,
  GatewayIntentBits,
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
import SeasonConfigManager from './command-handlers/SeasonConfigManager';

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

  ErrorReporter.init(client);

  console.log('Connecting to database...');
  await DatabaseManager.init();

  console.log('Initializing listeners...');
  BotStatusHandler.initWithGuild(client, guild);
  TradingHandler.init(client);
  UserAccountManager.init(client);
  SeasonConfigManager.init(client);

  client.on(Events.InteractionCreate, CommandRouter);
  console.log('Ready!');
}

export async function registerCommands(): Promise<Array<unknown>> {
  // Register commands
  const TradingCommands = formatSlashCommands(TradingHandler.commands);
  const BotStatusCommands = formatSlashCommands(BotStatusHandler.commands);
  const UserAccountCommands = formatSlashCommands(UserAccountManager.commands);
  const SeasonConfigCommands = formatSlashCommands(
    SeasonConfigManager.commands
  );
  const data: any = await rest.put(
    Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId),
    {
      body: [
        ...TradingCommands,
        ...BotStatusCommands,
        ...UserAccountCommands,
        ...SeasonConfigCommands,
      ],
    }
  );

  return data;
}

async function CommandRouter(interaction: ChatInputCommandInteraction) {
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
  if (SeasonConfigManager.commands.hasOwnProperty(commandName)) {
    return SeasonConfigManager.onMessage(interaction);
  }
}

console.log('Logging in...');
client.login(ENV.token);
