import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

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
@NgModule({
  declarations: [
    AppComponent,
    NetworkTopologyComponent,
    SigmaVisComponent,
    D3VisComponent,
    D3NetworkComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    AngularFireModule.initializeApp(environment.firebase),
    AngularFirestoreModule
  ],
  providers: [HttpClientModule],
  bootstrap: [AppComponent]
})
export class AppModule { }
