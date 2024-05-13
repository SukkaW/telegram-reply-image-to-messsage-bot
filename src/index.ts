import { loadConfig } from 'unconfig';

import { Input, Telegraf } from 'telegraf';
import type { Chat } from 'telegraf/typings/core/types/typegram';
// import { message } from 'telegraf/filters';

export interface Config {
  botToken: string,
  allowedGroupIds: number[],
  messageImageMap: Record<string, string>
}

export const defineBotConfig = (cfg: Config) => cfg;

const isGroupChat = (type: Chat['type']): boolean => {
  return type === 'group' || type === 'supergroup';
};

(async () => {
  const { config } = await loadConfig<Config>({
    sources: [{
      files: 'bot.config',
      extensions: ['ts', 'mts', 'cts', 'js', 'mjs', 'cjs', 'json', '']
    }],
    merge: false
  });

  const botToken = config.botToken;
  if (!botToken) {
    throw new TypeError('BOT_TOKEN is not provided!');
  }
  const allowedGroupIds = new Set(config.allowedGroupIds);
  if (allowedGroupIds.size === 0) {
    throw new TypeError('ALLOWED_CHAT_IDS is not provided!');
  }

  const bot = new Telegraf(botToken);

  bot.hears('/groupid', (ctx) => {
    if (!isGroupChat(ctx.chat.type)) {
      return;
    }
    return ctx.reply(`Group ID: ${ctx.chat.id}`);
  });
  bot.hears('#groupinfo', (ctx) => {
    if (!isGroupChat(ctx.chat.type)) {
      return;
    }
    return ctx.reply(`Group ID: ${ctx.chat.id}`);
  });

  Object.entries(config.messageImageMap).forEach(([command, url]) => {
    bot.hears(command, (ctx) => {
      // Explicit usage
      // await ctx.telegram.sendMessage(ctx.message.chat.id, `Hello ${ctx.state.role}`);
      if (!isGroupChat(ctx.chat.type)) {
        return;
      }
      if (!allowedGroupIds.has(ctx.chat.id)) {
        return;
      }
      if (ctx.message.reply_to_message) {
        const replyToMessageId = ctx.message.reply_to_message.message_id;
        return ctx.telegram.sendPhoto(ctx.chat.id, Input.fromURL(url), {
          reply_parameters: {
            message_id: replyToMessageId,
            chat_id: ctx.chat.id,
            allow_sending_without_reply: false
          }
        });
      }
      return ctx.replyWithPhoto(Input.fromURL(url));
    });
  });

  // Enable graceful stop
  process.once('SIGINT', () => {
    console.log('[*] SIGINT received');
    bot.stop('SIGINT');
  });
  process.once('SIGTERM', () => {
    console.log('[*] SIGTERM received');
    bot.stop('SIGTERM');
  });

  console.log('[*] Bot booting up...');
  bot.launch(() => {
    console.log('[*] Bot is up and running!');
  });
})();
