import { SlashCommandBuilder } from 'discord.js';
import { CommandListType } from './types';

export function formatSlashCommands(
  commands: CommandListType
): Array<SlashCommandBuilder> {
  // IDEA: Utilize `.addChoices` and `.setMaxValue/.setMinValue` to dynamically restrict input for commands dealing with a users owned stocks
  return Object.entries(commands).map(([name, command]) => {
    const { description, options } = command;
    const slashCommand = new SlashCommandBuilder()
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
              if (option.maxLength) builtOption.setMaxLength(option.maxLength);
              if (option.minLength) builtOption.setMinLength(option.minLength);
              return builtOption;
            });
          }
          case 'number': {
            // todo;
          }
          case 'boolean': {
            // todo;
          }
          case 'integer': {
            // todo;
          }
        }
      });
    }
    return slashCommand;
  });
}
