"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_json_1 = __importDefault(require("../../env.json"));
class BotStatusHandler {
    constructor() {
        this.commands = {
            ping: {
                description: 'Check if the bot is alive',
                allowedChannel: env_json_1.default.debugInfoChannelId,
            },
        };
    }
    async onMessage(interaction) {
        switch (interaction.commandName) {
            case 'ping':
            default:
                return this.ping(interaction);
        }
    }
    ping(interaction) {
        const { commandName } = interaction;
        if (!this.commands[commandName].allowedChannel.includes(interaction.channelId)) {
            interaction.reply({
                content: `This command is only available in <#${this.commands[commandName].allowedChannel.toString()}>`,
                ephemeral: true,
            });
            return;
        }
        interaction.reply({ content: 'pong', ephemeral: true });
    }
}
exports.default = new BotStatusHandler();
//# sourceMappingURL=BotStatusHandler.js.map