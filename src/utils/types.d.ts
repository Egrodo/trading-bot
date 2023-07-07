declare type CommandListType = {
  [commandName: string]: {
    description: string;
    allowedChannel: string;
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
