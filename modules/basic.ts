import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, SlashCommandBuilder, time } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';
import { getEnv } from '../lib/env.js';

// ===================== BASIC CMDS =====================
// Slash: /help
export const slash: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Kiểm tra thông tin, cách dùng các lệnh basic và camping'),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('🔥 Hướng dẫn sử dụng bot Lửa Việt')
      .setDescription('Danh sách các lệnh và chức năng của bot')
      .setColor('#FF8C00')
      .addFields(
        { 
          name: '⚙️ Prefix Commands', 
          value: `Sử dụng prefix: \`${getEnv().PREFIX}\``,
          inline: false
        },
        { 
          name: '💰 Lệnh cơ bản (Basic)', 
          value: [
            '• `lv daily` - Nhận thưởng hàng ngày',
            '• `lv cash` - Kiểm tra số dư tài khoản',
            '• `lv info` - Xem thông tin cá nhân',
            '• `lv give <@user> <số tiền>` - Chuyển tiền cho người khác',
            '• `lv bxh` - Xem bảng xếp hạng giàu có',
            '• `lv quest` - Xem và làm nhiệm vụ hàng ngày'
          ].join('\n'),
          inline: false
        },
        { 
          name: '🏕️ Lệnh cắm trại (Camping)', 
          value: [
            '• `lv pickup` - Thu thập gỗ từ môi trường',
            '• `lv inv` - Xem kho đồ cá nhân',
            '• `lv firecheck` - Kiểm tra trạng thái lửa trại',
            '• `lv firemake` - Đốt lửa trại bằng gỗ',
            '• `lv addwood <mã> <kg>` - Thêm gỗ vào lửa trại',
            '• `lv givewood <@user> <mã> <kg>` - Tặng gỗ cho người khác',
            '• `lv usewood <mã> <kg>` - Sử dụng gỗ từ kho'
          ].join('\n'),
          inline: false
        },
        { 
          name: '⛺ Lệnh lều trại (Tent)', 
          value: [
            '• `/tentowner <@user> <tên lều> <role>` - Quản lý chủ lều',
            '• `lv tent add/remove/list` - Quản lý thành viên lều',
            '• `lv tent daily` - Nhận thưởng lều hàng ngày',
            '• `lv tent bxh` - Bảng xếp hạng lều',
            '• `lv tent inv` - Xem kho lều',
            '• `lv tent quest` - Nhiệm vụ lều'
          ].join('\n'),
          inline: false
        }
      )
      .setFooter({ text: '🔥 Bot Lửa Việt - Lửa vl luôn!' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};

const store = getStore();

// lv cash
export const prefix: PrefixCommand = {
  name: 'cash',
  description: 'Check số dư người dùng',
  async execute(message) {
    const profile = store.getUser(message.author.id);
    await message.reply(`Số dư của ${message.author} là ${profile.balance} LVC.`);
  }
};

// lv info
export const prefixInfo: PrefixCommand = {
  name: 'info',
  description: 'Hiển thị thông tin server',
  async execute(message) {
    const g = message.guild!;
    const embed = new EmbedBuilder()
      .setTitle(`Thông tin server: ${g.name}`)
      .addFields(
        { name: 'ID', value: g.id, inline: true },
        { name: 'Thành viên', value: `${g.memberCount}`, inline: true }
      );
    await message.reply({ embeds: [embed] });
  }
};

// lv give <@user> <amount>
export const prefixGive: PrefixCommand = {
  name: 'give',
  description: 'Chuyển tiền cho người dùng khác',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const amount = Number(args.filter((a) => !a.startsWith('<@')).at(-1));
    if (!target || !Number.isFinite(amount) || amount <= 0) {
      await message.reply('Cú pháp: lv give <@user> <số tiền>');
      return;
    }
    const from = store.getUser(message.author.id);
    if (from.balance < amount) {
      await message.reply('Không đủ số dư.');
      return;
    }
    from.balance -= amount;
    const to = store.getUser(target.id);
    to.balance += amount;
    store.save();
    await message.reply(`Đã chuyển ${amount} LVC cho ${target}.`);
  }
};

// lv bxh
export const prefixBxh: PrefixCommand = {
  name: 'bxh',
  description: 'Bảng xếp hạng giàu nhất',
  async execute(message) {
    const top = store.getTopBalances(10);
    const desc = top
      .map((u, i) => `${i + 1}. <@${u.userId}> — ${u.balance} LVC`)
      .join('\n');
    const embed = new EmbedBuilder().setTitle('BXH Giàu Nhất').setDescription(desc || 'Trống');
    await message.reply({ embeds: [embed] });
  }
};

// lv daily
export const prefixDaily: PrefixCommand = {
  name: 'daily',
  description: 'Điểm danh hằng ngày',
  async execute(message) {
    const res = store.claimDaily(message.author.id);
    await message.reply(res.message);
  }
};

// lv quest (daily 3 quest + refresh confirm -2000 LVC)
export const prefixQuest: PrefixCommand = {
  name: 'quest',
  description: 'Nhiệm vụ hằng ngày',
  async execute(message) {
    const quests = store.getDailyQuests(message.author.id);
    const rows = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`quest_refresh:${message.author.id}`).setLabel('Làm Mới').setStyle(ButtonStyle.Secondary)
    );
    const lines = quests.map((q, idx) => `Nhiệm vụ ${idx + 1}: ${q.desc} — Thưởng ${q.reward} LVC — ${q.done ? 'Hoàn thành' : 'Chưa'}`);
    await message.reply({ content: lines.join('\n') + '\nNhấn "Làm Mới" nếu nhiệm vụ quá khó (mất 2000 LVC).', components: [rows] });
  }
};

// Đăng ký thêm các lệnh prefix phụ trong file
export const prefixes: PrefixCommand[] = [prefixInfo, prefixGive, prefixBxh, prefixDaily, prefixQuest];


