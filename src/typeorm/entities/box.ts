/* eslint-disable camelcase */
import {
	BaseEntity,
	Column,
	Entity,
	PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Box extends BaseEntity {
	@PrimaryGeneratedColumn('uuid')
	id: string;

	@Column({
		type: 'character varying',
		length: 150,
	})
	name: string;

	@Column({
		type: 'text',
	})
	description: string;


}
