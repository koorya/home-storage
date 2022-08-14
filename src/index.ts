import { Telegraf, Markup } from 'telegraf'
import { generate } from "generate-password"
import { AppDataSource } from './typeorm/data-source';
import { Box } from './typeorm/entities/box';
import fs from 'fs';
import path from 'node:path/posix';
import { In, Like } from 'typeorm';

(async () => {
	await AppDataSource.initialize();
	const BoxRepository = AppDataSource.manager.getTreeRepository(Box);
	const dataManager = AppDataSource.manager;


	const bot = new Telegraf(process.env.BOT_TOKEN || '')


	const mainMenu = Markup.keyboard(['/generate_code', '/list']).resize();


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


	bot.hears(/^(?:\/)?[b,B](?:ox)?[_,\s]([a-z,0-9]{1,8})$/, async (ctx) => {
		const message_name = ctx.match[1];

		const boxes = await Box.find({ where: { name: Like(`${message_name}%`) } });

		if (!boxes.length) {

			ctx.reply(`не найден`);
		} else if (boxes.length > 1) {
			const message = boxes.map(({ name }) => `/box_${name}`).join(' ');

			ctx.reply(`${message}`);

		} else {
			const box = boxes.pop();
			box.parent = (await BoxRepository.findAncestorsTree(box)).parent;
			console.log(box);
			const box_nested = await AppDataSource.manager.getTreeRepository(Box).findDescendants(box);
			console.log(box_nested);
			box.nestedBoxes = box_nested.filter(({ id }) => id != box.id);

			const nested = box.nestedBoxes.map(({ name }) => `/b_${name}`).join(', ');

			const message_text = `${box.name}, ${box.description},
			${nested == '' ? 'Вещи' : `Внутри: ${nested}`}
			Лежит в: ${box.parent ? `/box_${box.parent.name}` : '---'} 
			`;
			if (!box.picturePath)
				ctx.reply(`нет фото ${message_text}`);
			else {
				ctx.replyWithPhoto({ source: path.join(process.env.DB_IMAGE_PATH, box.picturePath) }, { caption: message_text });
			}
		}
	})
	bot.hears(/(?:\/)?[l,L]i?st?$/, async (ctx) => {
		const message_name = ctx.match[1];

		const boxes = await Box.find();

		if (boxes.length >= 1) {
			const message = boxes.map(({ name }) => `/box_${name}`).join(' ');

			ctx.reply(`${message}`);

		} else {

			ctx.reply(`В базе нет объектов`);
		}
	})

	bot.hears(/\/?pack /, async (ctx) => {
		// n95or525 
		if (ctx.message.reply_to_message?.from.is_bot && 'photo' in ctx.message.reply_to_message) {
			const parent_box_name = /([a-z,0-9]{8})/.exec(ctx.message.reply_to_message.caption)[1];
			const parent_box = await Box.findOne({ where: { name: parent_box_name } });


			if (!parent_box) {
				ctx.reply("Неправильная родительская коробка");
				return;
			}
			const matches = ctx.message.text.matchAll(/\/?(?:[b,B]?(?:(?:ox))_)([a-z,0-9]{8})/g);

			const box_codes = [...matches].map(([a, code]) => code);
			console.log(box_codes);
			const boxes = await BoxRepository.find({ where: { name: In(box_codes) } });

			// parent_box.nestedBoxes = await BoxRepository.findDescendants(parent_box);
			// parent_box.nestedBoxes.push(...boxes);
			// parent_box.save();
			// console.log(parent_box);

			for (const box of boxes) {
				console.log("saving: ", box.name)
				box.parent = parent_box;
				console.log(box);
				// await box.save({});
				BoxRepository.save(box);
				// await AppDataSource.manager.save(box);
			}

		}
		// const codes = [ctx.match[1], ctx.match[2]];
		// const boxes = await Promise.all(codes.map((name)=>Box.find({ where: { name: Like(`${name}%`) } })));
		// if(boxes.find(boxlist=>boxlist.length!=1))
		// 	ctx.reply('Неправильный запрос. Либо много коробок попадает под условие, либо коробка не найдена');
		// else {

		// }
	});

	bot.on('photo', async (ctx) => {
		console.log(ctx.message);
		if (ctx.message.reply_to_message?.from.is_bot && ('text' in ctx.message.reply_to_message)) {
			const code = ctx.message.reply_to_message.text;
			if (/([a-z,0-9]{8})/.test(code)) {
				await addBox(code);
			}
		} else {
			const matches = ctx.message.caption.matchAll(/(?:\/?(?:[b,B]?(?:(?:ox))_))?([a-z,0-9]{8})/g);

			const box_codes = [...matches].map(([a, code]) => code);
			console.log("box_codes: ", box_codes);
			const code = box_codes.pop();
			if (!code) {
				ctx.reply('необходимо ввести код');
				return;
			}
			if (/^add /.test(ctx.message.caption)) {
				if (!await Box.findOne({ where: { name: code } })) {

					await addBox(code);
				} else {
					ctx.reply(`/box_${code} уже есть в базе`);
				}
			} else if (/^update /.test(ctx.message.caption)) {
				ctx.reply(`Обновление пока не поддерживается`);
			}

		}


		async function addBox(code: string) {
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
			ctx.reply(`Добавлен ${code} /box_${code}`);
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