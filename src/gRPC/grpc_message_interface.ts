export interface SendImage{
	req_id:number;
	type:string;
	index:number;
	image:Buffer;
	is_rgba:boolean;
	width:number;
	height:number;
	filename:string;
}

export interface ReceiveImage{
	success:boolean;
}

export interface SendJson{
	req_id:number;
	type:string;
	data:string;
	filename:string;
}

export interface ReceiveJson{
	success:boolean;
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
	mask_rles:Buffer[];
	image:Buffer;
	cut_ranges:string;
}

export interface ReplyMaskUpdate{
	req_id:number;
	status_code:number;
}

export interface SendUpdateProgress{
	req_id:number;
	status:string;
}

export interface ReplySendUpdateProgress{
}