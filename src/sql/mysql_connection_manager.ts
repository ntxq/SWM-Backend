import {
	MysqlConnection,
  mysqlConnection,
  Procedure,
} from "src/sql/sql_connection";
import { IMAGE_DIR } from "src/modules/const";
import path from "path";
import { BBox } from "src/routes/upload/ocr";
import { TranslateBBox } from "src/routes/upload/ocr";
import { s3, updateBbox } from "src/modules/utils";
import { progressManager } from "src/modules/progress_manager";
import createError from "http-errors"

export class mysqlConnectionManager {
  connection: MysqlConnection;
  constructor() {
    this.connection = mysqlConnection;
  }

	async addProject(userID:number,title:string): Promise<number>{
		const procedure:Procedure = {
			query:'sp_add_project',
			parameters:[userID,title],
			selectUnique:true
		}
		const row = await mysqlConnection.callProcedure(procedure);
		return row['id'];
	}

	async addRequest(projectID:number,files:Express.Multer.File[]): Promise<Map<number,[string,string]>>{
		const ID2PathMap = new Map<number,[string,string]>();
		const procedures = Array<Procedure>();
		for(var i =0;i<files.length;i++){
			const file = files[i]
			const procedure:Procedure = {
				query:'sp_add_request',
				parameters:[projectID,file.originalname],
				callback:async (rows:any,err:any)=>{
					const requestID = rows['id']
					const new_path = path.join(IMAGE_DIR,"cut",
						`${requestID}_0${path.extname(file.originalname)}`);
					await s3.upload(new_path,file.buffer)
					ID2PathMap.set(requestID,[new_path,file.originalname])
				},
				selectUnique:true
			}
			procedures.push(procedure)
		}
		await mysqlConnection.callMultipleProcedure(procedures);
		return ID2PathMap;
	}

	async setCutCount(requestID:number,cutCount:number){
		const procedure:Procedure = {
			query:'sp_set_cut_count',
			parameters:[requestID,cutCount],
			selectUnique:true
		}
		await mysqlConnection.callProcedure(procedure);
	}

	async getCutCount(requestID:number):Promise<number>{
		const procedure:Procedure = {
			query:'sp_get_cut_count',
			parameters:[requestID],
			selectUnique:true
		}
		const rows = await mysqlConnection.callProcedure(procedure)
		return rows["cut_count"]
	}

	checkProgress(requestID:number,cutIndex:number):number{
		return progressManager.getProgress(requestID,cutIndex);
	}

	async updateProgress(requestID:number,cutIndex:number,status:string):Promise<unknown>{
		const procedure:Procedure = {
			query:'sp_update_progress_2',
			parameters:[requestID,cutIndex,status],
			selectUnique:true
		}
		const rows = await mysqlConnection.callProcedure(procedure);
		progressManager.updateProgress(requestID, cutIndex, status);
		return rows
	}

	updateUserUploadInpaint(requestID:number, type:string,cutIndex:number,filePath:string):Promise<void>{
		return this.updateCut(requestID,type,cutIndex,filePath,true)
	}

	async updateCut(requestID:number, type:string,cutIndex:number,filePath:string,isUserUploadInpaint=false):Promise<void>{
		//cut,mask,inpaint
		const path:Array<string|null> = [null,null,null,null]
		switch (type) {
			case 'cut':
				path[0] = filePath
				break;
			case 'mask':
				path[1] = filePath
				break;
			case 'mask_image':
				path[2] = filePath
				break;
			case 'inpaint':
				path[3] = filePath
				break;
		}

		const procedure:Procedure = {
			query:'sp_update_cut_2',
			parameters:[requestID,cutIndex,...path,isUserUploadInpaint],
			selectUnique:true
		}
		const rows = await mysqlConnection.callProcedure(procedure);
		progressManager.updateProgress(requestID, cutIndex, type);
		if (cutIndex !== 0) {
			progressManager.updatePart(requestID, 0, type);
		}
		else if(cutIndex === 0){
			progressManager.restoreTotalPart(requestID, 0, type);
		}
		return rows;
	}

