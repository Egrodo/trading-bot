"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
exports.commands = [
    {
        name: 'ping',
        description: 'ERROR',
    },
];
class BotStatusHandler {
    async onMessage(interaction) {
        switch (interaction.commandName) {
            case 'ping':
            default:
                return this.ping(interaction);
        }
    }
    ping(interaction) {
        interaction.reply({ content: 'pong', ephemeral: true });
    }
}
exports.default = new BotStatusHandler();
//# sourceMappingURL=BotStatusHandler.js.map