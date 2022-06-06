import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import Graph from 'graphology';
import Sigma from 'sigma';

@Component({
  selector: 'app-sigma-vis',
  templateUrl: './sigma-vis.component.html',
  styleUrls: ['./sigma-vis.component.css']
})
export class SigmaVisComponent implements OnInit {

  // State for drag'n'drop
  public draggedNode: string | null = null;
  public isDragging = false;
  @Input() height = 1000;
  constructor() { }

  @ViewChild('sigmaContainer', {read: ElementRef, static: true}) sigmaContainer!: ElementRef<HTMLDivElement>;
  
  ngOnInit(): void {
    this.createNode();
  }
  public createNode() {
    let graph = new Graph();

    // Create a sample graph
    graph.addNode("n1", { x: 0, y: 0, size: 10, color: '#0000000', url:'https://cdn0.iconfinder.com/data/icons/30-hardware-line-icons/64/Server-128.png' });
    graph.addNode("n2", { x: -5, y: 5, size: 10, color: '#0000000', url:'https://cdn0.iconfinder.com/data/icons/30-hardware-line-icons/64/Server-128.png' });
    graph.addNode("n3", { x: 5, y: 5, size: 10, color: '#0000000', url:'https://cdn0.iconfinder.com/data/icons/30-hardware-line-icons/64/Server-128.png' });
    graph.addNode("n4", { x: 0, y: 10, size: 10, color: '#0000000', url:'https://cdn0.iconfinder.com/data/icons/30-hardware-line-icons/64/Server-128.png' });
    graph.addEdge("n1", "n2");
    graph.addEdge("n2", "n4");
    graph.addEdge("n4", "n3");
    graph.addEdge("n3", "n1");
    console.log('y', this.sigmaContainer.nativeElement)
    let renderer = new Sigma(graph, this.sigmaContainer.nativeElement);
    renderer.on("downNode", (e) => {
      this.isDragging = true;
      this.draggedNode = e.node;
      graph.setNodeAttribute(this.draggedNode, "highlighted", true);
    });
    renderer.getMouseCaptor().on("mousemovebody", (e) => {
      if (!this.isDragging || !this.draggedNode) return;
    
      // Get new position of node
      const pos = renderer.viewportToGraph(e);
    
      graph.setNodeAttribute(this.draggedNode, "x", pos.x);
      graph.setNodeAttribute(this.draggedNode, "y", pos.y);
    
      // Prevent sigma to move camera:
      e.preventSigmaDefault();
      e.original.preventDefault();
      e.original.stopPropagation();
    });
    
    // On mouse up, we reset the autoscale and the dragging mode
    renderer.getMouseCaptor().on("mouseup", () => {
      if (this.draggedNode) {
        graph.removeNodeAttribute(this.draggedNode, "highlighted");
      }
      this.isDragging = false;
      this.draggedNode = null;
    });
    
    // Disable the autoscale at the first down interaction
    renderer.getMouseCaptor().on("mousedown", () => {
      if (!renderer.getCustomBBox()) renderer.setCustomBBox(renderer.getBBox());
    });
  }
}
