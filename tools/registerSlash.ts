import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { loadCommands } from '../lib/loader.js';
import { getEnv } from '../lib/env.js';
import { Client } from 'discord.js';

// Registers slash commands globally (use carefully due to caching)
(async () => {
  const env = getEnv();
  const client = new Client({ intents: [] });
  (client as any).commands = new Map();
  (client as any).prefixCommands = new Map();
  await loadCommands(client);

  const slash = Array.from((client as any).commands.values()).map((c: any) => c.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: slash });
  console.log(`Registered ${slash.length} global slash commands.`);
})();


