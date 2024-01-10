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
import UserAccountManager from './command-handlers/UserAccountHandler';
import GameAdminManager from './command-handlers/GameAdminHandler';
import ErrorReporter from './utils/ErrorReporter';
import { formatSlashCommands } from './utils/slashCommandBuilder';
import DatabaseManager from './classes/DatabaseManager';
import { startJobs } from './jobs/start';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
});
const rest = new REST().setToken(ENV.token);
let guild = null;

// const limitedMessageHandler = rateLimiter(COMMAND_COOLDOWN, MessageRouter);

// Listen for the ready event
client.once(Events.ClientReady, start);

async function start() {
  ErrorReporter.init(client);

  console.log(`Logged in as ${client.user.tag}!`);

  guild = await client.guilds.fetch(ENV.guildId);
  console.log(`Guild fetched: ${guild.name} (${guild.id})`);

  console.log('Registering commands...');
  const data = await registerCommands();
  console.log(
    `Successfully registered ${data.length ?? 0} application (/) commands.`
  );

  console.log('Connecting to database...');
  await DatabaseManager.init();

  console.log('Initializing listeners...');
  BotStatusHandler.initWithGuild(client, guild);
  TradingHandler.init(client);
  UserAccountManager.init(client);
  await GameAdminManager.init(client);

  client.on(Events.InteractionCreate, CommandRouter);
  const jobs = startJobs(client);
  console.log(`Successfully started ${jobs.length} cron jobs.`);

  console.log('Trading bot successfully started!');
}

export async function registerCommands(): Promise<Array<unknown>> {
  // Register commands
  const TradingCommands = formatSlashCommands(TradingHandler.commands);
  const BotStatusCommands = formatSlashCommands(BotStatusHandler.commands);
  const UserAccountCommands = formatSlashCommands(UserAccountManager.commands);
  const GameAdminCommands = formatSlashCommands(GameAdminManager.commands);
  const data: any = await rest.put(
    Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId),
    {
      body: [
        ...TradingCommands,
        ...BotStatusCommands,
        ...UserAccountCommands,
        ...GameAdminCommands,
      ],
    }
  );

  return data;
}

// IDEA: Track stats on how users interact with the bot; most used commands, stocks, etc, for end of season report
async function CommandRouter(interaction: ChatInputCommandInteraction) {
  if (interaction.type !== InteractionType.ApplicationCommand) {
    console.error('Invalid interaction type');
    return;
  }
  const { commandName } = interaction;

  console.count(`Received ${commandName} command from ${interaction.user.tag}`);

  if (TradingHandler.commands.hasOwnProperty(commandName)) {
    return TradingHandler.onMessage(interaction);
  }
  if (BotStatusHandler.commands.hasOwnProperty(commandName)) {
    return BotStatusHandler.onMessage(interaction);
  }
  if (UserAccountManager.commands.hasOwnProperty(commandName)) {
    return UserAccountManager.onMessage(interaction);
  }
  if (GameAdminManager.commands.hasOwnProperty(commandName)) {
    return GameAdminManager.onMessage(interaction);
  }
}

console.log('Logging in...');
client.login(ENV.token);
