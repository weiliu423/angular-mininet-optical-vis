export class osnr_mapping_data{
    constructor(     
        public info:[info[]]
     ) {}
}

export class info{
    constructor(     
        public mode:string,
        public device_name:string,
        public channel:string,
        public link_component:string,
        public OSNR:string,
        public gOSNR:string,
     ) {}
}

export class file_upload{
    constructor(     
        public data:string,
        public base64:string,
     ) {}
}
