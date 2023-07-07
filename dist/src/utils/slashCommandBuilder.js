"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSlashCommands = void 0;
const discord_js_1 = require("discord.js");
function formatSlashCommands(commands) {
    return Object.entries(commands).map(([name, command]) => {
        const { description, options } = command;
        const slashCommand = new discord_js_1.SlashCommandBuilder()
            .setName(name)
            .setDescription(description);
        if (options) {
            options.forEach((option) => {
                switch (option.type) {
                    case 'string': {
                        slashCommand.addStringOption((builtOption) => {
                            builtOption
                                .setName(option.name)
                                .setDescription(option.description)
                                .setRequired(option.required);
                            if (option.maxLength)
                                builtOption.setMaxLength(option.maxLength);
                            if (option.minLength)
                                builtOption.setMinLength(option.minLength);
                            return builtOption;
                        });
                    }
                    case 'number': {
                    }
                    case 'boolean': {
                    }
                    case 'integer': {
                    }
                }
            });
        }
        return slashCommand;
    });
}
exports.formatSlashCommands = formatSlashCommands;
//# sourceMappingURL=slashCommandBuilder.js.map