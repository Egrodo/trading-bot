"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ENV = __importStar(require("../env.json"));
const discord_js_1 = require("discord.js");
const TradingCommandHandler_1 = __importDefault(require("./command-handlers/TradingCommandHandler"));
const BotStatusHandler_1 = __importDefault(require("./command-handlers/BotStatusHandler"));
const ErrorReporter_1 = __importDefault(require("./utils/ErrorReporter"));
const slashCommandBuilder_1 = require("./utils/slashCommandBuilder");
const client = new discord_js_1.Client({ intents: [discord_js_1.GatewayIntentBits.Guilds] });
const rest = new discord_js_1.REST().setToken(ENV.token);
client.once(discord_js_1.Events.ClientReady, start);
async function start() {
    console.log(`Logged in as ${client.user.tag}!`);
    const TradingCommands = (0, slashCommandBuilder_1.formatSlashCommands)(TradingCommandHandler_1.default.commands);
    const BotStatusCommands = (0, slashCommandBuilder_1.formatSlashCommands)(BotStatusHandler_1.default.commands);
    const data = await rest.put(discord_js_1.Routes.applicationGuildCommands(ENV.applicationId, ENV.guildId), { body: [...TradingCommands, ...BotStatusCommands] });
    console.log(`Successfully reloaded ${data.length ?? 0} application (/) commands.`);
    TradingCommandHandler_1.default.init(client);
    ErrorReporter_1.default.init(client);
    client.on(discord_js_1.Events.InteractionCreate, CommandRouter);
}
async function CommandRouter(interaction) {
    if (interaction.type !== discord_js_1.InteractionType.ApplicationCommand) {
        console.error('Invalid interaction type');
        return;
    }
    const { commandName } = interaction;
    console.log('Received command: ', commandName);
    if (TradingCommandHandler_1.default.commands.hasOwnProperty(commandName)) {
        return TradingCommandHandler_1.default.onMessage(interaction);
    }
    if (BotStatusHandler_1.default.commands.hasOwnProperty(commandName)) {
        return BotStatusHandler_1.default.onMessage(interaction);
    }
}
console.log('Logging in...');
client.login(ENV.token);
//# sourceMappingURL=bot.js.map