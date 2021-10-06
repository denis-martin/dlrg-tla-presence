import { Injectable } from '@angular/core';

import { Dexie } from 'dexie';

export interface LocalPresenceRecord {
	id?: number, // local ID
	date: string,
	pId: number,
	presence: number,
	name?: string
}

class LocalDatabase extends Dexie {
	presence: Dexie.Table<LocalPresenceRecord, number>;
	
	constructor() {  
		super("LocalDatabase");
	
		this.version(1).stores({
			presence: '++id, date, pId, presence, name',
		});

		this.presence = this.table("presence");
	}
}

@Injectable({
	providedIn: 'root'
})
export class DataService
{
	private db = new LocalDatabase();
	public records: Array<LocalPresenceRecord> = [];

	constructor() { }

	async load()
	{
		this.records = await this.db.presence.toArray();
	}

	async add(date: string, pId: number, presence: number): Promise<LocalPresenceRecord>
	{
		let name: string | undefined = undefined;
		// TODO: fetch name from list

		const record: LocalPresenceRecord = {
			date: date,
			pId: pId,
			presence: presence,
			name: name
		};
		this.records.push(record);
		record.id = await this.db.presence.put(record);

		return record;
	}

	async update(r: LocalPresenceRecord): Promise<void>
	{
		if (r.id) {
			await this.db.presence.put(r, r.id);
			this.records = await this.db.presence.toArray();
		} else {
			throw "Cannot update record without ID";
		}
	}

	async delete(r: LocalPresenceRecord): Promise<void>
	{
		if (r.id) {
			await this.db.presence.delete(r.id);
			this.records = await this.db.presence.toArray();
		} else {
			throw "Cannot delete record without ID";
		}
	}
}
