export class DataNetwork{
    constructor(     
        public nodes:nodes[],
        public links:links[]
     ) {}
}

export class nodes{
    constructor(     
        public id:string,
        public name:string
     ) {}
}

export class links{
    constructor(     
        public source:number,
        public target:number
     ) {}
}