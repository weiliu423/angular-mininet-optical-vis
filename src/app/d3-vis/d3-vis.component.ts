import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnInit,
  Output,
  ViewChild,
} from "@angular/core";
var d3 = require("d3");
var D3Tip = require("../../assets/d3-tip.js");
import { links, network, nodes, topo } from "../models/data-network.model";
import { HttpClient } from "@angular/common/http";
import { Observable, Observer, fromEvent, merge } from "rxjs";
import { map } from "rxjs/operators";
import {
  getStorage,
  ref,
  getDownloadURL,
  uploadString,
} from "firebase/storage";
import { initializeApp } from "firebase/app";
import { NotifierService } from "angular-notifier";
import { PythonApiService } from "../services/python-api.service";
import { file_upload } from "../models/osnr_mapping.model";
import { DialogComponent } from "../dialog/dialog.component";
import { ThemePalette } from "@angular/material/core";
import { sub_tasks } from "../models/sub-task.model";
import { sigtraceData } from "../models/sigtrace-resp.model";
import { chartData, direction } from "../models/chart-data.model";
import { D3LineChartComponent } from "../d3-line-chart/d3-line-chart.component";
//Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCeRkrVepStRHHP-5WuMgJ80f3hIfTLn_0",
  authDomain: "mininet-optical-file-system.firebaseapp.com",
  projectId: "mininet-optical-file-system",
  storageBucket: "mininet-optical-file-system.appspot.com",
  messagingSenderId: "752741188254",
  appId: "1:752741188254:web:b113a9ec279d157325b18f",
};
initializeApp(firebaseConfig);

export interface Task {
  name: string;
  completed: boolean;
  color: ThemePalette;
  subtasks?: sub_tasks[];
}

