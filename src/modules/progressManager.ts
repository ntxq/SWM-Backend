import { mysql_connection, Procedure } from "src/sql/sql_connection";

const progressed = {
	start:0,
	cut:5,
	mask:30,
	inpaint:100,
	detect:110,
	bbox:130,
	translate:180,
	complete:200,
}

function nextStateValue(status:string):number{
	switch(status){
		case "start":
			return progressed.cut;
		case "cut":
			return progressed.mask;
		case "mask":
			return progressed.inpaint;
		case "inpaint":
			return progressed.detect;
		case "detect":
			return progressed.bbox;
		case "bbox":
			return progressed.translate;
		case "translate":
			return progressed.complete;
		case "complete":
			return progressed.complete;
	}
	return progressed.complete
}

class Progress{
	req_id:number;
	cut_idx:number;
	status:string;
	lastUpdateTime:number;
	progressed:number;
	progress_default_speed:number;
	total_parts:number;
	previous_total_parts:number;
	progressed_parts:number;


	constructor(req_id:number,cut_idx:number){
		this.req_id = req_id;
		this.cut_idx = cut_idx;
		this.status = "start"
		this.progressed = progressed.start
		this.progress_default_speed = 0.2;
		this.total_parts = 1;
		this.previous_total_parts = 0;
		this.progressed_parts = 0;
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
		this.progressed_parts = 0;
		this.previous_total_parts = this.total_parts
		this.total_parts = 1;
		switch(this.status){
			case "start":
				this.progressed = progressed.start
				this.progress_default_speed = 0.2
				break;
			case "cut":
				this.progressed = progressed.cut
				this.progress_default_speed = 1
				break;
			case "mask":
				this.progressed = progressed.mask
				this.progress_default_speed = 0.25
				break;
			case "inpaint":
				this.progressed = progressed.inpaint
				this.progress_default_speed = 1
				break;
			case "detect":
				this.progressed = progressed.detect
				this.progress_default_speed = 0.5
				break;
			case "bbox":
				this.progressed = progressed.bbox
				this.progress_default_speed = 0.5
				break;
			case "translate":
				this.progressed = progressed.translate
				this.progress_default_speed = 0.5
				break;
			case "complete":
				this.progressed = progressed.complete
				this.progress_default_speed = 0
				break;
		}
		
	}

	updatePart(status:string){
		if(status !== this.status){
			return;
		}
		if(this.progressed_parts+1 >= this.total_parts){
			return;
		}
		this.progressed_parts += 1
	}

	updateTotalPart(status:string,count:number){
		if(status !== this.status){
			return;
		}
		this.progressed_parts = 0
		this.total_parts = count
	}

	restoreTotalPart(status:string){
		if(status !== this.status){
			return;
		}
		this.progressed_parts = 0
		this.total_parts = this.previous_total_parts
	}

	getProgress(){
		const time_diff = (Date.now() - this.lastUpdateTime)/1000;
		const parts_progress = this.progressed_parts / this.total_parts
		const progress = Math.min(
			this.progressed
				+ parts_progress * (nextStateValue(this.status) - this.progressed)
			  + time_diff * this.progress_default_speed,
			nextStateValue(this.status))
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

	updatePart(req_id:number,cut_idx:number,status:string){
		if(this.progress_map.get(req_id)?.has(cut_idx)){
			this.getProgressClass(req_id,cut_idx).updatePart(status);
		}
	}

	updateTotalPart(req_id:number,cut_idx:number,status:string,count:number){
		if(this.progress_map.get(req_id)?.has(cut_idx)){
			this.getProgressClass(req_id,cut_idx).updateTotalPart(status,count);
		}
	}
	
	restoreTotalPart(req_id:number,cut_idx:number,status:string){
		if(this.progress_map.get(req_id)?.has(cut_idx)){
			this.getProgressClass(req_id,cut_idx).restoreTotalPart(status);
		}
	}
}

export const progressManager = new ProgressManager()