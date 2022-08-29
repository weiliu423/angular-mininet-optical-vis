import { CUSTOM_ELEMENTS_SCHEMA, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { NetworkTopologyComponent } from './network-topology/network-topology.component';
import { SigmaVisComponent } from './sigma-vis/sigma-vis.component';
import { D3VisComponent } from './d3-vis/d3-vis.component';
import { HttpClientModule } from '@angular/common/http';
import { D3NetworkComponent } from './d3-network/d3-network.component';
import { environment } from 'src/environments/environment';
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFirestoreModule } from '@angular/fire/compat/firestore';
import { NotifierModule, NotifierOptions } from 'angular-notifier';
import { DialogComponent, DialogData } from './dialog/dialog.component';
import { MaterialExampleModule } from './material.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations'; 

const customNotifierOptions: NotifierOptions = {
  position: {
		horizontal: {
			position: 'right',
			distance: 12
		},
		vertical: {
			position: 'top',
			distance: 12,
			gap: 10
		}
	},
  theme: 'material',
  behaviour: {
    autoHide: 5000,
    onClick: 'hide',
    onMouseover: 'pauseAutoHide',
    showDismissButton: true,
    stacking: 4
  },
  animations: {
    enabled: true,
    show: {
      preset: 'slide',
      speed: 300,
      easing: 'ease'
    },
    hide: {
      preset: 'fade',
      speed: 300,
      easing: 'ease',
      offset: 50
    },
    shift: {
      speed: 300,
      easing: 'ease'
    },
    overlap: 150
  }
};

@NgModule({
  declarations: [
    AppComponent,
    NetworkTopologyComponent,
    SigmaVisComponent,
    D3VisComponent,
    D3NetworkComponent,
    DialogComponent,
    DialogData
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule,
    NotifierModule.withConfig(customNotifierOptions),
    MaterialExampleModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    FormsModule
  ],
  providers: [HttpClientModule],
  bootstrap: [AppComponent ],
  schemas:[CUSTOM_ELEMENTS_SCHEMA],
})
export class AppModule { }
