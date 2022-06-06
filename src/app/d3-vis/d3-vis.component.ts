import { Component, ElementRef, HostListener, Input, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { ScaleBand } from 'd3';
import { DataNetwork } from '../models/data-network.model';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-d3-vis',
  templateUrl: './d3-vis.component.html',
  styleUrls: ['./d3-vis.component.css']
})
export class D3VisComponent implements OnInit {
  data: {name: string, series: { name: string, value: number }[] }[];
  barColor = ['#a9ce97', '#a5b5de'];
  domain = [100, 1000];
  @Input() height = 1000;
  @Input() margin = {top: 10, left: 50, right: 10, bottom: 20};
  @Input() innerPadding = 0.1;
  @Input() outerPadding = 0.1;
  @Input() seriesInnerPadding = 0.1;
  @Input() barColors = ['#00aeef', '#f98e2b', '#7C77AD'];
  public svg!: d3.Selection<SVGGElement, unknown, null, undefined>;
  public isRendered = false;
  private _jsonURL = 'https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/data_network.json';
  public networkData!: DataNetwork;

  constructor(private http: HttpClient) { 
    this.getJSON().subscribe(data => {
      console.log(data);
      this.networkData = data;
      this.createNode();
     });
    this.data = [
      {
        name: 'Row1',
        series: [
          {name: 'Bar1', value: 150},
          {name: 'Bar2', value: 200}
        ],
      },
      {
        name: 'Row2',
        series: [
          {name: 'Bar1', value: 300},
          {name: 'Bar2', value: 400}
        ],
      },
      {
        name: 'Row3',
        series: [
          {name: 'Bar1', value: 500},
          {name: 'Bar2', value: 1000}
        ],
      }
    ];
  }
  @ViewChild('svgContainer', {read: ElementRef, static: true}) svgContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild('my_dataviz', {read: ElementRef, static: true}) my_datavizRef!: ElementRef<HTMLDivElement>;

  ngOnInit(): void {
  }

  ngAfterContentInit() {
    //this.createChart();
  }
  ngAfterViewInit(): void {
    //this.createChart();
    this.isRendered = true;
  }

  private isDataValid(): boolean {
    return this.data && this.data.length > 0;
  }
  
  private getBandScale(domain: string[], range: any, innerPadding = 0, outerPadding = 0) {
    const scale: any | ScaleBand<string> = d3.scaleBand()
      .range(range)
      .domain(domain)
      .paddingInner(innerPadding)
      .paddingOuter(outerPadding);
    scale.type = 'BAND';
    return scale;
  }
  
  private createChart(): void {
    if (!this.isRendered) {
      this.createSVG();
    }
    if (this.isDataValid()) {
      const margin = {
        top: this.margin.top,
        right: this.margin.right,
        bottom: this.margin.bottom,
        left: this.margin.left,
      }
  
      let height = this.height - margin.top - margin.bottom;
      const width = this.svgContainerRef.nativeElement.getBoundingClientRect().width - margin.left - margin.right;
      const groupNames = this.data.map(item => item.name);
      const groupLabels = this.data.length > 0 ? this.data[0].series.map(item => item.name) : [];
  
      const xScale = this.getBandScale(groupNames, [0, width], this.innerPadding, this.outerPadding).round(true);
      const x1Scale = this.getBandScale(groupLabels, [0, xScale.bandwidth()], this.seriesInnerPadding, this.outerPadding).round(true);
  
      let chartContainer = this.svg.selectAll<SVGGElement, number>('g.chart-container').data([1]);
      chartContainer = chartContainer.enter()
        .append('g')
        .attr('class', 'chart-container')
        .merge(chartContainer)
        .attr('transform', `translate(${margin.left}, ${margin.right})`);
  
      let chartWrap = chartContainer.selectAll<SVGGElement, number>('g.chart-wrap').data([1]);
      chartWrap = chartWrap.enter()
        .append('g')
        .attr('class', 'chart-wrap')
        .merge(chartWrap)
        .attr('transform', 'translate(0, 0)');
  
      const xAxis = chartWrap.selectAll<SVGGElement, number>('g.x-axis').data([1]);
      xAxis.enter()
        .append('g')
        .attr('class', 'x-axis')
        .merge(xAxis)
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale)).selectAll('text')
        .style('text-anchor', 'middle');
  
