import { SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';

// /tentowner <@user> <tên lều> <role>
export const slash: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('tentowner')
    .setDescription('Gán chủ sở hữu lều')
    .addUserOption((o) => o.setName('user').setDescription('Người dùng').setRequired(true))
    .addStringOption((o) => o.setName('name').setDescription('Tên lều').setRequired(true))
    .addStringOption((o) => o.setName('role').setDescription('ID role').setRequired(true)),
  async execute(interaction) {
    // Role kiểm soát: chỉ role id 1409811217048141896 được phép
    const allowRoleId = '1409811217048141896';
    const member = await interaction.guild!.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(allowRoleId)) {
      await interaction.reply({ content: 'Bạn không có quyền dùng lệnh này.', ephemeral: true });
      return;
    }
    const user = interaction.options.getUser('user', true);
    const name = interaction.options.getString('name', true);
    const roleId = interaction.options.getString('role', true);
    const store = getStore();
    store.setTentOwner(name, user.id, roleId);
    store.save();
    await interaction.reply({ content: `Đã đặt ${user} làm chủ lều '${name}' (role ${roleId}).`, ephemeral: true });
  }
};

// lv tent add <@user>
export const prefixAdd: PrefixCommand = {
  name: 'tent',
  description: 'Quản lý lều: add/remove/list/daily/bxh/inv/quest',
  async execute(message, args) {
    const sub = (args[0] || '').toLowerCase();
    const store = getStore();
    const myTent = store.getUserTent(message.author.id);
    if (sub === 'add') {
      if (!myTent || myTent.ownerId !== message.author.id) { await message.reply('Chỉ chủ lều mới dùng được.'); return; }
      const target = message.mentions.users.first();
      if (!target) { await message.reply('Cú pháp: lv tent add <@user>'); return; }
      store.addTentMember(myTent.name, target.id);
      store.save();
      await message.reply(`Đã thêm ${target} vào lều ${myTent.name}.`);
      return;
    }
    if (sub === 'remove') {
      if (!myTent || myTent.ownerId !== message.author.id) { await message.reply('Chỉ chủ lều mới dùng được.'); return; }
      const target = message.mentions.users.first();
      if (!target) { await message.reply('Cú pháp: lv tent remove <@user>'); return; }
      store.removeTentMember(myTent.name, target.id);
      store.save();
      await message.reply(`Đã xóa ${target} khỏi lều ${myTent.name}.`);
      return;
    }
    if (sub === 'list') {
      if (!myTent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
      const lines = myTent.members.map((m) => `<@${m}>`).join(', ');
      await message.reply(`Thành viên lều ${myTent.name}: ${lines || 'Trống'}`);
      return;
    }
    if (sub === 'inv') {
      if (!myTent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
      const lines = Object.entries(myTent.inventory).map(([k, v]) => `${k}: ${v} kg`).join('\n');
      await message.reply(lines || 'Kho lều trống.');
      return;
    }
    if (sub === 'daily') {
      if (!myTent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
      const res = store.markTentDaily(myTent.name, message.author.id);
      // Nếu tất cả các thành viên đã điểm danh: thưởng 300 LVC cho tất cả
      if (res.completedAll) {
        for (const uid of myTent.members) {
          store.getUser(uid).balance += 300;
        }
        store.save();
        await message.reply(`Toàn bộ thành viên đã điểm danh! Mỗi người nhận 300 LVC.`);
      } else {
        await message.reply(res.message);
      }
      return;
    }
    if (sub === 'bxh') {
      // BXH: theo tổng gỗ và thời gian lửa
      const tents = Object.values((getStore() as any)['db'].tents) as any[];
      const score = tents.map((t) => ({
        name: t.name,
        wood: Object.values(t.inventory).reduce((s: number, x: any) => s + (x as number), 0),
        fireLeft: Math.max(0, (t.fire.until ?? 0) - Date.now())
      }));
      score.sort((a, b) => b.wood - a.wood || b.fireLeft - a.fireLeft);
      const lines = score.slice(0, 10).map((t, i) => `${i + 1}. ${t.name} — Gỗ: ${t.wood}kg — Lửa còn: ${Math.ceil(t.fireLeft / 60000)}p`);
      await message.reply(lines.join('\n') || 'Chưa có lều nào.');
      return;
    }
    if (sub === 'quest') {
      if (!myTent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
      const quests = store.getTentQuests(myTent.name);
      const lines = quests.map((q, i) => `Nhiệm vụ ${i + 1}: ${q.desc} — Thưởng ${q.reward} LVC — ${q.done ? 'Hoàn thành' : 'Chưa'}`);
      await message.reply(lines.join('\n'));
      return;
    }
    await message.reply('Các lệnh: lv tent add/remove/list/inv/daily/bxh/quest');
  }
};

export const prefixes: PrefixCommand[] = [prefixAdd];


