export interface SendSegmentResult{
	req_id:number;
	mask:Buffer;
	inpaint:Buffer;
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
	mask:Buffer;
	image:Buffer;
}

export interface ReplyMaskUpdate{
	req_id:number;
	status_code:number;
}