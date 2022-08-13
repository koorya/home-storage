import { Telegraf, Markup } from 'telegraf'
import { generate } from "generate-password"
import { AppDataSource } from './typeorm/data-source';
import { Box } from './typeorm/entities/box';
import fs from 'fs';
import path from 'node:path/posix';
import { Like } from 'typeorm';

(async () => {
	await AppDataSource.initialize();


	const bot = new Telegraf(process.env.BOT_TOKEN || '')


	const mainMenu = Markup.keyboard(['/generate_code']).resize();


	bot.start((ctx) => ctx.reply("menu", mainMenu));
	bot.command("generate_code", async (ctx) => {
		ctx.deleteMessage();

		for (let i = 0; i < 100; i++) {

			const new_code = generate({ length: 8, uppercase: false, numbers: true });
			const box = await Box.findOne({ where: { name: new_code } });
			if (!box) {
				console.log(new_code);
				ctx.reply(new_code);
				return;
			}

		}
		ctx.reply('Повторите попытку');

	}
	)
	// bot.on('text', (ctx) => {

	// 	// Using context shortcut
	// 	ctx.reply(`Hello ${ctx.from.first_name}`)
	// })

	bot.hears(/create ([a-z,0-9]{3,8})$/, (ctx) => {
		const message_name = ctx.match[1];
		const box = new Box();
		box.name = message_name;
		box.description = 'sample description';
		box.save();
		// AppDataSource.manager.save()
		ctx.reply(message_name);
	})


	bot.hears(/(?:\/?)show[_,\s]([a-z,0-9]{1,8})$/, async (ctx) => {
		const message_name = ctx.match[1];

		const boxes = await Box.find({ where: { name: Like(`${message_name}%`) } });

		if (!boxes.length) {

			ctx.reply(`не найден`);
		} else if (boxes.length > 1) {
			const message = boxes.map(({ name }) => `/show_${name}`).join(' ');

			ctx.reply(`${message}`);

		} else {
			const box = boxes.pop();
			if (box.picturePath)
				ctx.replyWithPhoto({ source: path.join(process.env.DB_IMAGE_PATH, box.picturePath) }, { caption: `${box.name}, ${box.description}` });
			else
				ctx.reply(`${box.name}, ${box.description}, нет фото`);
		}
	})
	bot.hears(/(?:\/?)[l,L]ist$/, async (ctx) => {
		const message_name = ctx.match[1];

		const boxes = await Box.find();

		if (boxes.length >= 1) {
			const message = boxes.map(({ name }) => `/show_${name}`).join(' ');

			ctx.reply(`${message}`);

		} else {

			ctx.reply(`В базе нет объектов`);
		}
	})



	bot.on('photo', async (ctx) => {
		console.log(ctx.message);
		if (ctx.message.reply_to_message?.from.is_bot && ('text' in ctx.message.reply_to_message)) {
			const code = ctx.message.reply_to_message.text;
			if (/([a-z,0-9]{8})/.test(code)) {
				const { file_id: photoId } = ctx.message.photo.pop();
				const fileUrl = await ctx.telegram.getFileLink(photoId);
				const arrayBuffer = await fetch(fileUrl.toString()).then(res => res.arrayBuffer());
				const buffer = Buffer.from(arrayBuffer);
				const fileExt = fileUrl.toString().split('.').pop();

				const uniq_name = generate({ length: 16, uppercase: false, numbers: true });
				const outputFileName = `${uniq_name}.${fileExt}`;
				await new Promise((resolve) => fs.createWriteStream(path.join(process.env.DB_IMAGE_PATH, outputFileName)).write(buffer, resolve));
				const box = new Box();
				box.name = code;
				box.description = '';
				box.picturePath = outputFileName;
				await box.save();
				ctx.reply(`Добавлен ${code} /show_${code}`);
			}
		}

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
})()