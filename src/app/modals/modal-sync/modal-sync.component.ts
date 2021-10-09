import { Component, OnInit } from '@angular/core';
import { NgbActiveModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { Observable } from 'rxjs';
import { DataService } from 'src/app/data.service';

@Component({
	selector: 'app-modal-sync',
	templateUrl: './modal-sync.component.html',
	styleUrls: ['./modal-sync.component.css']
})
export class ModalSyncComponent implements OnInit
{
	// presence upload
	errorCode?: number;
	done = false;
	canceled = false;

	// participant update
	statusDataSync?: string;
	dataSyncError?: string;

	// software update
	statusUpdate?: string;
	updateError?: string;

	static readonly modalOptions: NgbModalOptions = {
		size: "md"
	}

	constructor(public data: DataService, private activeModal: NgbActiveModal) { }

	ngOnInit(): void {
	}

	ok(): void
	{
		this.activeModal.close('ok');
		this.data.resetUploadStatus();
	}

	cancel(): void
	{
		this.activeModal.close('cancel');
	}

	sync(): void
	{
		console.info("Uploading presence...");
		this.data.uploadPresence().subscribe(() => {
			console.info("Upload done.");
			this.done = this.data.uploadDone;
			this.errorCode = this.data.uploadErrorCode;

			if (!this.data.needDataKey) {
				this.syncParticipants()
					.subscribe(() => {
						this.checkForUpdates();
					}, (err) => {
						this.checkForUpdates();
					});
			} else {
				this.checkForUpdates();
			}
		});
	}

	syncParticipants(): Observable<any>
	{
		console.info("Downloading participants...");
		this.statusDataSync = "waiting";
		const result = this.data.updateParticipants();
		result.subscribe(() => {
			console.info("Download done.");
			this.statusDataSync = "ok";
		}, (err) => {
			this.statusDataSync = "failed";
			this.dataSyncError = err;
		});
		return result;
	}

	checkForUpdates(): void
	{
		console.info("Checking for updates...");
		this.statusUpdate = "waiting";
		this.data.swUpdate.checkForUpdate()
			.then(() => {
				console.info("Update check done.");
				this.statusUpdate = "ok";
			})
			.catch((err) => {
				console.error("Error checking for software updates", err);
				this.updateError = err;
				this.statusUpdate = "failed";
			})
	}

	update(): void
	{
		console.info("Applying update...");
		this.data.swUpdate.activateUpdate()
			.then(() => document.location.reload())
			.catch((err) => console.error("Error applying update:", err));
	}

}
