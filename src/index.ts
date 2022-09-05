import { Telegraf, Markup } from 'telegraf'
import { generate } from "generate-password"
import { AppDataSource } from './typeorm/data-source';
import { Box } from './typeorm/entities/box';
import fs from 'fs';
import path from 'node:path/posix';
import { In, IsNull, Like, Not, TreeRepository } from 'typeorm';
import { Stuff } from './typeorm/entities/stuff';

const codeRegExp = /[a-z,0-9]{8}/;
const commandRemoveRegExp = RegExp(`^/rmbox (${codeRegExp.source})`);
const boxShortNameRegExp = /^(?:\/)?[b,B](?:ox)?[_,\s]([a-z,0-9]{1,8})$/;
const commandListRegEx = /(?:\/)?[l,L]i?st?$/;
const commandPackRegExp = /\/?pack /;
const packParserRegExp = /([\+\-])(?:([a-z0-9]{8}\b)|"((?:[\wа-я]+\s?)+)")/g;
(async () => {

	await AppDataSource.initialize();
	const BoxRepository = AppDataSource.manager.getTreeRepository(Box);
	const dataManager = AppDataSource.manager;


	const bot = new Telegraf(process.env.BOT_TOKEN || '')


	const mainMenu = Markup.keyboard(['/generate_code', '/list', '/ls_stuff', '/find', '/ls_box'], { columns: 3 }).resize();


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


	bot.hears(boxShortNameRegExp, async (ctx) => {
		const message_name = ctx.match[1];

		// const boxes = await Box.find({ where: { name: Like(`${message_name}%`) } });
		const boxes = await BoxRepository.find({ where: { name: Like(`${message_name}%`) }, relations: ['stuff'] });

		if (!boxes.length) {

			ctx.reply(`не найден`);
		} else if (boxes.length > 1) {
			const message = boxes.map(({ name }) => `/box_${name}`).join(' ');

			ctx.reply(`${message}`);

		} else {
			const box = boxes.pop();

			const message_text = await renderBox(box, BoxRepository);
			if (!box.picturePath)
				ctx.reply(`нет фото ${message_text}`);
			else {
				ctx.replyWithPhoto({ source: path.join(process.env.DB_IMAGE_PATH, box.picturePath) }, { caption: message_text });
			}
		}
	})
	bot.hears(commandRemoveRegExp, async (ctx) => {
		const code = ctx.match[1];
		const box = await BoxRepository.findOne({ where: { name: code }, relations: ['stuff'] });
		if (box) {
			if (box.stuff.length || (await BoxRepository.findDescendants(box)).length > 1) {
				ctx.reply(`/box_${code} не пустой`);
			} else {
				fs.rename(path.join(process.env.DB_IMAGE_PATH, box.picturePath), path.join(process.env.DB_IMAGE_PATH, 'rm_' + box.picturePath), () => { });
				await BoxRepository.remove(box);
				// await box.remove();
				ctx.reply(`${code} удален`);
			}
		} else {
			ctx.reply(`${code} не найден`);
		}
	});
	bot.hears('/ls_stuff', async (ctx) => {
		const stuff = await Stuff.find();
		const reply = stuff.map(v => `${v.name}`).join(", ");
		ctx.reply(reply);
	});
	bot.hears(/\/find ([\wа-я]+)/, async (ctx) => {
		const key_word = ctx.match[1];
		const stuff = await Stuff.find({ where: { name: Like(`%${key_word}%`) }, relations: ['box'] });
		const reply = stuff.filter(v => !!v.box).map(v => `${v.name} - /b_${v.box.name}`).join(', ');
		ctx.reply(reply || "не найдено");

	});
	bot.hears('/ls_box', async (ctx) => {
		const boxes = await Box.find();
		Promise.all(boxes.map(
			async (box) => {

				await ctx.replyWithPhoto({ source: path.join(process.env.DB_IMAGE_PATH, box.picturePath) }, { caption: `/b_${box.name}` });
			}
		))

	});
	bot.hears(commandListRegEx, async (ctx) => {
		const message_name = ctx.match[1];

		const boxes = await Box.find();

		if (boxes.length >= 1) {
			const message = boxes.map(({ name }) => `/box_${name}`).join(' ');

			ctx.reply(`${message}`);

		} else {

			ctx.reply(`В базе нет объектов`);
		}
	})

	bot.hears(commandPackRegExp, async (ctx) => {
		if (ctx.message.reply_to_message?.from.is_bot && 'photo' in ctx.message.reply_to_message) {
			const parent_box_name = codeRegExp.exec(ctx.message.reply_to_message.caption)[1];
			const parent_box = await Box.findOne({ where: { name: parent_box_name } });

			if (!parent_box) {
				ctx.reply("Неправильная родительская коробка");
				return;
			}
			const matches = ctx.message.text.matchAll(RegExp(codeRegExp, "g"));

			const box_codes = [...matches].map(([code]) => code);
			console.log(box_codes);
			const boxes = await BoxRepository.find({ where: { name: In(box_codes) } });

			for (const box of boxes) {
				console.log("saving: ", box.name)
				box.parent = parent_box;
				console.log(box);
				BoxRepository.save(box);
			}
		}
	});

	bot.hears(packParserRegExp, async (ctx) => {
		if (ctx.message.reply_to_message?.from.is_bot && 'photo' in ctx.message.reply_to_message) {
			const box_name = codeRegExp.exec(ctx.message.reply_to_message.caption).pop();
			const box = await BoxRepository.findOne({ where: { name: box_name }, relations: ['stuff'] });
			if (!box) {
				ctx.reply("Неправильная родительская коробка");
				return;
			}


			const matches = [...ctx.message.text.matchAll(RegExp(packParserRegExp.source, 'g'))];
			const commited: { op: '+' | '-'; type: 'box' | 'thing'; name: string; }[] = [];
			await Promise.all(matches.map(async ([full, op_str, code, name]) => {
				const op = op_str as '+' | '-';
				if (code) {
					const sub_box = await BoxRepository.findOne({ where: { name: code } });
					if (op == '+') {
						if (sub_box) {
							sub_box.parent = box;
							BoxRepository.save(sub_box);
							commited.push({ op, type: 'box', name: code });
						}
					} else {
						const box_nested = (await AppDataSource.manager.getTreeRepository(Box).findDescendantsTree(box)).nestedBoxes;
						if (box_nested.find(v => v.name == sub_box.name)) {
							sub_box.parent = null;
							BoxRepository.save(sub_box);
							commited.push({ op, type: 'box', name: code });
						}
					}
				} else {
					if (op == '+') {

						const thing = new Stuff();

						thing.name = name;
						thing.description = '';
						thing.box = box;
						await thing.save();
						box.stuff.push(thing);
						commited.push({ op, type: 'thing', name });
					} else {
						const thing = box.stuff.find(v => v.name == name);
						if (thing) {
							thing.box = null;
							await thing.save();
							box.stuff = box.stuff.filter(v => v != thing);
							commited.push({ op, type: 'thing', name });
						}
					}
				}
			}));
			const addThings = commited.filter(({ type, op }) => type == 'thing' && op == '+');
			const removeThings = commited.filter(({ type, op }) => type == 'thing' && op == '-');
			const addBoxes = commited.filter(({ type, op }) => type == 'box' && op == '+');
			const removeBoxes = commited.filter(({ type, op }) => type == 'box' && op == '-');
			const reply = (addThings.length ? `Добавлены вещи: ${addThings.map(v => v.name).join(', ')}\n` : ``) +
				(removeThings.length ? `Убраны вещи: ${removeThings.map(v => v.name).join(', ')}\n` : ``) +
				(removeBoxes.length ? `Убраны коробки: ${removeBoxes.map(v => v.name).join(', ')}\n` : ``) +
				(addBoxes.length ? `Добавлены коробки: ${addBoxes.map(v => v.name).join(', ')}\n` : ``);
			ctx.reply(reply || 'ни одна задача не обработана');

			await ctx.telegram.editMessageCaption(ctx.message.chat.id,
				ctx.message.reply_to_message.message_id, '	',
				await renderBox(box, BoxRepository)).catch(() => { console.log('сообщение не изменено') })
		}
	});

	bot.on('photo', async (ctx) => {
		console.log(ctx.message);
		const downloadPhoto = async () => {
			const { file_id: photoId } = ctx.message.photo.pop();
			const fileUrl = await ctx.telegram.getFileLink(photoId);
			return await downloadPhotoByURL(fileUrl);
		}
		if (ctx.message.reply_to_message?.from.is_bot && ('text' in ctx.message.reply_to_message)) {
			const code = ctx.message.reply_to_message.text;

			if (codeRegExp.test(code)) {


				const box = new Box();
				box.name = code;
				box.description = '';
				box.picturePath = await downloadPhoto();
				await box.save();
				ctx.reply(`Добавлен ${code} /box_${code}`);
			}
		} else if (ctx.message.reply_to_message?.from.is_bot && ('photo' in ctx.message.reply_to_message)) {
			const box_id = RegExp(`^(${codeRegExp.source})`).exec(ctx.message.reply_to_message.caption)[0];

			const command = ctx.message.caption;
			if (command == "update") {
				console.log(command, box_id);

				const box = await Box.findOne({ where: { name: box_id } });
				box.picturePath = await downloadPhoto();
				box.save();

				ctx.reply(`Фото обновлено /box_${box_id}`);
			}
		}


	})

	async function downloadPhotoByURL(fileUrl: URL) {
		const arrayBuffer = await fetch(fileUrl.toString()).then(res => res.arrayBuffer());
		const buffer = Buffer.from(arrayBuffer);
		const fileExt = fileUrl.toString().split('.').pop();

		const uniq_name = generate({ length: 16, uppercase: false, numbers: true });
		const outputFileName = `${uniq_name}.${fileExt}`;
		await new Promise((resolve) => fs.createWriteStream(path.join(process.env.DB_IMAGE_PATH, outputFileName)).write(buffer, resolve));
		return outputFileName;
	}

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

async function renderBox(box: Box, BoxRepository: TreeRepository<Box>) {
	const parents = (await BoxRepository.findAncestors(box));
	const box_nested = (await AppDataSource.manager.getTreeRepository(Box).findDescendantsTree(box)).nestedBoxes;
	box.nestedBoxes = box_nested.filter(({ id }) => id != box.id);

	const nested = box.nestedBoxes.map(({ name }) => `/b_${name}`).join(', ');
	const stuff = box.stuff || [];
	const message_text = `${box.name}
			Родительские: ${parents.filter(v => v.name != box.name).map(b => `/box_${b.name}`).join(', ') || '---'};
			Описание: ${box.description || '---'};
			Вложено: ${nested || '---'};
			Вещи: ${stuff.map(v => v.name).join(', ') || '---'}
			`;
	return message_text;
}
