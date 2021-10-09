import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { ServiceWorkerModule } from '@angular/service-worker';
import { HttpClientModule } from '@angular/common/http';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';

import { AppComponent } from './app.component';
import { DataService } from './data.service';

import { environment } from '../environments/environment';
import { ModalEditComponent } from './modals/modal-edit/modal-edit.component';
import { ModalAuthComponent } from './modals/modal-auth/modal-auth.component';
import { ModalSyncComponent } from './modals/modal-sync/modal-sync.component';

@NgModule({
  declarations: [
    AppComponent,
    ModalEditComponent,
    ModalAuthComponent,
    ModalSyncComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ServiceWorkerModule.register('ngsw-worker.js', {
      enabled: environment.production,
      // Register the ServiceWorker as soon as the app is stable
      // or after 30 seconds (whichever comes first).
      registrationStrategy: 'registerWhenStable:30000'
    }),
    HttpClientModule,
    NgbModule,
  ],
  providers: [DataService],
  bootstrap: [AppComponent]
})
export class AppModule { }
