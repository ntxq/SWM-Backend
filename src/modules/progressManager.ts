import { mysql_connection, Procedure } from "src/sql/sql_connection";

class Progress{
	req_id:number;
	cut_idx:number;
	status:string;
	lastUpdateTime:number;
	constructor(req_id:number,cut_idx:number){
		this.req_id = req_id;
		this.cut_idx = cut_idx;
		this.status = "start"
		this.initStatus().then((status)=>{
			this.status = status
		})
		this.lastUpdateTime = Date.now()
	}

	async initStatus():Promise<string> {
		const procedure:Procedure = {
			query:"sp_check_progress_3",
			parameters:[this.req_id,this.cut_idx],
			select_unique:true
		}
		return mysql_connection.callProcedure(procedure).then((rows)=>{
			return rows["complete"]
		})
	}

	updateStatus(status:string){
		this.status = status;
		this.lastUpdateTime = Date.now()
	}

	getProgress(){
		var progress = 0
		const time_diff = (Date.now() - this.lastUpdateTime)/1000;
		switch(this.status){
			case "start":
				progress = time_diff/5;
				break;
			case "cut":
				progress = 5 + time_diff;
				break;
			case "mask":
				progress = 30 + time_diff/4;
				break;
			case "inpaint":
				progress = 100 + time_diff;
				break;
			case "detect":
				progress = 110 + time_diff/2;
				break;
			case "bbox":
				progress = 130 + time_diff/2;
				break;
			case "translate":
				progress = 180 + time_diff/2;
				break;
			case "complete":
				progress = 200
				break;
		}
		return Math.floor(progress);
	}
}

class ProgressManager{
	progress_map:Map<number,Map<number,Progress>>
	constructor(){
		this.progress_map = new Map<number,Map<number,Progress>>();
	}

	getProgressClass(req_id:number,cut_idx:number){
		if(this.progress_map.has(req_id) === false){
			this.progress_map.set(req_id,new Map<number,Progress>());
		}
		const progress_request = this.progress_map.get(req_id) as Map<number,Progress>

		if(progress_request.has(cut_idx) === false){
			progress_request.set(cut_idx,new Progress(req_id,cut_idx));
		}
		const progress_cut = progress_request.get(cut_idx) as Progress
		return progress_cut
	}

	getProgress(req_id:number,cut_idx:number):number{
		var progress = this.getProgressClass(req_id,cut_idx).getProgress()
		//0~200사이 범위로 제한
		progress = Math.max(0,Math.min(200,progress))
		return progress
	}

	updateProgress(req_id:number,cut_idx:number,status:string){
		this.getProgressClass(req_id,cut_idx).updateStatus(status)
	}
}

export const progressManager = new ProgressManager()