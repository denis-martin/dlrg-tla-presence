import { Component } from '@angular/core';

interface LocalRecord {
	date: string,
	pId: number,
	presence: number,
	name?: string
}

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent 
{
	version = '0.1';
	needLogin = true;
	needDataKey = true;
	records: Array<LocalRecord> = [];

	doFadeGreen = false;
	doFadeYellow = false;
	doFadeRed = false;
	timeout: any = 0;

	date = "1970-01-01";
	pId?: number = undefined;
	name?: string = undefined;
	presence = 1; // 1: present, 2: excused

	constructor () {
		const now = new Date();
		this.date = String(now.getFullYear()) + '-' + String(now.getMonth()+1).padStart(2, "0") + '-' + String(now.getDate()).padStart(2, "0");
		console.log(this.date, now, now.getDay(), now.getMonth(), now.getFullYear());
	}

	add(date: string, pId: number, presence: number): LocalRecord
	{
		let name: string | undefined = undefined;
		// TODO: fetch name from list

		const record: LocalRecord = {
			date: date,
			pId: pId,
			presence: presence,
			name: name
		};
		this.records.push(record);

		return record;
	}

	submit(): void
	{
		if (!this.pId) {
			return;
		}

		const r = this.add(this.date, this.pId, this.presence);
		this.name = r.name || "Unbekannt";
		//navigator.notification.beep(1);

		this.pId = undefined;

		clearTimeout(this.timeout);
		this.doFadeRed = false;
		this.doFadeGreen = false;
		this.doFadeYellow = false;
		setTimeout(() => {
			this.doFadeRed = this.presence == 0;
			this.doFadeGreen = this.presence == 1;
			this.doFadeYellow = this.presence == 2;
			this.timeout = setTimeout(() => {
				this.doFadeRed = false;
				this.doFadeGreen = false;
				this.doFadeYellow = false;
			}, 3000);
		}, 20);

		setTimeout(() => { this.refocus(); }, 0);
	}

	refocus(): void
	{
		setTimeout(() => {
			//if (!DlrgScanner.uiAuthOpened && !DlrgScanner.uiEditOpened && !DlrgScanner.uiSyncOpened) {
				document.getElementById("pId")?.focus();		
			//}
		}, 0);
	}

	sync(): void {
		console.log("NYI: sync()");
	}
}
