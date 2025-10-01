import { Client, Collection, REST, Routes, SlashCommandBuilder } from 'discord.js';
import { readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { getEnv } from './env.js';

export async function loadCommands(client: Client): Promise<void> {
  // Thư mục chứa các module lệnh (mỗi file có thể export prefix/slash hoặc mảng slashes/prefixes)
  const commandsDir = path.join(process.cwd(), 'src', 'modules');
  const env = getEnv();

  const slashJSON: any[] = [];

  // Nạp các file trực tiếp trong thư mục modules
  for (const file of safeReadDir(commandsDir)) {
    const full = path.join(commandsDir, file);
    try {
      if (statSync(full).isDirectory()) continue;
    } catch {
      continue;
    }
    if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
    const imported = await import(pathToFileUrl(full));
    if (imported.slash) {
      const data: SlashCommandBuilder = imported.slash.data as SlashCommandBuilder;
      (client as any).commands.set(data.name, imported.slash);
      slashJSON.push(data.toJSON());
    }
    if (imported.prefix) {
      (client as any).prefixCommands.set(imported.prefix.name, imported.prefix);
    }
    if (Array.isArray(imported.slashes)) {
      for (const sc of imported.slashes) {
        const data: SlashCommandBuilder = sc.data as SlashCommandBuilder;
        (client as any).commands.set(data.name, sc);
        slashJSON.push(data.toJSON());
      }
    }
    if (Array.isArray(imported.prefixes)) {
      for (const pc of imported.prefixes) {
        (client as any).prefixCommands.set(pc.name, pc);
      }
    }
  }

  // Nạp các file trong các thư mục con (nhóm tính năng)
  for (const modName of safeReadDir(commandsDir)) {
    const modPath = path.join(commandsDir, modName);
    try {
      if (!statSync(modPath).isDirectory()) continue;
    } catch {
      continue;
    }
    for (const file of safeReadDir(modPath)) {
      if (!file.endsWith('.ts') && !file.endsWith('.js')) continue;
      const full = path.join(modPath, file);
      const imported = await import(pathToFileUrl(full));

      // Xuất đơn
      if (imported.slash) {
        const data: SlashCommandBuilder = imported.slash.data as SlashCommandBuilder;
        (client as any).commands.set(data.name, imported.slash);
        slashJSON.push(data.toJSON());
      }
      if (imported.prefix) {
        (client as any).prefixCommands.set(imported.prefix.name, imported.prefix);
      }

      // Xuất mảng
      if (Array.isArray(imported.slashes)) {
        for (const sc of imported.slashes) {
          const data: SlashCommandBuilder = sc.data as SlashCommandBuilder;
          (client as any).commands.set(data.name, sc);
          slashJSON.push(data.toJSON());
        }
      }
      if (Array.isArray(imported.prefixes)) {
        for (const pc of imported.prefixes) {
          (client as any).prefixCommands.set(pc.name, pc);
        }
      }
    }
  }

  // Đăng ký slash khi khởi động trong guild để cập nhật nhanh; muốn global dùng tool `npm run register`
  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);
  if (env.DISCORD_GUILD_ID) {
    // Đăng ký slash lệnh vào guild để cập nhật nhanh
    await rest.put(
      Routes.applicationGuildCommands(env.DISCORD_CLIENT_ID, env.DISCORD_GUILD_ID),
      { body: slashJSON }
    );
    console.log(`Registered ${slashJSON.length} guild slash commands.`);
  } else {
    console.log('Skipping guild slash registration (no DISCORD_GUILD_ID).');
  }
}

function safeReadDir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}

function pathToFileUrl(p: string): string {
  const resolved = path.resolve(p);
  const url = new URL('file://' + resolved.replace(/\\/g, '/'));
  return url.href;
}


