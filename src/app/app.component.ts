import { Component, ViewChild } from '@angular/core';
import { NgbModal, ModalDismissReasons, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerComponent } from '@zxing/ngx-scanner';

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

	qrCodeMode = false;
	allowedCodeFormats = [ BarcodeFormat.QR_CODE ];
	
	@ViewChild('qrscanner', { static: false })
	qrscanner!: ZXingScannerComponent;
	cameraPermitted?: boolean;
	cameras?: MediaDeviceInfo[];
	pIdLastScanned = 0;

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

	getClassPayed(): Record<string, boolean>
	{
		const result: Record<string, boolean> = {
			'no': !!this.name && this.data.records.length > 0 && !this.data.participants[this.data.records[0].pId]?.chargePayedAt, 
			'yes': !!this.name && this.data.records.length > 0 && !!this.data.participants[this.data.records[0].pId]?.chargePayedAt,
			'unknown': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.chargePayedAt == undefined
		}
		return result;
	}

	getClassHealthDeclared(): Record<string, boolean>
	{
		const result: Record<string, boolean> = {
			'no': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.healthDeclared == 0, 
			'yes': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.healthDeclared == 1, 
			'unknown': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.healthDeclared == undefined
		}
		return result;
	}

	getClassCovid19Vac(): Record<string, boolean>
	{
		const result: Record<string, boolean> = {
			'no': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.covid19Vac == 0, 
			'yes': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.covid19Vac == 1, 
			'unknown': !!this.name && this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.covid19Vac == undefined
		}
		return result;
	}

	toggleQrcodeMode(): void
	{
		this.qrCodeMode = !this.qrCodeMode;
		if (!this.qrCodeMode) {
			this.refocus();
		}
	}

	qrCodeCamerasFound(videoDrivers: MediaDeviceInfo[]): void
	{
		console.info("qrCodeCamerasFound", videoDrivers);
		this.cameras = videoDrivers;
	}

	qrCodeNoCamerasFound(): void
	{
		console.error("qrCodeNoCamerasFound");
		this.cameras = [];
	}

	qrCodePermissionResponse(permitted: boolean): void
	{
		console.info("qrCodePermissionResponse", permitted);
		this.cameraPermitted = permitted;
	}

	qrCodeScanSuccess(event: string): void
	{
		console.info("qrCodeScanSuccess", event);
		const pId = parseInt(event);
		if (pId != NaN && pId in this.data.participants) {
			if (this.pIdLastScanned != pId) {
				this.pId = pId;
				this.submit();
				this.pIdLastScanned = pId;
			}
		}
	}

	qrCodeScanError(event: any): void
	{
		console.error("qrCodeScanError", event);
	}

	cycleCamera(): void
	{
		let currentDevice = this.qrscanner.device;
		if (!currentDevice || !this.cameras || this.cameras.length < 2) {
			return;
		}
		let i = 0;
		for (let d of this.cameras) {
			if (d.deviceId == currentDevice.deviceId) {
				break;
			}
			i += 1;
		}
		if (i < this.cameras.length) {
			i = (i + 1) % this.cameras.length;
			this.qrscanner.device = this.cameras[i];
			console.info("Changing from camera device", currentDevice.deviceId, "to device", this.cameras[i].deviceId);
		} else {
			console.error("Current device not found in our camera list!", currentDevice, this.cameras);
		}
	}
}
