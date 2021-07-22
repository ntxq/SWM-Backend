

export interface ReplySendResult{
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

export interface SendResult{
	req_id:number;
	data:string;
}

export interface RequestMaskUpdate{
	req_id:number;
	mask:Buffer;
}

export interface ReplyMaskUpdate{
	req_id:number;
	mask:Buffer;
	inpaint:Buffer;
}