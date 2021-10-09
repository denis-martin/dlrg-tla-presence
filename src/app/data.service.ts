import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SwUpdate } from '@angular/service-worker';
import { Observable } from 'rxjs';

import { Dexie } from 'dexie';
import { AES, SHA256, enc } from 'crypto-js';

import { environment } from 'src/environments/environment';

export interface LocalPresenceRecord {
	id?: number, // local ID
	date: string,
	pId: number,
	presence: number,
	synced?: boolean
}

export interface LocalParticipantRecord {
	id?: number, // local ID
	pId: number, // remote participant ID
	name?: string
}

interface ApiLoginResponse {
	code?: number,
	user?: string,
	ciphertest?: string
}

interface ApiParticipant {
	id?: number;
	changedBy?: string;
	changedAt?: string;
	data_enc?: string;
	data?: {
		lastName: string;
		firstName: string;
	};
}

const ciphertestPlaintext = "1234567890";

class LocalDatabase extends Dexie {
	presence: Dexie.Table<LocalPresenceRecord, number>;
	participants: Dexie.Table<LocalParticipantRecord, number>;
	
	constructor() {  
		super("PresenceDatabase");
	
		this.version(1).stores({
			presence: '++id',
			participants: '++id',
		});

		this.presence = this.table("presence");
		this.participants = this.table("participants");
	}
}

@Injectable({
	providedIn: 'root'
})
export class DataService
{
	userName = "Scanner";
	needLogin = true;
	needDataKey = true;
	dataKeyHash = "";

	private db = new LocalDatabase();
	public records: Array<LocalPresenceRecord> = [];
	public participants: Record<number, LocalParticipantRecord> = {};

	uploadSuccessCount = 0;
	uploadErrorCount = 0;
	statusUpload?: string;
	uploadDone = false;
	uploadErrorCode = 0;

	swUpdateAvailable = false;

	constructor(private http: HttpClient, public swUpdate: SwUpdate)
	{
		const dkh = localStorage.getItem("dkh");
		if (typeof dkh === "string") {
			this.dataKeyHash = dkh;
			this.needDataKey = false;
		}
		this.checkLogin();
		this.swUpdate.available.subscribe((event) => {
			console.log("software update available, current", event.current, "available", event.available);
			this.swUpdateAvailable = true;
		});
	}

	// Local storage (IndexDB)

	async load()
	{
		this.records = (await this.db.presence.toArray()).reverse();
		this.participants = {};
		const participants = await this.db.participants.toArray();
		for (const p of participants) {
			this.participants[p.pId] = p;
		}
	}

	async add(date: string, pId: number, presence: number): Promise<LocalPresenceRecord>
	{
		const record: LocalPresenceRecord = {
			date: date,
			pId: pId,
			presence: presence
		};
		this.records.unshift(record);
		record.id = await this.db.presence.put(record);

		return record;
	}

	async update(r: LocalPresenceRecord): Promise<void>
	{
		if (r.id) {
			await this.db.presence.put(r, r.id);
			//this.records = (await this.db.presence.toArray()).reverse();
		} else {
			throw "Cannot update record without ID";
		}
	}

	async delete(r: LocalPresenceRecord): Promise<void>
	{
		if (r.id) {
			await this.db.presence.delete(r.id);
			this.records = (await this.db.presence.toArray()).reverse();
		} else {
			throw "Cannot delete record without ID";
		}
	}

	// Remote storage

	loginSuccessful(data: ApiLoginResponse): void
	{
		console.info("DataService: loginSuccessful", data);
		this.needLogin = false;
		if (data.ciphertest && !this.needDataKey) {
			try {
				const plain = this.decrypt(data.ciphertest);
				if (plain == ciphertestPlaintext) {
					console.info("Decryption is working");
					this.needDataKey = false;
				} else {
					console.error("Error verifying challenge: expected", ciphertestPlaintext, "got", plain);
					this.needDataKey = true;
				}
			} catch (e) {
				console.error("Error decrypting challenge", e);
				this.needDataKey = true;
			}
		}
	}

	checkLogin(): Observable<any>
	{
		const result = this.http.get(environment.apiBase + '/login?an=' + environment.appName + '&av=' + environment.version, 
			{ withCredentials: true });
		result.subscribe((data: ApiLoginResponse) => {
			this.loginSuccessful(data);

		}, (error) => {
			if (error.status == 401) {
				if (error.error.user) {
					this.userName = error.error.user;
				}
			} else {
				console.error(error);
			}
			this.needLogin = true;
		});
		return result;
	}