@Component({
  selector: "app-d3-vis",
  templateUrl: "./d3-vis.component.html",
  styleUrls: ["./d3-vis.component.css"],
})
export class D3VisComponent implements OnInit {
  public isRendered = false;
  public isNetworkOnline = false;
  private readonly notifier: NotifierService;
  public width: any;
  public height: any;
  public enableSideView: any = false;
  public monitorData: any;
  public sigtraceData: sigtraceData[] = [];
  public osnrData: any = [];
  public channels : string[] = [];
  public allComplete: boolean = false;
  public initialChart: boolean = false;
  @ViewChild(DialogComponent) dialog!: DialogComponent;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private notifierService: NotifierService,
    private apiService: PythonApiService
  ) {
    this.networkData = new topo([], []);
    this.notifier = notifierService;
  }
  /////////////////////////////////////////////////////////////////
  public bntStyle: string = "btn btn-xl btn-danger disabled";
  public firebaseStatus: string = "500 - Internal Error";
  public loadFileStatus: string = "404 - Not Found";
  public apiStatus: string = "404 - Not Found";
  public firebaseStatusStyle: string = "text-danger";
  public loadFileStatuStyle: string = "text-danger";
  public apiStatusStyle: string = "text-danger";
  /////////////////////////////////////////////////////////////////

  @ViewChild("topo_container", { read: ElementRef, static: true })
  svgContainerRef!: ElementRef<HTMLDivElement>;
  @ViewChild("nodeSelection")
  nodeSelection!: ElementRef;
  @ViewChild("linkSelection")
  linkSelection!: ElementRef;

  ngOnInit(): void {
    this.createOnline$().subscribe(
      (isOnline) => (this.isNetworkOnline = isOnline)
    );
    if (this.isNetworkOnline) {
      this.firebaseGetDataFile();
    }
    try {
      let getOSNR: any;
      getOSNR = this.apiService.getOSNRData();
      getOSNR.subscribe((resp: any) => {
        if (resp.data?.length > 0) {
          this.osnrData = resp.data;
          this.apiStatus = "200 - Success";
          this.apiStatusStyle = "text-success";
          this.notifierService.notify("success", "API online.");
          this.getAllChannels()
        }
        if (resp.error != null) {
          this.notifierService.notify("error", "Failed to load API.");
        }
      });

      let getMonitorData: any;
      getMonitorData = this.apiService.getMonitorData();
      getMonitorData.subscribe((resp: any) => {
        //this.monitorData = resp.data;
        if (resp.data != null) {
          this.monitorData = resp.data;
        }
        if (resp.error != null) {
          this.notifierService.notify("error", "Failed to get monitor data.");
        }
      });

      let getSigtraceData: any;
      getSigtraceData = this.apiService.getSigTraceData();
      getSigtraceData.subscribe((resp: any) => {
        if (resp.data != null) {
          this.sigtraceData = resp.data;
        }
        if (resp.error != null) {
          this.notifierService.notify("error", "Failed to get sigtrace data.");
        }
      });
    } catch (e) {
      this.notifierService.notify("error", "Error occurred on API.");
    }
  }

  //#region Initial Load/Layout Methods
  public selData: any;
  public network!: network;
  public networkData!: topo;
  public linksArray: links[] = [];
  public nodeArray: nodes[] = [];
  public topo: any; // keep track of topo.
  public animated: boolean = true; // animated or static
  public svg: any;
  //public color: any;
  public bilinks: any;
  public src_node: any;
  public dst_node: any;
  public text: any;
  public simulation: any;
  public sourceName: any;
  public sourcePort: any;
  public targetPort: any;
  public target: any;
  public portStatus: any;
  public node_sel:any;
  public desc_sel:any;
  initialize_topo() {
    //this.color = d3.scaleOrdinal(d3.schemeCategory10);
    /*
            create container for links and nodes elements.
        */
    this.svg = d3.select(this.svgContainerRef.nativeElement);
    this.width = this.svg.style("width").replace("px", "");
    this.height = this.svg.style("height").replace("px", "");
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
    let inter_nodes = this.svg.select("g.intermediate_nodes");
    if (!inter_nodes.size()) {
      inter_nodes = this.svg.append("g").attr("class", "intermediate_nodes");
    }

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
          .distance((d: any, i: any) => {
            //console.log(d.source)
            if (d.source.device_info == "Host") {
              return 60;
            } else if (d.source.device_info == "ROADM") {
              return -70;
            } else if (d.source.device_info == "OVSBridge") {
              return 100;
            } else if (d.source.device_info == "Terminal") {
              return 200;
            } else {
              //expand link on increase
              return 100;
            }
          }),
        charge_frc = d3
          .forceManyBody()
          .strength((d: any) => {
            if (d.device_info == "Host") {
              return -200;
            } else if (d.device_info == "ROADM") {
              return -2700;
            } else if (d.device_info == "OVSBridge") {
              return -100;
            } else if (d.device_info == "Terminal") {
              return -1100;
            } else {
              return -700;
            }
          })
          .distanceMax(this.height / 2),
        center_frc = d3.forceCenter();
      /*
                gestures.
            */

      // drag node
      let drag = d3
        .drag()
        .on("start", (d: any) => {
          if (!d3.event.active) {
            this.simulation.alphaTarget(0.6).restart();
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
            d.device_name.toUpperCase() +
            "</p>" +
            "<p><strong class='title'>IP:</strong>" +
            d.ip +
            "</p>" +
            "<p><strong class='title'>Netmask:</strong>" +
            d.netmask +
            "</p>" +
            "<p><strong class='title'>PID:</strong>" +
            d.pid +
            "</p>" +
            "<p><strong class='title'>Device Info:</strong>" +
            d.device_info +
            "</p>"
          );
        });
      this.svg.call(node_tip);

      let link_src_tip = D3Tip().attr("class", "tooltip"),
        link_dst_tip = D3Tip().attr("class", "tooltip");
      this.svg.call(link_src_tip);
      this.svg.call(link_dst_tip);

      if (this.animated) {
        this.simulation;
        //.force("link", link_frc)
        //.force("center", center_frc)
        //.force("charge", charge_frc);
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
    this.simulation = this.topo["simulation"];
    let  link_frc = this.topo["link_force"],
      drag = this.topo["drag"],
      node_tip = this.topo["node_tip"],
      link_src_tip = this.topo["link_source_tip"],
      link_dst_tip = this.topo["link_dest_tip"],
      svg = d3.select(this.svgContainerRef.nativeElement);

    if (!this.isNetworkOnline) {
      this.dataJsonUrl = "";
    }
    d3.json(this.dataJsonUrl, (graph: any) => {
      // console.log(JSON.stringify(this.network));
      // d3.json(JSON.stringify(this.network), (graph: any) => {
      //console.log(JSON.stringify(graph));
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

      this.bilinks = bilinks;

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

      let new_link = link
        .enter()
        .append("g")
        .attr("stroke", (d: any) => {
            return "#6c757d"
        }).classed("link_container", true);
      new_link.append("path").classed("link_item", true);

      new_link
        .append("path")
        .classed("link_selector", true)
        .on("click", (d: any) => {
          return console.log("link", d);
        })
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
      // var lines = d3.selectAll('.flowline');

      // var offset = 1; 
      // setInterval(() => {
      //   lines.style('stroke-dashoffset', offset);
      //   offset += 1; 
      // }, 50);
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
        .on("click", (d: any) => {
          // console.log(this.monitorData[d.id + '_monitor'])
          this.dialog.openDialog(
            d.id.toUpperCase(),
            this.monitorData === undefined
              ? this.monitorData
              : this.monitorData[d.id + "_monitor"]
          );
          return console.log("node", d);
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
        .call(drag)
        .attr("stroke", (d: any) => {
          if (d.device_info == "ROADM") {
            return "#FF0000";
          } else if (d.device_info == "Terminal") {
            return "#0080FC";
          } else {
            return "#000000";
            //return this.color(d.source);
          }
        });

      //new_node.append("circle").attr("r", 30);

      new_node
        .append("image")
        .attr("xlink:href", (d: any) => {
          if (d.device_info == "ROADM") {
            return "https://firebasestorage.googleapis.com/v0/b/mininet-optical-file-system.appspot.com/o/icon%2Fosa_device-wireless-router.png?alt=media&token=4e418f3c-eea4-4ba6-b83b-6c9618cd0910";
          } else if (d.device_info == "Terminal") {
            return "https://firebasestorage.googleapis.com/v0/b/mininet-optical-file-system.appspot.com/o/icon%2Fosa_vpn.png?alt=media&token=b3917ec2-4a0f-4171-9d5f-c0931f185b25";
          } else if (d.device_info == "OVSBridge") {
            return "https://firebasestorage.googleapis.com/v0/b/mininet-optical-file-system.appspot.com/o/icon%2Fnetwork-switch-icon-20.jpg?alt=media&token=34b59c5c-6333-41a4-a4c9-6c75e822e2b6";
          } else if (d.device_info == "Host") {
            return "https://firebasestorage.googleapis.com/v0/b/mininet-optical-file-system.appspot.com/o/icon%2Fosa_desktop_imac.png?alt=media&token=561b1231-a756-4a22-b268-45c7f9558740";
          } else {
            return "https://github.com/favicon.ico";
          }
        })
        .attr("x", -30)
        .attr("y", -30)
        .attr("width", 60)
        .attr("height", 60);
      // new_node
      //   .append("text")
      //   .attr("x", 0)
      //   .attr("y", 12)
      //   .classed("ftstcall", true)
      //   .text((d :any) =>{
      //     return d.device_name;
      //   });
      new_node
        .append("text")
        .style("fill", "black")
        .text((d: any) => {
          return String(d.device_name).toUpperCase();
        })
        .enter();

      this.text = this.svg
        .selectAll("text")
        .attr("x", 0)
        .attr("y", -25)
        .data(new_node);
      //.enter();

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
      this.simulation.nodes(graph.nodes);
      link_frc.links(graph.links);
      // link_frc.links(links);

      /*
                update link, node selection closure.
                for performance.
            */
      this.simulation.on("tick", () => {
        this.do_tick(link, node, desc);
      });
      this.simulation =  this.simulation;
      this.do_layout();
    });
  }

  do_layout() {
    let svg = d3.select(this.svgContainerRef.nativeElement),
      center_frc = this.topo["center_force"];

    this.width = +svg.style("width").replace("px", "");
    this.height = +svg.style("height").replace("px", "");
    center_frc.x(this.width / 2).y(this.height / 2);

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
    simulation.alpha(1).restart();

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

    if (this.animated) {
      simulation
        .force("center", center_frc)
        .force("charge", charge_frc)
        .force("link", link_frc)
        .force(
          "collide",
          d3
            .forceCollide((d: any) => {
              return d.r + 1;
            })
            .iterations(10)
        );
    }
    simulation.alpha(0.5).restart();

    this.render(simulation);
  }

  do_tick(link_sel: any, node_sel: any, desc_sel: any) {
    /*
          update visualization of links
              path
      */
    this.node_sel = node_sel;
    this.desc_sel = desc_sel;
    this.text.attr("text", (d: any) => {
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

    link_sel.select("path.link_item").attr("d", (d: any) => {
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

    link_sel.select("path.link_selector").attr("d", (d: any) => {
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
    node_sel.attr("transform", (d: any) => {
      return "translate(" + d.x + "," + d.y + ")";
    });

    /*
          update visualization of description
              g<-text
      */
    desc_sel.attr("transform", (d: any) => {
      return "translate(" + d.x + "," + d.y + ")";
    });
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

  public ticks_per_render: number = 5;
  render(simulation: any) {
    for (let i = 0; i < 5; i++) {
      simulation.tick();
    }

    this.do_one_tick();

    if (simulation.alpha > simulation.alphaMin) {
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
  public subtask!: sub_tasks;
  public subtasks: sub_tasks[] = [];
  public chanellcolors : string[] = ['primary','primary','primary','primary','primary','primary'];
  public defineColors:string[] = ['box bg-primary','box bg-danger','box bg-success','box bg-info','box bg-warning','box bg-secondary'];
  public channelDefaultColours : string[] = ['#6c757d', '#0d6efd','#dc3545','#198754','#0dcaf0','#ffc107'];
  public filteredSigtraceData!: chartData;
  public directionsData!: direction;
  public filteredSigtraceDataList: chartData[] = [];
  @ViewChild(D3LineChartComponent) d3chart! :D3LineChartComponent;
  public task: Task = {
    name: 'Channels',
    completed: false,
    color: 'primary',
    subtasks: this.subtasks,
  };
  resetNodeSelection() {
    this.nodeSelection.nativeElement.value = "";
  }
  resetLinkSelection() {
    this.linkSelection.nativeElement.value = "";
  }
  createOnline$() {
    return merge<any>(
      fromEvent(window, "offline").pipe(map(() => false)),
      fromEvent(window, "online").pipe(map(() => true)),
      new Observable((sub: Observer<boolean>) => {
        sub.next(navigator.onLine);
        sub.complete();
      })
    );
  }
  updateAllComplete() {
    if(this.task.subtasks != null)
    {
        let dataByDirection: any;
        let index = 0;
        this.filteredSigtraceDataList = []
        let selected = this.task.subtasks.filter(t => t.completed == true)
        selected.forEach(element => {
          index = element.id + 1;
          let data = this.sigtraceData.filter(x => x.Channel.includes(element.name))
          dataByDirection = this.groupBy(data, 'direction');

          this.directionsData = {
            Input: dataByDirection['Input'],
            Output: dataByDirection['Output']
          }
          this.filteredSigtraceData = {
            channelName : element.name,
            observations : this.directionsData
          }
          
          this.filteredSigtraceDataList.push(this.filteredSigtraceData)
        });
        console.log('filter data', this.filteredSigtraceDataList)

        this.svg = d3.select(this.svgContainerRef.nativeElement)
        .selectAll("g.link_container")
        .filter((d:any) => {
          //console.log(d)
          let sources:any = []
          if(dataByDirection != null)
          {
            dataByDirection['Input'].forEach((item: any) =>{
              sources.push(item.link)
            })
            dataByDirection['Output'].forEach((item: any) =>{
              sources.push(item.link.toUpperCase())
            })
          }
          
          if(sources.length > 0)
          {
            return (sources.includes(d.source.id.toUpperCase()) && sources.includes(d.target.id.toUpperCase()))
          }else{
            return true
          }
          //return (d.source === thisNode) || (d.target === thisNode);
        })
        .style("stroke", this.channelDefaultColours[index])

    }
  }
  setAll(completed: boolean) {
    this.allComplete = completed;
    if (this.task.subtasks == null) {
      return;
    }
    this.task.subtasks.forEach(t => (t.completed = completed));
  }
  getAllChannels()
  {
    if(this.osnrData != null)
    {
      this.osnrData.forEach((device : any) => {
        let dictKey = Object.values(device);
        dictKey.forEach((key:any) => {
          if(key.includes("channel"))
          {
            let channel: string = ""
            let device_value = key.split(':')
            channel = device_value[1]
            if(this.channels.indexOf(channel) > -1)
            {
              console.log("Channel already exist")
            }else{
              this.channels.push(channel)
            }
          }
        })
      });
    }
    this.channels = this.channels.sort();
    this.channels.forEach((channel: string, index:any) =>{
      this.subtask = {
        id: index,
        name: channel,
        completed: false,
        color: this.chanellcolors[index],
        definedColor : this.defineColors[index]
      }
      this.subtasks.push(this.subtask)
    });
  }
  groupBy(arr :any, property:any) {
    return arr.reduce((memo :any, x:any) => {
      if (!memo[x[property]]) { memo[x[property]] = []; }
      memo[x[property]].push(x);
      return memo;
    }, {});
  }
  //#endregion
  //#region Firebase Methods
  public storageUrl: string = "gs://mininet-optical-file-system.appspot.com";
  //################## Firebase ###############################
  firebaseGetNodeFile() {
    let storage = getStorage();
    getDownloadURL(ref(storage, this.storageUrl + "/nodes.txt"))
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
        this.notifier.notify("error", "Firebase file failed to load!");
      });
  }
  firebaseGetLinkFile() {
    let storage = getStorage();

    getDownloadURL(ref(storage, this.storageUrl + "/links.txt"))
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
        this.firebaseStatus = "200 - Success";
        this.firebaseStatusStyle = "text-success";
      })
      .catch((error) => {
        // Handle any errors
        this.firebaseStatus = "500 - Internal Error";
        this.firebaseStatusStyle = "text-danger";
      });
  }
  public dataJsonUrl: string = "";
  firebaseGetDataFile() {
    try {
      let storage = getStorage();
      getDownloadURL(ref(storage, this.storageUrl + "/data.json"))
        .then((url) => {
          this.dataJsonUrl = url;
          this.initialize_topo();
          this.load();
          this.firebaseStatus = "200 - Success";
          this.firebaseStatusStyle = "text-success";
          this.notifier.notify("success", "Firebase server online.");
          return url;
        })
        .catch((error) => {
          // Handle any errors
          console.log(error);
          this.firebaseStatus = "500 - Internal Error";
          this.firebaseStatusStyle = "text-danger";
          this.notifier.notify("error", "An error occurred!");
        });
      //return this.dataJsonUrl;
    } catch (e) {
      console.log(e);
    }
  }
  firebaseUploadDataFile(data: string) {
    let storage = getStorage();
    let storageRef = ref(storage, this.storageUrl + "/data.json");
    uploadString(storageRef, data).then((snapshot) => {
      console.log("Parsed data uploaded to Firebase storage");
      this.firebaseGetDataFile();
    });
  }
  //#endregion
  //#region File Parse Methods
  public nodeFileString: string = "";
  public linkFileString: string = "";
  public nodeFileLoaded: boolean = false;
  public linkFileLoaded: boolean = false;
  public preLinkProcess: boolean = false;
  public preNodeProcess: boolean = false;
  public nodeFileUrl: string = "";
  public linkFileUrl: string = "";
  public regexExp =
    /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/gi;
  public osnr_base64: string = "";
  public file_upload_data: file_upload | undefined;
  //###############################################################
  loadNodeFile(event: any) {
    const file = event.target.files[0];
    console.log("type", file.type);
    if (file.type == "text/plain") {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log("content", e.target.result);
        const text = atob(e.target.result.split(",")[1]);
        this.nodeFileString = text;
      };
      reader.readAsDataURL(event.target.files[0]);
      this.nodeFileLoaded = true;
      if (this.linkFileLoaded) {
        this.bntStyle = "btn btn-xl btn-success";
      }
      this.notifier.notify("success", "Node file added.");
    } else {
      alert("Please choose the correct .txt file");
      this.resetNodeSelection();
      this.nodeFileLoaded = false;
      this.nodeFileString = "";
    }
  }
  loadLinkFile(event: any) {
    const file = event.target.files[0];
    console.log("type", file.type);
    if (file.type == "text/plain") {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log("content", e.target.result);
        const text = atob(e.target.result.split(",")[1]);
        this.linkFileString = text;
      };
      reader.readAsDataURL(event.target.files[0]);
      this.linkFileLoaded = true;
      if (this.nodeFileLoaded) {
        this.bntStyle = "btn btn-xl btn-success";
      }
      this.notifier.notify("success", "links file added.");
    } else {
      alert("Please choose the correct .txt file");
      this.resetLinkSelection();
      this.linkFileLoaded = false;
      this.linkFileString = "";
    }
  }
  loadOSNRFile(event: any) {
    const file = event.target.files[0];
    console.log("type", file.type);
    if (file.type == "text/plain") {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        console.log("content", e.target.result);
        const text = e.target.result.split(",")[1];
        this.osnr_base64 = text;
      };
      reader.readAsDataURL(event.target.files[0]);
      this.notifier.notify("success", "OSNR file added.");
    } else {
      alert("Please choose the correct .txt file");
    }
  }
  confirmLoad() {
    if (this.nodeFileString != "" && this.linkFileString != "") {
      //d3.select(this.svgContainerRef.nativeElement).selectAll("g.links").remove();//add this to remove the links
      //d3.select(this.svgContainerRef.nativeElement).selectAll("g.nodes").remove();//add this to remove the nodes
      this.linkfileParse();
      this.cdr.detectChanges();
      this.loadFileStatus = "Files loaded";
      this.loadFileStatuStyle = "text-success";
      this.notifier.notify("success", "File loaded successfully!");
    } else {
      alert("Please load node and link file");
      this.loadFileStatuStyle = "text-danger";
    }
  }
  confirmOSNRUpdate() {
    if (this.osnr_base64 != "") {
      try {
        this.file_upload_data = {
          data: "",
          base64: this.osnr_base64,
        };
        let updateOSNR: any;
        updateOSNR = this.apiService.uploadOSNRData(this.file_upload_data);
        updateOSNR.subscribe((resp: any) => {
          console.log(resp);
          if (resp.data?.length > 0) {
            this.notifierService.notify("success", "OSNR successfully updated");
          }
          if (resp.error != null) {
            this.notifierService.notify("error", "Failed to update OSNR file.");
          }
        });
      } catch (e) {
        this.notifierService.notify("error", "Error occurred on API.");
      }
    } else {
      alert("Please load OSNR text file");
    }
  }
  nodefileParse() {
    this.nodeArray = [];
    if (this.nodeFileString != "") {
      for (let line of this.nodeFileString.split(/[\r\n]+/)) {
        let nodeData: any = line.match(/\<(.*?)\>/);
        if (nodeData != null) {
          if (nodeData[1].includes("Host")) {
            this.hostParse(nodeData[1]);
          } else if (nodeData[1].includes("ROADM")) {
            this.roadmParse(nodeData[1]);
          } else if (nodeData[1].includes("OVSBridge")) {
            this.ovsbridgeParse(nodeData[1]);
          } else if (nodeData[1].includes("Terminal")) {
            this.terminalParse(nodeData[1]);
          } else {
            this.additionalParse("");
          }
        }
      }

      this.networkData.nodes = this.nodeArray;
      this.preNodeProcess = true;
      this.network = new network(this.networkData);
      console.log(this.networkData);
      if (this.isNetworkOnline) {
        this.firebaseUploadDataFile(JSON.stringify(this.network));
      }
      this.initialize_topo();
      this.load();
    } else {
      fetch(this.nodeFileUrl)
        .then((response) => response.text())
        .then((data) => {
          for (let line of data.split(/[\r\n]+/)) {
            let nodeData: any = line.match(/\<(.*?)\>/);
            if (nodeData != null) {
              if (nodeData[1].includes("Host")) {
                this.hostParse(nodeData[1]);
              } else if (nodeData[1].includes("ROADM")) {
                this.roadmParse(nodeData[1]);
              } else if (nodeData[1].includes("OVSBridge")) {
                this.ovsbridgeParse(nodeData[1]);
              } else if (nodeData[1].includes("Terminal")) {
                this.terminalParse(nodeData[1]);
              } else {
                this.additionalParse("");
              }
            }
          }
          this.networkData.nodes = this.nodeArray;
          this.preNodeProcess = true;
          this.network = new network(this.networkData);
          this.notifier.notify("success", "Online file rendered.");
          this.firebaseUploadDataFile(JSON.stringify(this.network));
        });
    }
  }

  hostParse(host: string) {
    //parse host parameter and split by ':'
    let hostData = host.split(":");
    //if hostData is not empty, then add node to networkData
    if (hostData.length > 0) {
      let source = hostData[0].replace("Host", "").replace(/\s/g, "");
      let ip = "";
      let pid = "";
      hostData[2].split(" ").forEach((element) => {
        if (this.regexExp.test(element)) {
          ip = element;
        } else if (element.includes("pid")) {
          pid = element.split("=")[1];
        }
      });
      this.addNode(source, ip, pid, "Host");
    }
  }

  roadmParse(roadm: string) {
    //parse roadm parameter and split by ':'
    let roadmData = roadm.split(",");
    //if roadmData is not empty, then add node to networkData
    if (roadmData.length > 0) {
      let source = "";
      let ip = "";
      let pid = "";
      source = roadmData[0]
        .split(":")[0]
        .replace("ROADM", "")
        .replace(/\s/g, "");
      roadmData.forEach((element) => {
        if (this.regexExp.test(element.split("lo:")[1])) {
          ip = element.split("lo:")[1];
        } else if (element.includes("pid")) {
          pid = element.split("=")[1];
        }
      });
      this.addNode(source, ip, pid, "ROADM");
    }
  }

  ovsbridgeParse(ovsbridge: string) {
    //parse ovsbridge parameter and split by ':'
    let ovsbridgeData = ovsbridge.split(",");
    //if ovsbridgeData is not empty, then add node to networkData
    if (ovsbridgeData.length > 0) {
      let source = "";
      let ip = "";
      let pid = "";
      source = ovsbridgeData[0]
        .split(":")[0]
        .replace("OVSBridge ", "")
        .replace(/\s/g, "");
      ovsbridgeData.forEach((element) => {
        if (this.regexExp.test(element.split("lo:")[1])) {
          ip = element.split("lo:")[1];
        } else if (element.includes("pid")) {
          pid = element.split("=")[1];
        }
      });
      this.addNode(source, ip, pid, "OVSBridge");
    }
  }

  terminalParse(terminal: string) {
    //parse terminal parameter and split by ':'
    let terminalData = terminal.split(",");
    //if terminalData is not empty, then add node to networkData
    if (terminalData.length > 0) {
      let source = "";
      let ip = "";
      let pid = "";
      source = terminalData[0]
        .split(":")[0]
        .replace("Terminal ", "")
        .replace(/\s/g, "");
      terminalData.forEach((element) => {
        if (this.regexExp.test(element.split("lo:")[1])) {
          ip = element.split("lo:")[1];
        } else if (element.includes("pid")) {
          pid = element.split("=")[1];
        }
      });
      this.addNode(source, ip, pid, "Terminal");
    }
  }

  additionalParse(data: any) {}

  addNode(source: string, ip: string, pid: string, deviceInfo: string) {
    let node = {
      id: source,
      device_name: source,
      netmask: "255.255.255.0",
      ip: ip,
      pid: pid,
      device_info: deviceInfo,
    };
    //example of how to add a link to the graph
    //{"source": "s0", "target_port_disp": "port_1", "source_port_disp": "port_7", "target": "s4"}
    this.nodeArray.push(node);
  }

  linkfileParse() {
    this.linksArray = [];
    if (this.linkFileString != "") {
      console.log("link file parse ", this.linkFileString);
      for (let line of this.linkFileString.split(/[\r\n]+/)) {
        let status: any = line.match(/\((.*?)\)/);
        if (status != null) {
          if (status.length > 0) {
            line.split("<->").forEach((element, i) => {
              console.log(element, i);
              element = element.replace(status[0], "");
              let sourceName = element.split("-")[0].replace(" ", "");
              let sourcePort = element.split("-")[1].replace(" ", "");
              let targetName = "";
              let targetPort = "";
              if (i == 0) {
                targetName = line
                  .split("<->")
                  [i + 1].split("-")[0]
                  .replace(status[0], "")
                  .replace(/\s/g, "");
                targetPort = line
                  .split("<->")
                  [i + 1].split("-")[1]
                  .replace(status[0], "")
                  .replace(/\s/g, "");
              } else {
                targetName = line
                  .split("<->")
                  [i - 1].split("-")[0]
                  .replace(status[0], "")
                  .replace(/\s/g, "");
                targetPort = line
                  .split("<->")
                  [i - 1].split("-")[1]
                  .replace(status[0], "")
                  .replace(/\s/g, "");
              }

              let exist = this.linksArray.filter(
                (f) =>
                  f.source === targetName.replace(" ", "") &&
                  f.target === sourceName.replace(" ", "") &&
                  f.target_port_disp === sourcePort.replace(" ", "") &&
                  f.source_port_disp === targetPort.replace(" ", "")
              );
              console.log(exist, targetName, sourceName, sourcePort);
              if (exist.length == 0) {
                this.addLink(
                  sourceName.replace(" ", ""),
                  sourcePort.replace(" ", ""),
                  targetName.replace(" ", ""),
                  targetPort.replace(" ", "")
                );
              }
            });
          }
        }
      }
      this.networkData.links = this.linksArray;
      this.preLinkProcess = true;
      this.nodefileParse();
    } else {
      fetch(this.linkFileUrl)
        .then((response) => response.text())
        .then((data) => {
          for (let line of data.split(/[\r\n]+/)) {
            let status: any = line.match(/\((.*?)\)/);
            if (status != null) {
              if (status.length > 0) {
                line.split("<->").forEach((element, i) => {
                  element = element.replace(status[0], "");
                  this.sourceName = element.split("-")[0];
                  this.sourcePort = element.split("-")[1];
                  if (i == 0) {
                    this.target = line
                      .split("<->")
                      [i + 1].split("-")[0]
                      .replace(status[0], "")
                      .replace(/\s/g, "");
                    this.targetPort = line
                      .split("<->")
                      [i + 1].split("-")[1]
                      .replace(status[0], "")
                      .replace(/\s/g, "");
                  } else {
                    this.target = line
                      .split("<->")
                      [i - 1].split("-")[0]
                      .replace(status[0], "")
                      .replace(/\s/g, "");
                    this.targetPort = line
                      .split("<->")
                      [i - 1].split("-")[1]
                      .replace(status[0], "")
                      .replace(/\s/g, "");
                  }
                  this.addLink(
                    this.sourceName,
                    this.sourcePort,
                    this.target,
                    this.targetPort
                  );
                });
              }
            }
          }
          this.networkData.links = this.linksArray;
          this.preLinkProcess = true;
          this.nodefileParse();
        });
    }
  }

  addLink(
    source: string,
    sourcePortName: string,
    target: string,
    targetPortName: string
  ) {
    let link = {
      source: source,
      target: target,
      target_port_disp: targetPortName,
      source_port_disp: sourcePortName,
    };
    //example of how to add a link to the graph
    //{"source": "s0", "target_port_disp": "port_1", "source_port_disp": "port_7", "target": "s4"}
    this.linksArray.push(link);
  }
  //###############################################################
  //#endregion
}
