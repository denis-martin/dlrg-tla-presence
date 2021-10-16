import { Component, OnInit } from '@angular/core';
import { NgbModalOptions, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { DataService, LocalPresenceRecord } from 'src/app/data.service';

@Component({
	selector: 'app-modal-edit',
	templateUrl: './modal-edit.component.html',
	styleUrls: ['./modal-edit.component.css']
})
export class ModalEditComponent implements OnInit 
{
	obj?: LocalPresenceRecord;
	objClone?: LocalPresenceRecord;

	get payed(): boolean {
		return this.data.records.length > 0 && !!this.data.participants[this.data.records[0].pId]?.chargePayedAt;
	}

	get healthDeclared(): boolean {
		return this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.healthDeclared == 1;
	}

	get covid19Vac(): boolean {
		return this.data.records.length > 0 && this.data.participants[this.data.records[0].pId]?.covid19Vac == 1;
	}

	static readonly modalOptions: NgbModalOptions = {
		size: "md"
	}

	constructor(public data: DataService, private activeModal: NgbActiveModal) { }

	ngOnInit(): void
	{
		console.log("ModalEditComponent.ngOnInit", this.obj);
		this.objClone = Object.assign({}, this.obj);
	}

	ok(): void
	{
		Object.assign(this.obj, this.objClone);
		this.activeModal.close('ok');
	}

	delete(): void
	{
		Object.assign(this.obj, this.objClone);
		this.activeModal.close('delete');
	}
}