	login(userName = this.userName, passphrase: string): Observable<any>
	{
		const result = this.http.post(environment.apiBase + '/login?an=' + environment.appName + '&av=' + environment.version, 
			{ user: userName, passphrase: passphrase, withCredentials: true });
		result.subscribe((data: ApiLoginResponse) => {
			this.loginSuccessful(data);

		}, (error) => {
			if (error.status == 401) {
				console.error("DataService: Unauthorized", error.error);
			} else {
				console.error(error);
			}
			this.needLogin = true;
		});
		return result;
	}

	setDataKey(dk: string)
	{
		this.dataKeyHash = SHA256(dk).toString();
		localStorage.setItem("dkh", this.dataKeyHash);
		this.needDataKey = false;
	}

	encrypt(plaintext: string): string
	{
		// returned ciphertext includes IV and salt
		let ciphertext = "";
		try {
			ciphertext = AES.encrypt(plaintext, this.dataKeyHash).toString();
		} catch (e) {
			console.error("Error encrypting text", e);
			throw e;
		}
		return ciphertext;
	}
	
	decrypt(ciphertext: string): string
	{
		let plaintext = "";
		try {
			plaintext = AES.decrypt(ciphertext, this.dataKeyHash).toString(enc.Utf8);
		} catch (e) {
			console.error("Error decrypting text", e);
			throw e;
		}
		return plaintext;
	}

	updateParticipants(): Observable<any>
	{
		const result = this.http.get(environment.apiBase + '/db/participants?an=' + environment.appName + '&av=' + environment.version);
		result.subscribe(async (data) => {
			await this.db.participants.clear();
			this.participants = {};
			const apiResponse = <ApiParticipant[]> data;
			apiResponse.forEach((ap) => {
				if (ap.data_enc && ap.id) {
					try {
						ap.data = JSON.parse(this.decrypt(ap.data_enc));
						if (ap.data) {
							const lp: LocalParticipantRecord = {
								pId: ap.id,
								name: ap.data.firstName + " " + ap.data.lastName
							}
							this.db.participants.put(lp, ap.id);
							this.participants[lp.pId] = lp;
						}
					} catch (e) {
						console.error("Error decrypting/parsing participant data", e);
					}
				}
			});
			
		}, (error) => {
			console.error(error);
		});
		return result;
	}

	uploadPresence(): Observable<void>
	{
		this.uploadSuccessCount = 0;
		this.uploadErrorCount = 0;
		this.statusUpload = "waiting";
		this.uploadDone = false;
		this.uploadErrorCode = 0;

		const result = new Observable<void>((subscriber) => {
			if (this.records.length > 0) {
				this.records.forEach((r) => {
					let body = {
						date: r.date,
						pId: r.pId,
						presence: r.presence
					}
					this.http.post(environment.apiBase + '/presence?an=' + environment.appName + '&av=' + environment.version, body).subscribe(
						async (response) => {
							// success
							r.synced = true;
							this.uploadSuccessCount += 1;
							if (this.uploadSuccessCount + this.uploadErrorCount == this.records.length) {
								await this.processUploadDone();
								subscriber.next();
							}
		
						}, async (response) => {
							// failure
							if (response) {
								this.uploadErrorCode = response.status;
							}
							this.uploadErrorCount += 1;
							if (this.uploadSuccessCount + this.uploadErrorCount == this.records.length) {
								await this.processUploadDone();
								subscriber.next();
							}
						}
					);
				});
			} else {
				this.statusUpload = "ok";
				this.uploadDone = true;
				subscriber.next();
			}
		});
		return result;
	}

	async processUploadDone(): Promise<void>
	{
		if (this.uploadSuccessCount > 0) {
			this.statusUpload = "ok";
			this.uploadDone = true;
			try {
				await this.removeSynced();
			} catch (e) {
				console.error("Error removing synced entries");
			}

		} else {
			this.statusUpload = "failed";
		}
	}

	resetUploadStatus(): void
	{
		this.uploadSuccessCount = 0;
		this.uploadErrorCount = 0;
		this.statusUpload = undefined;
		this.uploadDone = false;
		this.uploadErrorCode = 0;
	}

	async removeSynced(): Promise<void>
	{
		this.records.forEach(async (r) => {
			if (r.synced && r.id) {
				await this.db.presence.delete(r.id);
			}
		});
		this.records = (await this.db.presence.toArray()).reverse();
	}
}
