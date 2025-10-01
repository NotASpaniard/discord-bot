import 'dotenv/config';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { loadCommands } from './lib/loader.js';
import { getEnv } from './lib/env.js';
import { getStore } from './store/store.js';

async function main(): Promise<void> {
  const env = getEnv();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.MessageContent
    ],
    partials: [Partials.Channel, Partials.Message]
  });

  // Mở rộng client bằng bộ sưu tập lệnh (đơn giản hóa thay vì mở rộng kiểu)
  (client as any).commands = new Collection();
  (client as any).prefixCommands = new Collection();

  await loadCommands(client);

  client.once('ready', () => {
    console.log(`Logged in as ${client.user?.tag}`);
  });

  client.on('interactionCreate', async (interaction) => {
    // SLASH COMMANDS
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const cmd = (client as any).commands.get(interaction.commandName);
      if (!cmd) return;
      try {
        await cmd.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.deferred || interaction.replied) {
          await interaction.followUp({ content: 'Đã xảy ra lỗi khi chạy lệnh.', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Đã xảy ra lỗi khi chạy lệnh.', ephemeral: true });
        }
      }
      return;
    }

    // Buttons
    if (interaction.isButton()) {
      const store = getStore();
      const [action, userId, amountStr] = interaction.customId.split(':');
      if (action === 'quest_refresh') {
        // Nút trung gian: hiển thị nút xác nhận
        if (interaction.user.id !== userId) {
          await interaction.reply({ content: 'Bạn không thể thao tác trên yêu cầu của người khác.', ephemeral: true });
          return;
        }
        const confirmRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
          new ButtonBuilder().setCustomId(`quest_refresh_confirm:${userId}`).setLabel('Xác Nhận Làm Mới (-2000 LVC)').setStyle(ButtonStyle.Danger)
        );
        await interaction.reply({ content: 'Xác nhận làm mới nhiệm vụ?', components: [confirmRow], ephemeral: true });
        return;
      }
      if (action === 'quest_refresh_confirm') {
        // Thực hiện trừ tiền và sinh nhiệm vụ mới
        if (interaction.user.id !== userId) {
          await interaction.reply({ content: 'Bạn không thể thao tác trên yêu cầu của người khác.', ephemeral: true });
          return;
        }
        const u = store.getUser(userId);
        if (u.balance < 2000) {
          await interaction.reply({ content: 'Không đủ 2000 LVC để làm mới.', ephemeral: true });
          return;
        }
        u.balance -= 2000;
        store.refreshDailyQuests(userId);
        store.save();
        await interaction.reply({ content: 'Đã làm mới nhiệm vụ.', ephemeral: true });
        return;
      }

      // Admin confirm buttons: admin_add/remove/reset
      if (action === 'admin_add' || action === 'admin_remove' || action === 'admin_reset') {
        // Quyền đã kiểm tra ở slash; tại đây chỉ thực thi
        const targetId = userId;
        const amount = Number(amountStr || '0');
        const user = store.getUser(targetId);
        if (action === 'admin_add') user.balance += amount;
        if (action === 'admin_remove') user.balance = Math.max(0, user.balance - amount);
        if (action === 'admin_reset') user.balance = 0;
        store.save();
        await interaction.reply({ content: 'Đã thực thi.', ephemeral: true });
        return;
      }
    }
  });

  client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    // Hỗ trợ 2 tiền tố: "lv " (mặc định) và "lv!" cho nhóm quản trị
    const prefixes = [env.PREFIX, 'lv!'];
    const used = prefixes.find((p) => message.content.toLowerCase().startsWith(p));
    if (!used) return;

    const withoutPrefix = message.content.slice(used.length).trim();
    const [name, ...args] = withoutPrefix.split(/\s+/);
    const command = (client as any).prefixCommands.get(name.toLowerCase());
    if (!command) return;
    try {
      await command.execute(message, args);
    } catch (error) {
      console.error(error);
      await message.reply('Đã xảy ra lỗi khi chạy lệnh.');
    }
  });

  await client.login(env.DISCORD_TOKEN);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});


