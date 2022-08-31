export class sigtraceData{
    constructor(     
        public Channel:string,
        public direction:string,
        public link:string,
        public power:number,
        public ase_noise:number,
        public nli_noise:number,
     ) {}
}