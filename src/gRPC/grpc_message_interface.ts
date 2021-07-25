export interface SendImage{
	filename:string;
	image:Buffer;
	is_rgba:boolean;
	width:number;
	height:number;
}

export interface ReceiveImage{
	success:boolean;
}

export interface SendJson{
	filename:string;
	data:string;
}

export interface ReceiveJson{
	success:boolean;
}

export interface SendSegmentResult{
	req_id:number;
	mask:Buffer;
	inpaint:Buffer;
	width:number;
	height:number;
}

export interface ReplySendSegmentResult{
	req_id:number;
	status_code:number;
}

export interface RequestStart{
	req_id:number;
	image:Buffer;
}

export interface ReplyRequestStart{
	req_id:number;
	status_code:number;
}

export interface RequestMaskUpdate{
	req_id:number;
	mask:Buffer[];
	image:Buffer;
}

export interface ReplyMaskUpdate{
	req_id:number;
	status_code:number;
}