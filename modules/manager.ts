import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';

// PREFIX: lv!name <content>, lv!legit <content>
const MANAGER_ROLES = ['YOUR_MANAGER_ROLE_ID_1', 'YOUR_MANAGER_ROLE_ID_2', 'YOUR_MANAGER_ROLE_ID_3', 'YOUR_MANAGER_USER_ID'];

function hasAnyRole(member: any, roleIds: string[]): boolean {
  return roleIds.some((id) => member.roles.cache.has(id));
}

export const prefixName: PrefixCommand = {
  name: 'name',
  description: 'Đổi tên kênh nhanh: lv!name <content>',
  async execute(message, args) {
    const member = await message.guild!.members.fetch(message.author.id);
    if (!hasAnyRole(member, MANAGER_ROLES)) { await message.reply('Bạn không có quyền.'); return; }
    const content = args.join(' ').trim();
    if (!content) { await message.reply('Cú pháp: lv!name <content>'); return; }
    await message.channel.setName(content.slice(0, 100));
    await message.reply('Đã đổi tên kênh.');
  }
};

export const prefixLegit: PrefixCommand = {
  name: 'legit',
  description: 'Feedback/legit đơn hàng: lv!legit <content>',
  async execute(message, args) {
    const member = await message.guild!.members.fetch(message.author.id);
    if (!hasAnyRole(member, MANAGER_ROLES)) { await message.reply('Bạn không có quyền.'); return; }
    const content = args.join(' ').trim();
    if (!content) { await message.reply('Cú pháp: lv!legit <content>'); return; }
    await message.reply(`LEGIT: ${content}`);
  }
};

export const prefixes: PrefixCommand[] = [prefixName, prefixLegit];

// SLASH: /add /remove /reset với xác nhận
function buildConfirmRow(id: string, label: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(ButtonStyle.Danger)
  );
}

export const slashAdd: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('add')
    .setDescription('Thêm tiền cho người dùng (cần quyền)')
    .addUserOption((o) => o.setName('user').setDescription('Người dùng').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Số tiền').setRequired(true)),
  async execute(interaction) {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!hasAnyRole(member, MANAGER_ROLES)) { await interaction.reply({ content: 'Bạn không có quyền.', ephemeral: true }); return; }
    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    await interaction.reply({ content: `Xác nhận thêm ${amount} LVC cho ${user}?`, components: [buildConfirmRow(`admin_add:${user.id}:${amount}`, 'Xác Nhận')], ephemeral: true });
  }
};

export const slashRemove: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Trừ tiền người dùng (cần quyền)')
    .addUserOption((o) => o.setName('user').setDescription('Người dùng').setRequired(true))
    .addIntegerOption((o) => o.setName('amount').setDescription('Số tiền').setRequired(true)),
  async execute(interaction) {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!hasAnyRole(member, MANAGER_ROLES)) { await interaction.reply({ content: 'Bạn không có quyền.', ephemeral: true }); return; }
    const user = interaction.options.getUser('user', true);
    const amount = interaction.options.getInteger('amount', true);
    await interaction.reply({ content: `Xác nhận trừ ${amount} LVC của ${user}?`, components: [buildConfirmRow(`admin_remove:${user.id}:${amount}`, 'Xác Nhận')], ephemeral: true });
  }
};

export const slashReset: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('resetmoney')
    .setDescription('Reset toàn bộ tiền người dùng (cần quyền)')
    .addUserOption((o) => o.setName('user').setDescription('Người dùng').setRequired(true)),
  async execute(interaction) {
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!hasAnyRole(member, MANAGER_ROLES)) { await interaction.reply({ content: 'Bạn không có quyền.', ephemeral: true }); return; }
    const user = interaction.options.getUser('user', true);
    await interaction.reply({ content: `Xác nhận reset tiền của ${user}?`, components: [buildConfirmRow(`admin_reset:${user.id}:0`, 'Xác Nhận')], ephemeral: true });
  }
};

export const slashes: SlashCommand[] = [slashAdd, slashRemove, slashReset];


