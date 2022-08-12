import { Telegraf, Markup } from 'telegraf'
import { generate } from "generate-password"




const bot = new Telegraf(process.env.BOT_TOKEN || '')

const mainMenu = Markup.keyboard(['/generate_code']).resize();


bot.start((ctx) => ctx.reply("menu", mainMenu));
bot.command("generate_code", (ctx) => {
	ctx.deleteMessage();

	ctx.reply(generate({ length: 8, uppercase: false, numbers: true }))
}
)
// bot.on('text', (ctx) => {

// 	// Using context shortcut
// 	ctx.reply(`Hello ${ctx.from.first_name}`)
// })

bot.hears(/show ([a-z,0-9]{3,8})$/, (ctx) => {
	ctx.reply(ctx.match[1]);
})

bot.on('callback_query', (ctx) => {
	// Explicit usage
	// ctx.telegram.answerCbQuery(ctx.callbackQuery.id)

	// Using context shortcut
	ctx.answerCbQuery()
	ctx.reply("answer cb query");
})

// bot.on('inline_query', (ctx) => {
// 	const result = []
// 	// Explicit usage
// 	ctx.telegram.answerInlineQuery(ctx.inlineQuery.id, result)

// 	// Using context shortcut
// 	ctx.answerInlineQuery(result)
// })

bot.action("kyky", (ctx) => ctx.reply("@kyky"));
bot.command("add", (ctx) => ctx.reply("what add"))

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))