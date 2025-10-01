import { EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { PrefixCommand, SlashCommand } from '../types/command.js';
import { getStore } from '../store/store.js';

export const slash: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('Xem số dư (demo)')
    .addUserOption((opt) => opt.setName('user').setDescription('Người dùng').setRequired(false)),
  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const store = getStore();
    const profile = store.getUser(user.id);
    await interaction.reply({ content: `Số dư của ${user} là ${profile.balance} LVC.`, ephemeral: true });
  }
};

export const prefix: PrefixCommand = {
  name: 'inv',
  description: 'Xem túi đồ (demo)',
  async execute(message) {
    const store = getStore();
    const inv = store.getInventory(message.author.id);
    const lines = Object.entries(inv)
      .map(([k, v]) => `${k}: ${v} kg`)
      .join('\n');
    await message.reply(lines || 'Túi đồ trống.');
  }
};

// ===== CAMPING PREFIX CMDS =====
export const prefixPickup: PrefixCommand = {
  name: 'pickup',
  description: 'Nhặt gỗ',
  async execute(message) {
    const store = getStore();
    const res = store.pickupWood(message.author.id);
    await message.reply(`Bạn nhặt được ${res.kg}kg ${res.label} (mã ${res.woodId}).`);
  }
};

export const prefixFirecheck: PrefixCommand = {
  name: 'firecheck',
  description: 'Kiểm tra thời gian lửa của lều',
  async execute(message) {
    const store = getStore();
    const tent = store.getUserTent(message.author.id);
    if (!tent || !tent.fire.until) {
      await message.reply('Lều chưa có lửa.');
      return;
    }
    const leftMs = Math.max(0, tent.fire.until - Date.now());
    const minutes = Math.ceil(leftMs / 60000);
    await message.reply(`Lửa còn khoảng ${minutes} phút.`);
  }
};

export const prefixFiremake: PrefixCommand = {
  name: 'firemake',
  description: 'Tạo lửa cho lều',
  async execute(message) {
    const store = getStore();
    const tent = store.getUserTent(message.author.id);
    if (!tent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
    if (tent.fire.until && tent.fire.until > Date.now()) { await message.reply('Lều đã có lửa.'); return; }
    const user = store.getUser(message.author.id);
    if (user.balance < 300) { await message.reply('Cần 300 LVC để mua quẹt lửa.'); return; }
    // Cần 3 Gỗ Tươi (03) & 2 Gỗ Khô (04)
    const okFresh = (tent.inventory['03'] ?? 0) >= 3;
    const okDry = (tent.inventory['04'] ?? 0) >= 2;
    if (!okFresh || !okDry) { await message.reply('Thiếu gỗ: cần 3 Gỗ Tươi (03) và 2 Gỗ Khô (04).'); return; }
    tent.inventory['03'] -= 3; if (tent.inventory['03'] <= 0) delete tent.inventory['03'];
    tent.inventory['04'] -= 2; if (tent.inventory['04'] <= 0) delete tent.inventory['04'];
    user.balance -= 300;
    // thời gian cháy mặc định 60 phút (tối thiểu theo yêu cầu 60-80 phút)
    store.startTentFire(tent.name, 60);
    store.save();
    await message.reply('Đã tạo lửa cho lều (60 phút).');
  }
};

export const prefixAddwood: PrefixCommand = {
  name: 'addwood',
  description: 'Thêm gỗ vào kho của lều: lv addwood <mã> <kg>',
  async execute(message, args) {
    const woodId = args[0];
    const kg = Number(args[1]);
    if (!woodId || !Number.isFinite(kg) || kg <= 0) { await message.reply('Cú pháp: lv addwood <mã> <kg>'); return; }
    const store = getStore();
    const tent = store.getUserTent(message.author.id);
    if (!tent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
    store.addWoodToTent(tent.name, woodId, kg);
    await message.reply(`Đã thêm ${kg}kg gỗ ${woodId} vào kho lều ${tent.name}.`);
  }
};

export const prefixGivewood: PrefixCommand = {
  name: 'givewood',
  description: 'Cho người khác gỗ: lv givewood <@user> <mã> <kg>',
  async execute(message, args) {
    const target = message.mentions.users.first();
    const parts = args.filter((a) => !a.startsWith('<@'));
    const woodId = parts[0];
    const kg = Number(parts[1]);
    if (!target || !woodId || !Number.isFinite(kg) || kg <= 0) { await message.reply('Cú pháp: lv givewood <@user> <mã> <kg>'); return; }
    const store = getStore();
    if (!store.consumeUserWood(message.author.id, woodId, kg)) { await message.reply('Bạn không đủ gỗ.'); return; }
    const inv = store.getInventory(target.id);
    inv[woodId] = (inv[woodId] ?? 0) + kg;
    store.save();
    await message.reply(`Đã cho ${target} ${kg}kg gỗ ${woodId}.`);
  }
};

export const prefixUsewood: PrefixCommand = {
  name: 'usewood',
  description: 'Dùng gỗ và lửa cho lều: lv usewood <mã> <kg>',
  async execute(message, args) {
    const woodId = args[0];
    const kg = Number(args[1]);
    if (!woodId || !Number.isFinite(kg) || kg <= 0) { await message.reply('Cú pháp: lv usewood <mã> <kg>'); return; }
    const store = getStore();
    const tent = store.getUserTent(message.author.id);
    if (!tent) { await message.reply('Bạn chưa thuộc lều nào.'); return; }
    if ((tent.inventory[woodId] ?? 0) < kg) { await message.reply('Kho lều không đủ gỗ.'); return; }
    tent.inventory[woodId] -= kg; if (tent.inventory[woodId] <= 0) delete tent.inventory[woodId];
    // Mỗi 1kg thêm 1 phút cháy
    const addMinutes = Math.max(1, Math.floor(kg));
    const now = Date.now();
    const currentUntil = tent.fire.until && tent.fire.until > now ? tent.fire.until : now;
    tent.fire.until = currentUntil + addMinutes * 60000;
    store.save();
    await message.reply(`Đã thêm ${kg}kg gỗ ${woodId} vào lửa. Thêm ${addMinutes} phút.`);
  }
};

export const prefixes: PrefixCommand[] = [prefix, prefixPickup, prefixFirecheck, prefixFiremake, prefixAddwood, prefixGivewood, prefixUsewood];


