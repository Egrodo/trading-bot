import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from 'discord.js';
import {
  CommandListType,
  CommandWithOptionsType,
  SubcommandWithOptionsType,
} from './types';

function formatSlashCommandOptions(
  slashCommand: SlashCommandSubcommandBuilder | SlashCommandBuilder,
  command: CommandWithOptionsType | SubcommandWithOptionsType
) {
  command.options.forEach((option) => {
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

export function formatSlashCommands(
  commands: CommandListType
): Array<SlashCommandBuilder> {
  // IDEA: Utilize `.addChoices` and `.setMaxValue/.setMinValue` to dynamically restrict input for commands dealing with a users owned stocks
  return Object.entries(commands).map(([name, command]) => {
    const { description } = command;

    if (description.length > 100) {
      throw new Error(
        `Slash command description for ${name} exceeds 100 character limit`
      );
    }

    const slashCommand = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description);
    if ('options' in command) {
      formatSlashCommandOptions(slashCommand, command);
    }

    if ('subCommands' in command) {
      Object.entries(command.subCommands).forEach(
        ([subCommandName, subCommand]) => {
          const { description } = subCommand;
          slashCommand.addSubcommand((subCommandBuilder) => {
            subCommandBuilder
              .setName(subCommandName)
              .setDescription(description);

            if ('options' in subCommand) {
              formatSlashCommandOptions(subCommandBuilder, subCommand);
            }
            return subCommandBuilder;
          });
        }
      );
    }

    return slashCommand;
  });
}
