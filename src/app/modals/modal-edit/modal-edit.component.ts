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
