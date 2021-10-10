import { Component } from '@angular/core';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';

import { DataService, LocalPresenceRecord } from './data.service';
import { ModalAuthComponent } from './modals/modal-auth/modal-auth.component';
import { ModalEditComponent } from './modals/modal-edit/modal-edit.component';
import { ModalSyncComponent } from './modals/modal-sync/modal-sync.component';

@Component({
	selector: 'app-root',
	templateUrl: './app.component.html',
	styleUrls: ['./app.component.css']
})
export class AppComponent 
{
	version = '0.1';

	doFadeGreen = false;
	doFadeYellow = false;
	doFadeRed = false;
	timeout: any = 0;

	date = "1970-01-02";
	pId?: number = undefined;
	name?: string = undefined;
	presence = 1; // 1: present, 2: excused

	editModal?: NgbModalRef;
	authModal?: NgbModalRef;
	syncModal?: NgbModalRef;

	notificationSound: any;

	constructor (public data: DataService, private modalService: NgbModal)
	{
		this.notificationSound = new Audio("assets/sounds/success.mp3");
		
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
				this.name = this.data.participants[r.pId]?.name || "Unbekannt";
			});
		this.notificationSound.play();

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

		this.refocus();
	}

	refocus(): void
	{
		setTimeout(() => {
			const el = document.getElementById("pId");
			if (el != undefined && this.editModal == undefined && this.authModal == undefined && this.syncModal == undefined) {
				el.focus();
			}
		}, 0);
	}

	keyEvent(event: KeyboardEvent): void
	{
		if (event.key !== undefined) {
			if (event.key == "Tab") {
				this.submit();
			}
		
		} else if (event.keyCode !== undefined) {
			if (event.keyCode == 9) {
				this.submit();
			}
		}
	}

	// private getDismissReason(reason: ModalDismissReasons): string {
    //     if (reason === ModalDismissReasons.ESC) {
    //         return 'by pressing ESC';
    //     } else if (reason === ModalDismissReasons.BACKDROP_CLICK) {
    //         return 'by clicking on a backdrop';
    //     } else {
    //         return `with: ${reason}`;
    //     }
	// }

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
			this.editModal = undefined;
			this.refocus();
        }, (reason) => {
			//console.warn("edit(): " + `Dismissed ${this.getDismissReason(reason)}`);
			this.editModal = undefined;
			this.refocus();
        });
	}

	auth(): void
	{
		this.authModal = this.modalService.open(ModalAuthComponent, ModalAuthComponent.modalOptions);
		this.authModal.result.then((result) => {
			console.info("auth(): " + `Closed with: ${result}`);
			this.doSync();
			this.authModal = undefined;
			this.refocus();
		}, (reason) => {
			//console.warn("auth(): " + `Dismissed ${this.getDismissReason(reason)}`);
			this.authModal = undefined;
			this.refocus();
		});
	}

	prepareSync(): void 
	{
		this.data.checkLogin()
			.subscribe(() => {
				if (this.data.needDataKey) {
					this.auth();
				} else {
					this.doSync();
				}
			}, () => {
				this.auth();
			});
	}

	doSync(): void
	{
		this.syncModal = this.modalService.open(ModalSyncComponent, ModalSyncComponent.modalOptions);
		this.syncModal.result.then((result) => {
			console.info("doSync(): " + `Closed with: ${result}`);
			this.syncModal = undefined;
			this.refocus();
		}, (reason) => {
			//console.warn("doSync(): " + `Dismissed ${this.getDismissReason(reason)}`);
			this.syncModal = undefined;
			this.refocus();
		});
	}
}