	async setCutRanges(requestID:number, json:JSON):Promise<Array<unknown>>{
		const procedures = Array<Procedure>();
		for(const [index,range] of  Object.entries(json)){
			const procedure:Procedure = {
				query:'sp_set_cut_ranges',
				parameters:[requestID,parseInt(index),range[0],range[1]],
				selectUnique:true
			}
			procedures.push(procedure)
		}
		const rows = await mysqlConnection.callMultipleProcedure(procedures);
		progressManager.updateTotalPart(requestID, 0, "cut", Object.entries(json).length);
		return rows;
	}

	async getCutRange(requestID:number):Promise<Map<string,Array<number>>>{
		const ranges:Map<string,Array<number>> = new Map<string,Array<number>>();
		var procedure:Procedure = {
			query:'sp_get_cut_range',
			parameters:[requestID],
			selectUnique:false
		};
		const rows = await mysqlConnection.callProcedure(procedure);
		for (const row of rows) {
			ranges.set(`${row["cut_idx"]}`, [row["cut_start"], row["cut_end"]]);
		}
		return ranges;
	}
	/*
		todo 최준영
		requestID와 cutIndex가 유효하지 않은 경우 -> invalid request
		requestID와 cutIndex가 유효하고 row가 없는 경우 -> early request
		requestID와 cutIndex가 유효하고 row가 있는 경우 -> early request
	*/
	async getPath(requestID:number,type:string,cutIndex:number = 0):Promise<string>{
		var procedure:Procedure = {
			query:"sp_get_paths",
			parameters:[requestID,cutIndex],
			selectUnique:true
		};
		
    try {
			const row = await mysqlConnection.callProcedure(procedure);
      switch (type) {
        case "cut":
          return row["cut_path"];
        case "inpaint":
          return row["inpaint_path"];
        case "mask":
          return row["mask_path"];
        case "mask_image":
          return row["mask_image_path"];
        default:
          return "";
      }
    } catch (e) {
      return "";
    }
	}

	async setBboxes(requestID:number,index:number,bboxes:Array<BBox>):Promise<unknown>{
		var procedure:Procedure = {
			query:'sp_set_bbox_2',
			parameters:[requestID,index,JSON.stringify(bboxes)],
			selectUnique:true
		};
		const rows = await mysqlConnection.callProcedure(procedure);
		//todo 최준영 detect-bbox-translate-complete 단계 구분 필요
		progressManager.updateProgress(requestID, index, "complete");
		if (index !== 0) {
			progressManager.updatePart(requestID, 0, "complete");
		}
		return rows;
	}

	async getBboxes(requestID:number, cutIndex:number):Promise<Array<BBox>>{
		const result:Array<BBox> = Array<BBox>();
		var procedure:Procedure = {
			query:'sp_get_bbox_2',
			parameters:[requestID,cutIndex],
			selectUnique:true
		};
		return mysqlConnection.callProcedure(procedure).then(rows=>{
			rows = JSON.parse(rows["bboxes"])
			for(const row of rows) {
				const bbox:BBox = {
					bbox_id:row["bbox_id"],
					originalX:row["originalX"],
					originalY:row["originalY"],
					originalWidth:row["originalWidth"],
					originalHeight:row["originalHeight"],
					originalText:row["originalText"]
				}
				result.push(bbox)
			}
			return result
		})
	}

	setBboxesWithTranslate(requestID:number,cutIndex:number,updatedBboxes:TranslateBBox[]):Promise<unknown>{
		this.getBboxes(requestID,cutIndex).then((bboxes)=>{
			updatedBboxes = updateBbox(bboxes,updatedBboxes)
		})
		var procedure:Procedure = {
			query:'sp_set_bbox_2',
			parameters:[requestID,cutIndex,JSON.stringify(updatedBboxes)],
			selectUnique:true
		};
		return mysqlConnection.callProcedure(procedure)
	}
}
export const queryManager = new mysqlConnectionManager();