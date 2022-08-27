/* eslint-disable camelcase */
import {
	BaseEntity,
	Column,
	Entity,
	JoinColumn,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	Tree,
	TreeChildren,
	TreeParent,
} from 'typeorm';
import { Box } from './box';

@Entity()
export class Stuff extends BaseEntity {
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

	@Column({
		type: 'character varying',
		length: 32,
		nullable: true,
	})
	picturePath: string;

	@ManyToOne(() => Box, box => box.stuff)
	box: Box;

}
