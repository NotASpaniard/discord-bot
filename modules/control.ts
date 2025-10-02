import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import type { SlashCommand } from '../types/command.js';

// Lệnh tắt bot (chỉ admin)
export const slashTurnOff: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('turnoff')
    .setDescription('Tắt bot (chỉ admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔴 Tắt Bot')
      .setDescription('Bot đang được tắt...')
      .setColor('#FF0000')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    // Đợi 2 giây rồi tắt bot
    setTimeout(() => {
      console.log('Bot được tắt bởi lệnh /turnoff');
      process.exit(0);
    }, 2000);
  }
};

// Lệnh khởi động lại bot (chỉ admin)
export const slashReset: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('reset')
    .setDescription('Khởi động lại bot (chỉ admin)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔄 Khởi động lại Bot')
      .setDescription('Bot đang được khởi động lại...')
      .setColor('#FFA500')
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed] });
    
    // Đợi 2 giây rồi khởi động lại
    setTimeout(() => {
      console.log('Bot được khởi động lại bởi lệnh /reset');
      process.exit(1); // Exit code 1 để có thể restart bằng process manager
    }, 2000);
  }
};

// Lệnh kiểm tra trạng thái bot
export const slashStatus: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Kiểm tra trạng thái bot'),
  async execute(interaction) {
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    
    const embed = new EmbedBuilder()
      .setTitle('🟢 Trạng thái Bot')
      .setDescription('Bot đang hoạt động bình thường')
      .setColor('#00FF00')
      .addFields(
        { name: '⏱️ Thời gian hoạt động', value: `${hours}h ${minutes}m ${seconds}s`, inline: true },
        { name: '💾 Bộ nhớ sử dụng', value: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`, inline: true },
        { name: '🔧 Node.js Version', value: process.version, inline: true }
      )
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

export const slashes: SlashCommand[] = [slashTurnOff, slashReset, slashStatus];
