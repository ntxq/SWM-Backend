import fs from 'fs';
import { IMAGE_DIR } from 'src/modules/const';
export function req_now_step(req_id:number,step:number){
	return step+1
}

export function save_ocr_result(data:number){
	return 0
}

export function req_ocr_result(req_id:number){
	const sample_data = {
		req_id:{},
		boxes:[
			{
				left:0,
				right:10,
				top:1,
				bottom:9,
			}
		]
	}
	return sample_data
}
