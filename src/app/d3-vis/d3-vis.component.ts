import {
    Component,
    ElementRef,
    HostListener,
    Input,
    OnInit,
    SimpleChanges,
    ViewChild,
  } from "@angular/core";
  var d3 = require("d3");
  var D3Tip = require("../../assets/d3-tip.js");
  import { links, topo } from "../models/data-network.model";
  import { HttpClient } from "@angular/common/http";
  import { Observable } from "rxjs";
  
  @Component({
    selector: "app-d3-vis",
    templateUrl: "./d3-vis.component.html",
    styleUrls: ["./d3-vis.component.css"],
  })
  export class D3VisComponent implements OnInit {
    public isRendered = false;
    private _jsonURL =
      "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/data_network.json";
    public networkData!: topo;
    public linksArray: links[] = [];
    public selData: any;

    constructor(private http: HttpClient) {
    //   this.getJSON().subscribe((data) => {
    //     console.log(data);
    //     this.networkData = data;
    //   });
    }
  
    @ViewChild("topo_container", { read: ElementRef, static: true })
    svgContainerRef!: ElementRef<HTMLDivElement>;
  
    ngOnInit(): void {
      this.initialize_topo();
      this.load();
      this.nodefileParse();
      this.linkfileParse();
    }
  
    ngAfterContentInit() {
      //this.createChart();
    }
    ngAfterViewInit(): void {
      //this.createChart();
      this.isRendered = true;
    }
  
    public topo: any; // keep track of topo.
    public animated: boolean = false; // animated or static
    public svg: any;
    public src_node: any;
    public dst_node: any;
    public simulation: any;
    public sourceName: any;
    public sourcePort : any;
    public targetPort: any;
    public target: any;
    public portStatus: any;

    //#region Initial Load/Layout Methods
    initialize_topo() {
      /*
            create container for links and nodes elements.
        */
      this.svg = d3.select(this.svgContainerRef.nativeElement);
  
      let links = this.svg.select("g.links");
      if (!links.size()) {
        links = this.svg.append("g").attr("class", "links");
      }
  
      let nodes = this.svg.select("g.nodes");
      if (!nodes.size()) {
        nodes = this.svg.append("g").attr("class", "nodes");
      }
  
      let descs = this.svg.select("g.desc");
      if (!descs.size()) {
        descs = this.svg.append("g").attr("class", "desc");
      }
  
      // /*
      //     debug
      // */
      // let inter_nodes = svg.select('g.intermediate_nodes');
      // if (!inter_nodes.size()) {
      //     inter_nodes = svg.append('g').attr('class', 'intermediate_nodes');
      // }
  
      if (!this.topo) {
        /*
                force simulation
            */
        let simulation = d3.forceSimulation().stop();
  
        /*
                force
            */
        let link_frc = d3
            .forceLink()
            .id((d: any) => {
              return d.id;
            })
            .distance(function (d: any) {
              if ("id" in d.source && "id" in d.target) {
                return 120;
              } else {
                return 60;
              }
            }),
          charge_frc = d3
            .forceManyBody()
            .strength((d: any) => {
              if ("id" in d) {
                return -160;
              } else {
                return -200;
              }
            })
            .distanceMax(300),
          center_frc = d3.forceCenter();
  
        /*
                gestures.
            */
  
        // drag node
        let drag = d3
          .drag()
          .on("start", (d: any) => {
            if (!d3.event.active) {
              simulation.alphaTarget(0.3).restart();
            }
  
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (d: any) => {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
          })
          .on("end", (d: any) => {
            let simulation = this.topo["simulation"];
  
            if (!d3.event.active) {
              simulation.alphaTarget(0);
            }
  
            d.fx = null;
            d.fy = null;
          });
  
        // zoom and drag to move
        let zoom = d3
          .zoom()
          .scaleExtent([0.1, 5])
          .on("zoom", () => {
            links.attr("transform", d3.event.transform);
            nodes.attr("transform", d3.event.transform);
            descs.attr("transform", d3.event.transform);
  
            // /*
            //     debug: zoom or pan intermediate nodes;
            // */
            // inter_nodes.attr('transform', d3.event.transform);
          });
        this.svg.call(zoom);
  
        /*
                tooltip
            */
        //   var Tooltip = d3.select("#div_template")
        //   .append("div")
        //   .style("opacity", 0)
        //   .attr("class", "tooltip")
        //   .style("background-color", "white")
        //   .style("border", "solid")
        //   .style("border-width", "2px")
        //   .style("border-radius", "5px")
        //   .style("padding", "5px")
  
        // // Three function that change the tooltip when user hover / move / leave a cell
        // var mouseover = (d : any, i:any, n:any) => {
        //   Tooltip
        //     .style("opacity", 1)
        //   d3.select(n[i])
        //     .style("stroke", "black")
        //     .style("opacity", 1)
        // }
        // var mousemove = (d : any, i:any, n:any) => {
        //   Tooltip
        //     .html("The exact value of<br>this cell is: " + d.value)
        //     .style("left", (d3.mouse(n[i])[0]+70) + "px")
        //     .style("top", (d3.mouse(n[i])[1]) + "px")
        // }
        // var mouseleave = (d : any, i:any, n:any) => {
        //   Tooltip
        //     .style("opacity", 0)
        //   d3.select(n[i])
        //     .style("stroke", "none")
        //     .style("opacity", 0.8)
        // }
        console.log(D3Tip());
        let node_tip = D3Tip()
          .attr("class", "tooltip")
          .offset([-10, 0])
          .html((d: any) => {
            console.log(this.selData);
            d = this.selData;
            return (
              "<p><strong class='title'>MAC:</strong> " +
              d.mac +
              "</p>" +
              "<p><strong class='title'>IP:</strong>" +
              d.ip +
              "</p>" +
              "<p><strong class='title'>Netmask:</strong>" +
              d.netmask +
              "</p>" +
              "<p><strong class='title'>Gateway:</strong>" +
              d.gateway +
              "</p>" +
              "<p><strong class='title'>VLAN:</strong>" +
              d.vlan +
              "</p>" +
              "<p><strong class='title'>Name:</strong>" +
              d.device_name +
              "</p>"
            );
          });
        this.svg.call(node_tip);
  
        let link_src_tip = D3Tip().attr("class", "tooltip"),
          link_dst_tip = D3Tip().attr("class", "tooltip");
        this.svg.call(link_src_tip);
        this.svg.call(link_dst_tip);
  
        if (this.animated) {
          simulation
            .force("link", link_frc)
            .force("center", center_frc)
            .force("charge", charge_frc);
        }
  
        // keep track of topo components.
        this.topo = {
          simulation: simulation,
          link_force: link_frc,
          charge_force: charge_frc,
          center_force: center_frc,
          drag: drag,
          zoom: zoom,
          node_tip: node_tip,
          link_source_tip: link_src_tip,
          link_dest_tip: link_dst_tip,
        };
      }
    }
  
    load() {
      /*
            load: load new nodes, links to simulation.
        */
  
      let simulation = this.topo["simulation"],
        link_frc = this.topo["link_force"],
        drag = this.topo["drag"],
        node_tip = this.topo["node_tip"],
        link_src_tip = this.topo["link_source_tip"],
        link_dst_tip = this.topo["link_dest_tip"],
        svg = d3.select(this.svgContainerRef.nativeElement);
  
      d3.json("../../assets/data.json", (graph: any) => {
        console.log("ssssssssss", graph);
        graph = graph["topo"];
        // let links = [];
  
        // A mapping: {node.id: node}
        let node_by_id = d3.map(graph.nodes, (d: any) => {
          return d.id;
        });
        let bilinks: {
          id: any;
          source: any;
          intermediate: {};
          target: any;
          source_port_disp: any;
          target_port_disp: any;
        }[] = [];
  
        graph.links.forEach((link: any, idx: any) => {
          let src = (link.source = node_by_id.get(link.source)),
            target = (link.target = node_by_id.get(link.target)),
            inter = {};
  
          graph.nodes.push(inter);
          graph.links.push(
            { source: src, target: inter },
            { source: inter, target: target }
          );
          // links.push({'source': src, 'target': inter}, {'source': inter, 'target': target});
          bilinks.push({
            id: link["id"],
            source: src,
            intermediate: inter,
            target: target,
            source_port_disp: link["source_port_disp"],
            target_port_disp: link["target_port_disp"],
          });
        });
  
        /*
                update link visualization
            */
        let link = svg
          .select("g.links")
          .selectAll("g.link_container")
          .data(bilinks);
        link.exit().remove();
        let new_link = link.enter().append("g").classed("link_container", true);
  
        new_link.append("path").classed("link_item", true);
  
        new_link
          .append("path")
          .classed("link_selector", true)
          .on("mouseover", (d: any, i: any, n: any) => {
            /*
                            focus on target link
                        */
            d3.select(n[i].parentNode).classed("focus", true);
  
            /*
                            focus on target and source node
                            and show tips.
                        */
            svg
              .select("g.nodes")
              .selectAll("g.node_container")
              .each((node_d: any, i: any, n: any) => {
                if (node_d.id == d.source.id) {
                  this.src_node = d3.select(n[i]).classed("focus focusing", true);
                } else if (node_d.id == d.target.id) {
                  this.dst_node = d3.select(n[i]).classed("focus focusing", true);
                }
              });
  
            /*
                            calculate tooltip position
                        */
            let src_dir,
              dst_dir,
              src_offset = [0, 0],
              dst_offset = [0, 0],
              min_distance = 20,
              x_distance = this.src_node.datum().x - this.dst_node.datum().x,
              y_distance = this.src_node.datum().y - this.dst_node.datum().y;
  
            if (Math.abs(x_distance) > Math.abs(y_distance)) {
              if (x_distance > 0) {
                src_dir = "e";
                src_offset[1] = 5;
                dst_dir = "w";
                dst_offset[1] = -5;
              } else {
                src_dir = "w";
                src_offset[1] = -5;
                dst_dir = "e";
                dst_offset[1] = 5;
              }
  
              if (Math.abs(y_distance) > min_distance) {
                if (y_distance > 0) {
                  src_dir = "s" + src_dir;
                  src_offset = [-5, -(Math.sign(src_offset[1]) * 5)];
                  dst_dir = "n" + dst_dir;
                  dst_offset = [5, -(Math.sign(dst_offset[1]) * 5)];
                } else {
                  src_dir = "n" + src_dir;
                  src_offset = [5, -(Math.sign(src_offset[1]) * 5)];
                  dst_dir = "s" + dst_dir;
                  dst_offset = [-5, -(Math.sign(dst_offset[1]) * 5)];
                }
              }
            } else {
              if (y_distance > 0) {
                src_dir = "s";
                src_offset[0] = 5;
                dst_dir = "n";
                dst_offset[0] = -5;
              } else {
                src_dir = "n";
                src_offset[0] = -5;
                dst_dir = "s";
                dst_offset[0] = 5;
              }
  
              if (Math.abs(x_distance) > min_distance) {
                if (x_distance > 0) {
                  src_dir = src_dir + "e";
                  src_offset = [-(Math.sign(src_offset[0]) * 5), -5];
                  dst_dir = dst_dir + "w";
                  dst_offset = [-(Math.sign(dst_offset[0]) * 5), 5];
                } else {
                  src_dir = src_dir + "w";
                  src_offset = [-(Math.sign(src_offset[0]) * 5), 5];
                  dst_dir = dst_dir + "e";
                  dst_offset = [-(Math.sign(dst_offset[0]) * 5), -5];
                }
              }
            }
  
            link_src_tip
              .direction(src_dir)
              .offset(src_offset)
              .html("<strong>" + d.source_port_disp + "</strong>")
              .show(this.src_node.node());
  
            link_dst_tip
              .direction(dst_dir)
              .offset(dst_offset)
              .html("<strong> " + d.target_port_disp + "</strong>")
              .show(this.dst_node.node());
          })
          .on("mouseout", (d: any, i: any, n: any) => {
            /*
                            move focus away from link.
                        */
            d3.select(n[i].parentNode).classed("focus", false);
  
            /*
                            move focus away from target and source nodes
                            hide tips
                        */
            svg
              .select("g.nodes")
              .selectAll("g.node_container")
              .each((node_d: any, i: any, n: any) => {
                if (node_d.id == d.source.id) {
                  this.src_node = d3
                    .select(n[i])
                    .classed("focus focusing", false);
                  link_src_tip.hide();
                } else if (node_d.id == d.target.id) {
                  this.dst_node = d3
                    .select(n[i])
                    .classed("focus focusing", false);
                  link_dst_tip.hide();
                }
              });
          });
  
        link = new_link.merge(link);
  
        /*
                update node visualization
            */
  
        let node = svg
          .select("g.nodes")
          .selectAll("g.node_container")
          .data(
            graph.nodes.filter((d: any) => {
              return "id" in d;
            })
          );
        node.exit().remove();
        let new_node = node
          .enter()
          .append("g")
          .on("click", () => {
            console.log("clicked IIIIIIIIIIIIIII");
          })
          .on("mouseover", (d: any, i: any, n: any) => {
            console.log("mouseover", d, i, n);
            this.selData = d;
            d3.select(n[i]).classed("focus", true);
            return node_tip.show.apply(this, [n[i]]);
          })
          .on("mouseout", (d: any, i: any, n: any) => {
            d3.select(n[i]).classed("focus", false);
            return node_tip.hide.apply(this, n[i]);
          })
          .call(drag);
  
        new_node.append("circle").attr("r", 20);
  
        new_node
          .append("text")
          .attr("x", 0)
          .attr("y", 12)
          .classed("ftstcall", true)
          .text("\ueaf2");
  
        node = new_node.merge(node);
        node.attr("class", (d: any) => {
          let stat_cls;
          if (d["knmp_on"] && d["ip_on"] && d["snmp_on"]) {
            stat_cls = "stat_normal";
          } else if (d["knmp_on"] && d["ip_on"] && !d["snmp_on"]) {
            stat_cls = "stat_abnormal";
          } else if (d["knmp_on"] && !d["ip_on"] && !d["snmp_on"]) {
            stat_cls = "stat_error";
          } else if (!d["knmp_on"] && !d["ip_on"] && !d["snmp_on"]) {
            stat_cls = "stat_down";
          } else {
            // knmp off, snmp_on -> unknown device.
            stat_cls = "stat_unknown";
          }
          return "node_container " + stat_cls;
        });
  
        /*
                update descriptions
            */
        let desc = svg
          .select("g.desc")
          .selectAll("g.desc_container")
          .data(
            graph.nodes.filter((d: any) => {
              return "id" in d;
            })
          );
        desc.exit().remove();
        let new_desc = desc.enter().append("g").classed("desc_container", true);
  
        new_desc.append("text").attr("x", 0).attr("y", 35);
  
        desc = new_desc.merge(desc);
        desc.select("text").text((d: any) => {
          return d["mac"];
        });
  
        // /*******************************************
        //     BEGIN-debug: show intermediate nodes
        // */
        // let inter_node = svg.select('g.intermediate_nodes').selectAll('circle').data(
        //     graph.nodes.filter((d : any, i:any, n:any) => {
        //         return !('id' in d);
        //     })
        // );
        // inter_node.exit().remove();
        // inter_node.enter()
        //           .append('circle')
        //           .attr('r', 3)
        //           .attr('fill', 'white');
        // /*
        //     END-debug
        // *********************************************/
  
        /*
                apply new nodes, links to logics
            */
        simulation.nodes(graph.nodes);
        link_frc.links(graph.links);
        // link_frc.links(links);
  
        /*
                update link, node selection closure.
                for performance.
            */
        simulation.on("tick", () => {
          this.do_tick(link, node, desc);
        });
  
        this.do_layout();
      });
    }
  
    do_layout() {
      let svg = d3.select(this.svgContainerRef.nativeElement),
        center_frc = this.topo["center_force"];
  
      let width = +svg.style("width").replace("px", ""),
        height = +svg.style("height").replace("px", "");
  
      center_frc.x(width / 2).y(height / 2);
  
      if (this.animated) {
        this.do_animated_layout();
      } else {
        this.do_static_layout();
      }
    }
  
    do_static_layout() {
      /*
            deregister drag event.
            register force
  
            call simulation.tick() several times
            call ticked()   -> draw finished layout
  
            deregister force
            register drag event again.
        */
  
      let simulation = this.topo["simulation"],
        center_frc = this.topo["center_force"],
        charge_frc = this.topo["charge_force"],
        link_frc = this.topo["link_force"];
  
      if (!this.animated) {
        simulation
          .force("center", center_frc)
          .force("charge", charge_frc)
          .force("link", link_frc);
      }
      simulation.alpha(1);
  
      for (
        let i = 0,
          n = Math.ceil(
            Math.log(simulation.alphaMin()) /
              Math.log(1 - simulation.alphaDecay())
          );
        i < n;
        ++i
      ) {
        simulation.tick();
      }
  
      if (!this.animated) {
        simulation
          .force("center", null)
          .force("charge", null)
          .force("link", null);
      }
  
      this.do_one_tick();
    }
  
    do_animated_layout() {
      /*
            deregister drag event.
            register force
  
            call simulation.tick() several times
            call ticked()   -> draw finished layout
  
            deregister force
            register drag event again.
        */
  
      let simulation = this.topo["simulation"],
        center_frc = this.topo["center_force"],
        charge_frc = this.topo["charge_force"],
        link_frc = this.topo["link_force"];
  
      if (!this.animated) {
        simulation
          .force("center", center_frc)
          .force("charge", charge_frc)
          .force("link", link_frc);
      }
      simulation.alpha(1);
  
      window.requestAnimationFrame(() => this.render());
    }
  
    do_tick(
      link_sel: {
        select: (arg0: string) => {
          (): any;
          new (): any;
          attr: {
            (arg0: string, arg1: { (d: any): string; (d: any): string }): void;
            new (): any;
          };
        };
      },
      node_sel: { attr: (arg0: string, arg1: (d: any) => string) => void },
      desc_sel: { attr: (arg0: string, arg1: (d: any) => string) => void }
    ) {
      /*
            update visualization of links
                path
        */
      link_sel.select("path.link_item").attr("d", function (d: any) {
        return (
          "M" +
          d["source"].x +
          "," +
          d["source"].y +
          "S" +
          d["intermediate"].x +
          "," +
          d["intermediate"].y +
          " " +
          d["target"].x +
          "," +
          d["target"].y
        );
      });
  
      link_sel.select("path.link_selector").attr("d", function (d: any) {
        return (
          "M" +
          d["source"].x +
          "," +
          d["source"].y +
          "S" +
          d["intermediate"].x +
          "," +
          d["intermediate"].y +
          " " +
          d["target"].x +
          "," +
          d["target"].y
        );
      });
  
      /*
            update visualization of nodes
                g <- text
        */
      node_sel.attr("transform", function (d: { x: string; y: string }) {
        return "translate(" + d.x + "," + d.y + ")";
      });
  
      /*
            update visualization of description
                g<-text
        */
      desc_sel.attr("transform", function (d: { x: string; y: string }) {
        return "translate(" + d.x + "," + d.y + ")";
      });
  
      // /*
      //     debug: update intermediate nodes' position
      // */
      // let d3 = D3.Default,
      //     inter_node = d3.select(this.svgContainerRef.nativeElement)
      //                    .select('g.intermediate_nodes')
      //                    .selectAll('circle');
      // inter_node.attr('cx', (d : any, i:any, n:any) => { return d.x; })
      //           .attr('cy', (d : any, i:any, n:any) => { return d.y; });
    }
  
    do_one_tick() {
      /*
            handle one tick on graphic elements.
        */
      let svg = d3.select(this.svgContainerRef.nativeElement),
        link = svg.select("g.links").selectAll("g.link_container"),
        node = svg.select("g.nodes").selectAll("g.node_container"),
        desc = svg.select("g.desc").selectAll("g.desc_container");
  
      this.do_tick(link, node, desc);
    }
  
    public ticks_per_render = 5;
    render() {
      for (let i = 0; i < this.ticks_per_render; i++) {
        this.simulation.tick();
      }
  
      this.do_one_tick();
  
      if (this.simulation.alpha() > this.simulation.alphaMin()) {
        window.requestAnimationFrame(this.render);
      } else {
        if (!this.animated) {
          this.simulation
            .force("center", null)
            .force("charge", null)
            .force("link", null);
        }
      }
    }
    //#endregion

    //#region Helper Methods

    nodefileParse()
    {
        fetch('../../assets/nodes.txt')
        .then(response => response.text())
        .then(data => {
            for(let line of data.split(/[\r\n]+/))
            {
                console.log(line);
                let nodeData :any = line.match(/\<(.*?)\>/);
                if(nodeData != null)
                {
                    let node = nodeData[1].split(',');
                    console.log(node);
                }
                
               
            //     if(status.length > 0)
            //     {
            //         console.log(status[0]);
            //     }
            //     line.split('<->').forEach((element, i) => {
            //         element = element.replace(status[0], '');
            //         console.log(element, i);
            //         this.sourceName = element.split('-')[0];
            //         this.sourcePort = element.split('-')[1];
            //         if(i == 0)
            //         {
            //             this.target = line.split('<->')[i+1].split('-')[0].replace(status[0], '').replace(/\s/g, "");
            //             this.targetPort = line.split('<->')[i+1].split('-')[1].replace(status[0], '').replace(/\s/g, "");
            //         }else{
            //             this.target = line.split('<->')[i-1].split('-')[0].replace(status[0], '').replace(/\s/g, "");
            //             this.targetPort = line.split('<->')[i-1].split('-')[1].replace(status[0], '').replace(/\s/g, "");
            //         }
            //         this.addLink(this.sourceName, this.sourcePort, this.target, this.targetPort);
            //     });
            //     break
            // }
            // this.networkData = {
            //     nodes: [],
            //     links: this.linksArray
            };
        });  
    }

    linkfileParse()
    {
        fetch('../../assets/links.txt')
        .then(response => response.text())
        .then(data => {
            for(let line of data.split(/[\r\n]+/))
            {
                let status :any = line.match(/\((.*?)\)/);

                if(status.length > 0)
                {                                 
                    line.split('<->').forEach((element, i) => {
                        element = element.replace(status[0], '');
                        this.sourceName = element.split('-')[0];
                        this.sourcePort = element.split('-')[1];
                        if(i == 0)
                        {
                            this.target = line.split('<->')[i+1].split('-')[0].replace(status[0], '').replace(/\s/g, "");
                            this.targetPort = line.split('<->')[i+1].split('-')[1].replace(status[0], '').replace(/\s/g, "");
                        }else{
                            this.target = line.split('<->')[i-1].split('-')[0].replace(status[0], '').replace(/\s/g, "");
                            this.targetPort = line.split('<->')[i-1].split('-')[1].replace(status[0], '').replace(/\s/g, "");
                        }
                        this.addLink(this.sourceName, this.sourcePort, this.target, this.targetPort);
                    });
                }
                break
            }
            this.networkData = {
                nodes: [],
                links: this.linksArray
            };
        });  
    }

    addLink(source: string, sourcePortName: string, target: string, targetPortName : string)
    {
        let link = {
            source: source,
            target: target,
            target_port_disp: targetPortName,
            source_port_disp: sourcePortName

        };
        //example of how to add a link to the graph
        //{"source": "s0", "target_port_disp": "port_1", "source_port_disp": "port_7", "target": "s4"}
        this.linksArray.push(link);
    }

    // parseJson(json: any)
    // {
    //     //parse json into links and nodes
    //     let links = json["links"];
    //     let nodes = json["nodes"];
    //     let desc = json["desc"];
    //     this.parseLinks(links);
    //     this.parseNodes(nodes);
    //     this.parseDesc(desc);
    // }
    // parseLinks(links: any)
    // {
    //     //parse links into link objects
    //     let link_objs = [];
    //     for(let i = 0; i < links.length; i++)
    //     {
    //         let link = links[i];
    //         let link_obj = {
    //             source: link["source"],
    //             target: link["target"],
    //             intermediate: link["intermediate"]
    //         }
    //         link_objs.push(link_obj);
    //     }
    //     this.links = link_objs;
    // }
    // parseNodes(nodes: any)
    // {
    //     //parse nodes into node objects
    //     let node_objs = [];
    //     for(let i = 0; i < nodes.length; i++)
    //     {
    //         let node = nodes[i];
    //         let node_obj = {
    //             name: node["name"],
    //             x: node["x"],
    //             y: node["y"]
    //         }
    //         node_objs.push(node_obj);
    //     }
    //     this.nodes = node_objs;
    // }
    // parseDesc(desc: any)
    // {
    //     //parse desc into desc objects
    //     let desc_objs = [];
    //     for(let i = 0; i < desc.length; i++)
    //     {
    //         let desc_obj = {
    //             name: desc[i]["name"],
    //             x: desc[i]["x"],
    //             y: desc[i]["y"]
    //         }

    //         desc_objs.push(desc_obj);
    //     }
    //     this.desc = desc_objs;
    // }

    //#endregion
  
    public getJSON(): Observable<topo> {
      return this.http.get<topo>(this._jsonURL);
    }
  }
  