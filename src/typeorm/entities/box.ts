/* eslint-disable camelcase */
import {
	BaseEntity,
	Column,
	Entity,
	ManyToOne,
	OneToMany,
	PrimaryGeneratedColumn,
	Tree,
	TreeChildren,
	TreeParent,
} from 'typeorm';

@Entity()
@Tree("closure-table")
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

	@Column({
		type: 'character varying',
		length: 32,
		nullable: true,
	})
	picturePath: string;

	@TreeParent()
	parent: Box;

	@TreeChildren()
	nestedBoxes: Box[];
}
