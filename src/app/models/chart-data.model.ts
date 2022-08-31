import { sigtraceData } from "./sigtrace-resp.model";

export class chartData{
    constructor(     
        public channelName:string,
        public observations: direction,
     ) {}
}

export class direction{
    constructor(     
        public Input:sigtraceData[],
        public Output: sigtraceData[],
     ) {}
}