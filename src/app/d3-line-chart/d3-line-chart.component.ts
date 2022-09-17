import { Component, OnInit, ViewChild, ElementRef, Input, SimpleChanges  } from '@angular/core';

var d3 = require("d3");
var d3Scale = require("d3-scale");
var d3Shape = require("d3-shape");
var d3Array = require("d3-array");
var d3Axis = require("d3-axis");

@Component({
  selector: 'app-d3-line-chart',
  templateUrl: './d3-line-chart.component.html',
  styleUrls: ['./d3-line-chart.component.css']
})
export class D3LineChartComponent implements OnInit {

  @ViewChild('graphContainer', {read: ElementRef, static: true}) graphContainer!: ElementRef<HTMLDivElement>;

  @Input() channelData: any;
  public activeField: number;
  public dataFields: string[] = ['Input', 'Output'];
  public chartData: any;
  private host: any;
  private svg: any;
  private htmlElement: HTMLElement;
  public data: any[] = [];

  private margin = { top: 10, right: 10, bottom: 15, left: 25 };
  public width!: number;
  public height!: number;
  private x: any;
  private y: any;
  private line: any; // this is line definition
  public g: any;

  constructor(public elRef: ElementRef) {
    this.htmlElement = this.elRef.nativeElement;
    this.chartData = {data: [], channelName: ''};
    this.activeField = 0;
  }

  ngOnInit(): void {
    this.setup();
    this.updateGraphData();
  }
  ngOnChanges(changes: SimpleChanges) {
    // changes.prop contains the old and the new value...
    console.log(changes)
  }
  /**
   * Kick off all initialization processes
   */
  private setup(): void {
    this.chartData.data = this.channelData[0].observations;
    this.chartData.channelName = this.channelData[0].channelName.toLocaleUpperCase(); 
    this.buildSvg();
  }

  /**
   * Configures the SVG element
   */
  private buildSvg(): void {
    this.host = d3.select(this.htmlElement);
    let svgElement: any = this.htmlElement.getElementsByClassName('svg-chart')[0];
    
    // Do some automatic scaling for the chart
    this.width = svgElement.clientWidth - this.margin.left - this.margin.right;
    this.height = svgElement.clientHeight * 0.90 - this.margin.top - this.margin.bottom;
    this.svg = this.host.select('svg')
      .append('g')
      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');

    this.svg
      .append("text")
      .text(this.chartData.channelName) // set watermark
      .attr("y", "50%") // set the location of the text with respect to the y-axis
      .attr("x", "40%") // set the location of the text with respect to the x-axis
      .style("fill", "#0000AA") // set the font color
      .style("font-size", "2.3em")
      .style("font-weight", "bold")
      .attr("alignment-baseline", "middle")
      .attr("text-anchor", "middle")
  }

  /**
   * Execute the methods necessary to update the graph with 
   * the data retrieved from the JSON file
   * @param obsData
   */
  public updateGraphData(): void {
    // Iterate to the next set of available data
    this.activeField++;
    if (this.activeField >= this.dataFields.length){
      this.activeField = 0;
    }

    // Remove the current line form the chart
    this.clearChartData();
    
    // Build the data array for chart where the values of 
    // interest are put date and value fields
    this.data = this.buildChartData();

    // Configuring line path
    this.configureYaxis();
    this.configureXaxis();

    // Create the line for the chart and add it 
    this.drawLineAndPath();
  }

  /**
   * Removes all lines and axis from the chart so we can
   * create new ones based on the data
   */
  private clearChartData(): void {
    if (this.chartData !== null) {
      this.svg.selectAll('g').remove();
      this.svg.selectAll('path').remove();
    }
  }
  
/**
   * Creates the chart data array by selecting the
   * appropriate data based on the user selection
   * value property
   */
  private buildChartData(): any[] {
    let data: any = [];

    // Populate X and Y data used
    if (this.chartData != null
      && this.chartData.data != null) {
      let value: any = null;
      if (this.activeField === 0){
        this.chartData.data['Input'].forEach((d:any, index:any) => {
          value = d.power;
          if (value !== null) {
            data.push(
              {
                index: index,
                link: d.link,
                value: value
              });
          }
        })
      }
      else if (this.activeField === 1){
        this.chartData.data['Output'].forEach((d:any, index:any) => {
    
          value = d.power;
          if (value !== null) {
            data.push(
              {
                index: index,
                link: d.link,
                value: value
              });
          }
        })
      }
    }

    return data;
  }
  
  /**
   * Configures the Y-axis based on the data values
   */
  private configureYaxis(): void {
    // range of data configuring
    let yRange: any[] = d3Array.extent(this.data, (d:any) => d.value);
    // If we have data then make the Y range one less than the
    // smallest value so we have space between the bottom-most part
    // of the line and the X-axis
    if (yRange && yRange.length > 1
      && yRange[0] !== yRange[yRange.length - 1]) {
      yRange[0] -= 1;
    }
    this.y = d3Scale.scaleLinear()
      .range([this.height, 0])
      .domain(yRange);

  }

  /**
   * Configures the X-axis based on the node
   */
  private configureXaxis(): void {
    // range of data configuring, in this case we are
    // showing data over each router and link
    this.x = d3Scale.scaleBand()
      .rangeRound([0, this.width]).padding(1)

    this.g = this.svg.append("g")
    .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

    this.svg.append("text")
      .attr("class", "x label")
      .attr("text-anchor", "end")
      .style("fill", "red")
      .attr("x", this.width)
      .attr("y", this.height - 6)
      .text("Link Path (Index)");
  }

  /**
   * Configures and draws the line on the graph
   */
  private drawLineAndPath() {
    // Create a line based on the X and Y values (link and value)
    // from the data
    let line = d3.line()
      .x((d: any) => this.x(d.link))
      .y((d: any) => this.y(d.value));

    // Map x-axis with each data link value
    this.x.domain(this.data.map((d :any) => { return d.link; }))

    // X-axis styling
    this.g.append("g")
    .attr("class", "axis axis--x")
    .attr('transform', 'translate(0,' + this.height + ')')
    .call(d3Axis.axisBottom(this.x)).style("font-size", "0.8em");

    // Add line and text styling
    this.g.append("g")
      .attr("class", "axis axis--y")
      .call(d3Axis.axisLeft(this.y)).style("font-size", "1.0em")
      .append("text")
      .attr("transform", "rotate(-90)")
      .attr("class", "y label")
      .style("fill", "red")
      .attr("text-anchor", "end")
      .attr("y", 6)
      .attr("dy", ".75em")
      .text("Power (dbm)");

    // Add path line for the graph and style the line 
    this.g.append("path")
    .datum(this.data)
    .attr("class", "line")
    .attr("fill", "none")
    .attr("stroke", "orange")
    .attr("stroke-width", 3)
    .attr("stroke-linejoin", "round")
    .attr("stroke-linecap", "round")
    .attr("d", line);

    // Style the circle for the path link and map x and y coordinate of the circle
    this.g.selectAll("circle")
      .data(this.data)
      .enter().append("circle")
        .attr("class", "circle")
        .attr("cx", (d: any) => this.x(d.link))
        .attr("cy", (d: any) => this.y(d.value))
        .attr("r", 6);

  }

  //Update line chart when a new channel is selected
  public updatedData(data: any){
    this.channelData = data;
  }
  //Calculation on path length and map to x cordinate
  correctXScale(d:any){
    return this.x(d.link) + this.width / this.data.length / 2;
  }
}
