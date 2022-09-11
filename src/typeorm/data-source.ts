import { DataSource } from "typeorm";

export const AppDataSource = new DataSource({
	type: "postgres",
	host: process.env.DB_HOST,
	port: Number(process.env.DB_PORT),
	username: process.env.POSTGRES_USER,
	password: process.env.POSTGRES_PASSWORD,
	database: process.env.POSTGRES_DB,
	synchronize: false,
	logging: true,
	subscribers: [],

	migrations: [`${__dirname}/migrations/**/*{.ts,.js}`],
	migrationsRun: false,
	entities: [`${__dirname}/entities/**/*{.ts,.js}`],
})