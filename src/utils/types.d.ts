import { CommandInteraction } from 'discord.js';

declare type CommandListType = {
  [commandName: string]: {
    description: string;
    allowedChannel: string;
    handler: (interaction: CommandInteraction) => Promise<void>;
    options?: {
      name: string;
      description: string;
      type: 'string' | 'number' | 'boolean' | 'integer';
      required: boolean;
      maxLength?: number; // Enforced for `string` types
      minLength?: number; // Enforced for `string` types
    }[];
  };
};
