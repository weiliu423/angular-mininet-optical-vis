export class network{
    constructor(     
        public topo:topo
     ) {}
}

export class topo{
    constructor(     
        public nodes:nodes[],
        public links:links[]
     ) {}
}

export class nodes{
    constructor(     
        public ip:string,
        public netmask:string = '255.255.255.0',
        public device_name:string,
        public id:string,
        public pid:string,
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