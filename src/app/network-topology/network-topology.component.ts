import { AfterViewInit, Component, ElementRef, HostListener, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-network-topology',
  templateUrl: './network-topology.component.html',
  styleUrls: ['./network-topology.component.css']
})

//This is the parent component used within the root component (app.component)
export class NetworkTopologyComponent implements OnInit {
  
  constructor() { 
    
  }

  ngOnInit(): void {
  }


}
