"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commands = void 0;
const core_1 = require("@discordjs/core");
exports.commands = [
    {
        name: "ping",
        description: "ERROR",
    },
];
class BotStatusHandler {
    async onMessage(interaction, api) {
        switch (interaction.data.name) {
            case "ping":
            default:
                return this.ping(interaction, api);
        }
    }
    ping(interaction, api) {
        api.interactions.reply(interaction.id, interaction.token, {
            content: "Pong!",
            flags: core_1.MessageFlags.Ephemeral,
        });
    }
}
exports.default = (new BotStatusHandler());
//# sourceMappingURL=BotStatusHandler.js.map