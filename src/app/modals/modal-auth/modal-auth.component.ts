import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NgbActiveModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';

import { DataService } from 'src/app/data.service';

@Component({
	selector: 'app-modal-auth',
	templateUrl: './modal-auth.component.html',
	styleUrls: ['./modal-auth.component.css']
})
export class ModalAuthComponent implements OnInit 
{
	static readonly modalOptions: NgbModalOptions = {
		size: "md"
	}

	userName = "Scanner";
	passphrase = "";
	dataKey = "";

	thinking = false;
	authFailed = false;
	authSuccess = false;
	decFailed = false;
	serverFailure = 0;

	constructor(public data: DataService, private http: HttpClient, private activeModal: NgbActiveModal) { }

	ngOnInit(): void 
	{
		this.thinking = true;
		this.data.checkLogin()
			.subscribe(() => {
				console.log("ModalAuth: Already logged in");
				this.loginSuccessful();
			}, () => {
				this.thinking = false;
				this.authSuccess = false;
				this.authFailed = false;
				this.decFailed = false;
			})
	}

	loginSuccessful(skipDatakey = false): void
	{
		this.thinking = false;
		this.authSuccess = true;
		if (!this.data.needDataKey || skipDatakey) {
			this.dataKey = "";
			this.passphrase = "";
			if (this.activeModal) {
				this.activeModal.close('ok');
			}
		} else {
			this.decFailed = true;
		}
	}

	loginFailed(error: any): void
	{
		this.thinking = false;
		console.log("ModalAuth login failed", error);
		if (error.status == 401) {
			this.authFailed = true;
		} else {
			this.serverFailure = error.status;
		}
	}

	ok(skipDatakey = false): void
	{
		this.thinking = true;
		this.authFailed = false;
		this.decFailed = false;
		if (!skipDatakey && this.data.needDataKey && this.dataKey) {
			this.data.setDataKey(this.dataKey);
		}
		if (this.data.needLogin) {
			this.data.login(this.data.userName, this.passphrase)
				.subscribe((data) => {
					console.log("ModalAuth: Success", data);
					this.loginSuccessful(skipDatakey);
					
				}, (error) => {
					this.loginFailed(error);
				});
		} else {
			this.data.checkLogin()
				.subscribe(() => {
					console.log("ModalAuth: Already logged in");
					this.loginSuccessful(skipDatakey);
					
				}, (error) => {
					this.loginFailed(error);
				});
		}	
	}

	cancel(): void
	{
		this.activeModal.close('cancel');
	}

}
