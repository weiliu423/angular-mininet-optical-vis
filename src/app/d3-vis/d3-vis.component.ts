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
  import { links, network, nodes, topo } from "../models/data-network.model";
  import { HttpClient } from "@angular/common/http";
  import { Observable } from "rxjs";

  // Import the functions you need from the SDKs you need
   import { initializeApp } from "firebase/app";

  // // Your web app's Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyCeRkrVepStRHHP-5WuMgJ80f3hIfTLn_0",
    authDomain: "mininet-optical-file-system.firebaseapp.com",
    projectId: "mininet-optical-file-system",
    storageBucket: "mininet-optical-file-system.appspot.com",
    messagingSenderId: "752741188254",
    appId: "1:752741188254:web:b113a9ec279d157325b18f"
  };
  
  import { AngularFireStorage } from '@angular/fire/compat/storage';
  import {  getStorage, ref, getDownloadURL, uploadString } from "firebase/storage";
  
  // Initialize Firebase
  initializeApp(firebaseConfig);

  @Component({
    selector: "app-d3-vis",
    templateUrl: "./d3-vis.component.html",
    styleUrls: ["./d3-vis.component.css"],
  })
  export class D3VisComponent implements OnInit {
    public isRendered = false;
    public network!: network;
    public networkData!: topo;
    public linksArray: links[] = [];
    public nodeArray: nodes[] = [];
    public selData: any;
    public preLinkProcess: boolean = false;
    public preNodeProcess: boolean = false;
    public nodeFileUrl: string = "";
    public linkFileUrl: string = "";
    public storageUrl: string = "gs://mininet-optical-file-system.appspot.com";
    //profileUrl: Observable<string | null>;
    constructor(private http: HttpClient, private storages: AngularFireStorage) {
    //   this.getJSON().subscribe((data) => {
    //     console.log(data);
    //     this.networkData = data;
    //   });
      this.networkData = new topo([], []);
      this.firebaseGetLinkFile();
    }
  
    @ViewChild("topo_container", { read: ElementRef, static: true })
    svgContainerRef!: ElementRef<HTMLDivElement>;
  
    ngOnInit(): void {
         
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
        this.simulation = d3.forceSimulation().stop();
  
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
              this.simulation.alphaTarget(0.3).restart();
            }
  
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (d: any) => {
            d.fx = d3.event.x;
            d.fy = d3.event.y;
          })
          .on("end", (d: any) => {
            this.simulation = this.topo["simulation"];
  
            if (!d3.event.active) {
              this.simulation.alphaTarget(0);
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
        let node_tip = D3Tip()
          .attr("class", "tooltip")
          .offset([-10, 0])
          .html((d: any) => {
            d = this.selData;
            return (   
              "<p><strong class='title'>Name:</strong>" +
              d.device_name +
              "</p>" +      
              "<p><strong class='title'>IP:</strong>" +
              d.ip +
              "</p>" +
              "<p><strong class='title'>Pid:</strong>" +
              d.pid +
              "</p>"
             
            );
          });
        this.svg.call(node_tip);
  
        let link_src_tip = D3Tip().attr("class", "tooltip"),
          link_dst_tip = D3Tip().attr("class", "tooltip");
        this.svg.call(link_src_tip);
        this.svg.call(link_dst_tip);
  
        if (this.animated) {
          this.simulation
            .force("link", link_frc)
            .force("center", center_frc)
            .force("charge", charge_frc);
        }
  
        // keep track of topo components.
        this.topo = {
          simulation: this.simulation,
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
      // console.log(JSON.stringify(this.network));
      // d3.json(JSON.stringify(this.network), (graph: any) => {
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
          })
          .on("mouseover", (d: any, i: any, n: any) => {
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
        this.simulation = simulation;
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
  
      window.requestAnimationFrame(() => this.render(simulation));
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
  
    public ticks_per_render : number = 5;
    render(simulation: any) {
      for (let i = 0; i < 5; i++) {
       simulation.tick;
      }
  
      this.do_one_tick();
  
      if (simulation.alpha() > simulation.alphaMin()) {
        window.requestAnimationFrame(this.render);
      } else {
        if (!this.animated) {
          simulation
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
        fetch(this.nodeFileUrl)
        .then(response => response.text())
        .then(data => {
            for(let line of data.split(/[\r\n]+/))
            {
                let nodeData :any = line.match(/\<(.*?)\>/);
                if(nodeData != null)
                {
                    if(nodeData[1].includes('Host'))
                    {
                       this.hostParse(nodeData[1]);
                    }
                    else if(nodeData[1].includes('ROADM'))
                    {
                        this.roadmParse(nodeData[1]);
                    }
                    else if(nodeData[1].includes('OVSBridge'))
                    {
                        this.ovsbridgeParse(nodeData[1]);
                    }
                    else if(nodeData[1].includes('Terminal'))
                    {
                        this.terminalParse(nodeData[1]);

                    }
                    else{
                      this.additionalParse('');
                    }               
                }           
            };
            this.networkData.nodes = this.nodeArray;
            this.preNodeProcess = true;
            this.network = new network(this.networkData);   
            this.firebaseUploadDataFile(JSON.stringify(this.network));
            this.initialize_topo();
            this.load();
        });
        
    }

    public regexExp = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
    hostParse(host: string)
    {
      //parse host parameter and split by ':'
      let hostData = host.split(':');
      //if hostData is not empty, then add node to networkData
      if(hostData.length > 0)
      {
        let source = hostData[0].replace('Host', '').replace(/\s/g, "");
        let ip = '';
        let pid = '';
        hostData[2].split(' ').forEach((element) => {
          if(this.regexExp.test(element))
          {
            ip = element;
          }
          else if(element.includes('pid'))
          {
            pid = element.split('=')[1];
          }
        });
        this.addNode(source, ip, pid);
      }
    }

    roadmParse(roadm: string)
    {
      //parse roadm parameter and split by ':'
      let roadmData = roadm.split(',');
      //if roadmData is not empty, then add node to networkData
      if(roadmData.length > 0)
      {
        let source = '';
        let ip = '';
        let pid = '';
        source = roadmData[0].split(':')[0].replace('ROADM', '').replace(/\s/g, "");
        roadmData.forEach((element) => {
          if(this.regexExp.test(element.split('lo:')[1]))
          {
            ip = element.split('lo:')[1];
          }
          else if(element.includes('pid'))
          {
            pid = element.split('=')[1];
          }
        });
        this.addNode(source, ip, pid);
      }
    }

    ovsbridgeParse(ovsbridge: string)
    {
      //parse ovsbridge parameter and split by ':'
      let ovsbridgeData = ovsbridge.split(',');
      //if ovsbridgeData is not empty, then add node to networkData
      if(ovsbridgeData.length > 0)
      {
        let source = '';
        let ip = '';
        let pid = '';
        source = ovsbridgeData[0].split(':')[0].replace('OVSBridge ', '').replace(/\s/g, "");
        ovsbridgeData.forEach((element) => {
          if(this.regexExp.test(element.split('lo:')[1]))
          {
            ip = element.split('lo:')[1];
          }
          else if(element.includes('pid'))
          {
            pid = element.split('=')[1];
          }
        });
        this.addNode(source, ip, pid);
      }
    }

    terminalParse(terminal: string)
    {
      //parse terminal parameter and split by ':'
      let terminalData = terminal.split(',');
      //if terminalData is not empty, then add node to networkData
      if(terminalData.length > 0)
      {
        let source = '';
        let ip = '';
        let pid = '';
        source = terminalData[0].split(':')[0].replace('Terminal ', '').replace(/\s/g, "");
        terminalData.forEach((element) => {
          if(this.regexExp.test(element.split('lo:')[1]))
          {
            ip = element.split('lo:')[1];
          }
          else if(element.includes('pid'))
          {
            pid = element.split('=')[1];
          }
        });
        this.addNode(source, ip, pid);
      }
    }

    additionalParse(data: any)
    {

    }

    addNode(source: string, ip : string, pid : string)
    {
        let node = {
            id: source,
            device_name : source,
            netmask: '255.255.255.0',
            ip: ip,
            pid: pid,
        };
        //example of how to add a link to the graph
        //{"source": "s0", "target_port_disp": "port_1", "source_port_disp": "port_7", "target": "s4"}
        this.nodeArray.push(node);
    }

    linkfileParse()
    {
        fetch(this.linkFileUrl)
        .then(response => response.text())
        .then(data => {
            for(let line of data.split(/[\r\n]+/))
            {
                let status :any = line.match(/\((.*?)\)/);
                if(status != null)
                {
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
                }
            }
            this.networkData.links = this.linksArray;
            this.preLinkProcess = true;
            this.nodefileParse();         
        });  
    }

    addLink(source: string, sourcePortName: string, target: string, targetPortName : string)
    {
        let link = {
            source: source,
            target: target,
            target_port_disp: targetPortName,
            source_port_disp: sourcePortName

        }
        //example of how to add a link to the graph
        //{"source": "s0", "target_port_disp": "port_1", "source_port_disp": "port_7", "target": "s4"}
        this.linksArray.push(link);
    }

    firebaseGetNodeFile()
    {
      let storage = getStorage();
      getDownloadURL(ref(storage, this.storageUrl + '/nodes.txt'))
      .then((url) => {
        // // This can be downloaded directly:
        // const xhr = new XMLHttpRequest();
        // xhr.responseType = 'blob';
        // xhr.onload = (event) => {
        //   const blob = xhr.response;
        // };
        // xhr.open('GET', url);
        // xhr.send();

        console.log(url);
        this.nodeFileUrl = url;
        this.linkfileParse();   
      })
      .catch((error) => {
        // Handle any errors
      });
    }
    firebaseGetLinkFile()
    {
      let storage = getStorage();
      getDownloadURL(ref(storage, this.storageUrl + '/links.txt'))
      .then((url) => {
        // `url` is the download URL for 'images/stars.jpg'

        // // This can be downloaded directly:
        // const xhr = new XMLHttpRequest();
        // xhr.responseType = 'blob';
        // xhr.onload = (event) => {
        //   const blob = xhr.response;
        // };
        // xhr.open('GET', url);
        // xhr.send();

        console.log(url);
        this.linkFileUrl = url;
        this.firebaseGetNodeFile();
      })
      .catch((error) => {
        // Handle any errors
      });
    }
    firebaseUploadDataFile(data: string)
    {
      let storage = getStorage();
      let storageRef = ref(storage, this.storageUrl+'/data.json');
      uploadString(storageRef, data).then((snapshot) => {
        console.log('Parsed data uploaded to Firebase storage');
      });
    }
    //#endregion

  }
  