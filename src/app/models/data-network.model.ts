export class topo{
    constructor(     
        public nodes:nodes[],
        public links:links[]
     ) {}
}

export class nodes{
    constructor(     
        public source:string,
        public target_port_disp:string,
        public source_port_disp:string,
        public target:string,
     ) {}
}

export class links{
    constructor(     
        public source:string,
        public target_port_disp:string,
        public source_port_disp:string,
        public target:string,
     ) {}
}