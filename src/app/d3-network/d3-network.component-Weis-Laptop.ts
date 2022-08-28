import { Component, OnInit, ViewChild, ElementRef  } from '@angular/core';
import { setPriority } from 'os';
var d3 = require("d3");

@Component({
  selector: 'app-d3-network',
  templateUrl: './d3-network.component.html',
  styleUrls: ['./d3-network.component.css']
})
export class D3NetworkComponent implements OnInit {

  constructor() {
    
  }
  @ViewChild('graphContainer', {read: ElementRef, static: true}) graphContainer!: ElementRef<HTMLDivElement>;
  ngOnInit() {
    
    this.createSvg()
  }
   width = 1800;
  height = 1800;
  margin = {
    top: 5, 
    bottom: 50, 
    left: 0, 
    right: 75
  };
  colors = d3.scaleOrdinal(d3.schemeCategory10);
  @ViewChild("graphContainer", { read: ElementRef, static: true })
  svgContainerRef!: ElementRef<HTMLDivElement>;
  svg: any;
  force: any;
  path: any;
  circle: any;
  drag: any;
  text : any;
  dragLine: any;
  simulation : any;
  link : any;
  node : any;
  color : any;
  grap1 : any;
  firstLinks : any;
  div: any;
createSvg(){

   //	load and save data
   d3.json("https://raw.githubusercontent.com/weiliu423/DM_assignment2/bb55d7de7017778d5640e124455a6e3ff4d6801c/data1.json", (err : any, g: any) => {
    if (err) throw err;

    console.log(g)
    this.grap1 = g;

  this.svg = d3.select(this.svgContainerRef.nativeElement).attr('width', this.width + this.margin.left + this.margin.right)
  .attr('height', this.height + this.margin.top + this.margin.bottom),

  //	d3 color scheme
  this.color = d3.scaleOrdinal(d3.schemeCategory20);


  //	simulation initialization
  this.simulation = d3.forceSimulation(this.grap1.nodes)
    .force("link", d3.forceLink().id((d : any) => { return d.id; }))
    .force("charge", d3.forceManyBody())
    .force("center", d3.forceCenter(this.width / 2, this.height / 2));

    this.link = this.svg.selectAll('.link')
    .append('g')
    .data(this.grap1.links2)
    .enter().append('line')
    .attr('class', 'link').attr("fill", (d : any) => {return this.color(d.group);});
    this.node = this.svg.selectAll('.node')
    .append('g')
    .data(this.grap1.nodes)
    .enter().append('circle')
    .attr('r', 15)
    .attr('class', 'node').attr("fill", (d : any) => {return this.color(d.group);});
  
  
    //	Set nodes, links, and alpha target for simulation
    this.simulation
      .nodes(this.grap1.nodes)
      .on("tick", this.ticked());
  
    this.simulation.force("link")
        .links(this.grap1.links2);
    });
 
 
}


//	tick event handler (nodes bound to container)
ticked() {
  console.log("in here")
	this.link
		.attr("x1", (d : any) => { return this.grap1.nodes[d.source].x * -21; })
		.attr("y1", (d : any) => { return this.grap1.nodes[d.source].y * 1; })
		.attr("x2", (d : any) => { return this.grap1.nodes[d.target].x * 1; })
		.attr("y2", (d : any) => { return this.grap1.nodes[d.target].y * 1; });

	this.node
		.attr("cx", (d : any) => { return d.x * -20; })
		.attr("cy", (d : any) => { return d.y * -20; })
}
  
}