      const y = d3.scaleLinear().domain(this.domain).nice().rangeRound([height, 0]);
  
      let barWrap = chartWrap.selectAll<SVGGElement, number>('g.bar-wrap').data([1]);
      barWrap.exit().remove();
      barWrap = barWrap.enter().append('g')
        .attr('class', 'bar-wrap')
        .merge(barWrap);
  
      let barGroup = barWrap.selectAll<SVGGElement, {name: string, series: {name: string, value: number}}>('g.bar-group').data(this.data);
      barGroup.exit().remove();
      barGroup = barGroup.enter().append('g')
        .attr('class', 'bar-group')
        .merge(barGroup)
        .attr('transform', d => `translate(${xScale(d.name)}, 0)`);
  
      let barRects = barGroup.selectAll<SVGRectElement, {name: string, value: number}>('rect.bar').data(d => d.series.map(item => item));
      barRects.enter()
        .append('rect')
        .merge(barRects)
        .attr('class', 'bar')
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => height - y(d.value))
        .attr('x', (d: any) => x1Scale(d.name))
        .attr('y', d => y(d.value))
        .attr('fill', (d, i) => this.barColors[i]);
  
      let yAxis = chartWrap.selectAll<SVGGElement, number>('g.y-axis').data([1]);
      yAxis.enter()
        .append('g')
        .attr('class', 'y-axis')
        .merge(yAxis)
        .call(d3.axisLeft(y));
    }
  }

  private createSVG(): void {
    this.svg = d3.select(this.svgContainerRef.nativeElement)
      .append('svg')
      .attr('width', '100%')
      .attr('height', this.height)
      .append('g')
      .attr('width', '100%')
      .attr('transform', 'translate(0, 0)')
      .attr('class', 'bar-chart-vertical');
  }
  
  // set the dimensions and margins of the graph
  public width = 1000;
  public heights = 1000;
  simulation: any;
  public createNode(){
    // append the svg object to the body of the page
    let svgs = d3.select(this.my_datavizRef.nativeElement)
    .append("svg")
    .attr("width", this.width)
    .attr("height", this.heights)
    .append("g")
    .attr("transform",
          `translate(${this.margin.left+101}, ${this.margin.top+400})`);

    //Initialize the links
    const link = svgs
      .selectAll("line")
      .data(this.networkData.links)
      .join("line")
        .style("stroke", "#aaa")

    // Initialize the nodes
    const node = svgs
      .selectAll("circle")
      .data(this.networkData.nodes)
      .join("circle")
        .attr("r", 20)
        .style("fill", "#69b3a2")
    let nodess = this.networkData.nodes.map((i) => ({
          id: i.id,
          name: i.name,
    }));
    let nodes = [{}, {}, {}, {}]
    // Let's list the force we wanna apply on the network
    this.simulation = d3.forceSimulation(nodes)                 // Force algorithm is applied to data.nodes
        .force("link", d3.forceLink()                               // This force provides links between nodes
              .id((d:any) => d.id)                  // This provide  the id of a node
              .links(this.networkData.links)                                    // and this the list of links
        )
        .force("charge", d3.forceManyBody())         // This adds repulsion between nodes. Play with the -400 for the repulsion strength
        .force("center", d3.forceCenter(this.width / 2, this.height / 2))     // This force attracts nodes to the center of the svg area
        .on("end", ticked);

    // // This function is run at each iteration of the force algorithm, updating the nodes position.
    function ticked() {
      link
          .attr("x1", (d: any) =>  d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

      node
          .attr("cx", (d: any) => d.x+6)
          .attr("cy", (d: any) => d.y-6);
    }

  }
  
  public getJSON(): Observable<DataNetwork> {
    return this.http.get<DataNetwork>(this._jsonURL);
  }
}
