export interface SendImage{
	req_id:number;
	type:string;
	cut_index:number;
	image:Buffer;
	is_rgba:boolean;
	width:number;
	height:number;
	file_name:string;
}

export interface ReceiveImage{
	success:boolean;
}

export interface SendJson{
	req_id:number;
	cut_index:number;
	type:string;
	data:string;
	file_name:string;
}

export interface ReceiveJson{
	success:boolean;
}

export interface RequestMakeCut{
	req_id:number;
	type:string;
	image:Buffer;
}

export interface ReplyRequestMakeCut{
	req_id:number;
	cut_count:number;
}

export interface RequestStart{
	req_id:number;
	cut_index:number;
	image:Buffer;
}

export interface ReplyRequestStart{
	req_id:number;
	status_code:number;
}

export interface RequestMaskUpdate{
	req_id:number;
	mask_rles:Buffer[];
	cut_index:number;
	image:Buffer;
	cut_ranges:string;
}

export interface ReplyMaskUpdate{
	req_id:number;
	status_code:number;
}