import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
	type: "postgres",
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	username: process.env.DB_USER,
	password: process.env.DB_PASSWORD,
	database: process.env.DB_NAME,
	synchronize: false,
	logging: true,
	subscribers: [],

	migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],
	migrationsRun: false,
	entities: [`${__dirname}/entities/**/*{.ts,.js}`],
})