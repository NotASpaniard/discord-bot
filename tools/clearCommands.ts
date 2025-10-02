import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { getEnv } from '../lib/env.js';

// Clear all slash commands (both global and guild)
(async () => {
  const env = getEnv();
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  
  try {
    console.log('Clearing all slash commands...');
    
    // Clear global commands
    await rest.put(Routes.applicationCommands(env.DISCORD_CLIENT_ID), { body: [] });
    console.log('✅ Cleared all global slash commands.');
    
    // Clear guild commands if GUILD_ID is provided
    if (env.DISCORD_GUILD_ID) {
      await rest.put(
        Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
        { body: [] }
      );
      console.log('✅ Cleared all guild slash commands.');
    }
    
    console.log('🧹 All commands cleared successfully!');
  } catch (error) {
    console.error('❌ Error clearing commands:', error);
  }
})();
