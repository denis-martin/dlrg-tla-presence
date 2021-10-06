import { Component } from '@angular/core';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { DataService, LocalPresenceRecord } from './data.service';
import { ModalEditComponent } from './modals/modal-edit/modal-edit.component';

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

	doFadeGreen = false;
	doFadeYellow = false;
	doFadeRed = false;
	timeout: any = 0;

	date = "1970-01-01";
	pId?: number = undefined;
	name?: string = undefined;
	presence = 1; // 1: present, 2: excused

	editModal?: NgbModalRef;

	constructor (public data: DataService, private modalService: NgbModal)
	{
		data.load();
		const now = new Date();
		this.date = String(now.getFullYear()) + '-' + String(now.getMonth()+1).padStart(2, "0") + '-' + String(now.getDate()).padStart(2, "0");
	}

	submit(): void
	{
		if (!this.pId) {
			return;
		}

		this.data.add(this.date, this.pId, this.presence)
			.then((r) => {
				this.name = r.name || "Unbekannt";
			});
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

	private getDismissReason(reason: ModalDismissReasons): string {
        if (reason === ModalDismissReasons.ESC) {
            return 'by pressing ESC';
        } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
            return 'by clicking on a backdrop';
        } else {
            return `with: ${reason}`;
        }
	}

	edit(r: LocalPresenceRecord): void
	{
		this.editModal = this.modalService.open(ModalEditComponent, ModalEditComponent.modalOptions);
		this.editModal.componentInstance.obj = r;
		this.editModal.result.then((result) => {
			console.info("edit(): " + `Closed with: ${result}`);
			if (result == 'delete') {
				this.data.delete(r);
			} else {
				this.data.update(r);
			}
        }, (reason) => {
			console.warn("edit(): " + `Dismissed ${this.getDismissReason(reason)}`);
        });
	}

	sync(): void {
		console.log("NYI: sync()");
	}
}
