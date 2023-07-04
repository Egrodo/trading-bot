"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const env_json_1 = __importDefault(require("../../env.json"));
class TradingCommandHandler {
    constructor() {
        this.commands = {
            price: {
                description: 'Check the price of a stock',
                allowedChannel: env_json_1.default.tradingChannelId,
            },
        };
    }
    init(client) {
        if (!client)
            throw new Error('Client is undefined');
        this._client = client;
    }
    async onMessage(interaction) {
        const { commandName } = interaction;
        if (!this.commands[commandName].allowedChannel.includes(interaction.channelId)) {
            interaction.reply({
                content: `This command is only available in <#${this.commands[commandName].allowedChannel.toString()}>`,
                ephemeral: true,
            });
            return;
        }
        interaction.reply('Work in progress!');
    }
}
exports.default = new TradingCommandHandler();
//# sourceMappingURL=TradingCommandHandler.js.map