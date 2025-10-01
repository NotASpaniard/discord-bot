import { ChatInputCommandInteraction, Message, SlashCommandBuilder, SlashCommandOptionsOnlyBuilder } from 'discord.js';

export interface SlashCommand {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface PrefixCommand {
  name: string; // used after prefix, e.g., "lv cash"
  description: string;
  aliases?: string[];
  execute: (message: Message, args: string[]) => Promise<void>;
}


