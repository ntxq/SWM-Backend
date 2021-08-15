import { mysqlConnection, mysql_connection, Procedure } from 'src/sql/sql_connection';
import { IMAGE_DIR } from 'src/modules/const';
import fs from 'fs';
import path from 'path';
import { BBox } from 'src/routes/upload/ocr';
import { TranslateBBox } from 'src/routes/upload/ocr';
import { update_bbox } from 'src/modules/utils';
export class mysqlConnectionManager{
	connection:mysqlConnection;
	constructor(){
		this.connection = mysql_connection
	}

	add_project(user_id:number,title:string){
		const procedure:Procedure = {
			query:'sp_add_project',
			parameters:[user_id,title],
			select_unique:true
		}
		return mysql_connection.callProcedure(procedure)
		.then(row=>{
				return row['id']
		})
	}

	add_request(project_id:number,files:Express.Multer.File[]){
		const path_id_map = new Map<number,[string,string]>();
		const procedures = Array<Procedure>();
		for(var i =0;i<files.length;i++){
			const file = files[i]
			const procedure:Procedure = {
				query:'sp_add_request',
				parameters:[project_id,file.originalname],
				callback:(rows:any,err:any)=>{
					const req_id = rows['id']
					const old_path = file.path
					const new_path = `${IMAGE_DIR}/cut/${req_id}_0${path.extname(file.originalname)}`
					fs.renameSync(old_path, new_path)
					path_id_map.set(req_id,[new_path,file.originalname])
				},
				select_unique:true
			}
			procedures.push(procedure)
		}
		return mysql_connection.callMultipleProcedure(procedures).then(()=>{
			return path_id_map
		})
	}

	check_progress(req_id:number,status:string,index:number){
		const procedure:Procedure = {
			query:'sp_check_progress_2',
			parameters:[req_id,index,status],
			select_unique:true
		}
		return mysql_connection.callProcedure(procedure)
			.then(row=>{
				return Boolean(row['complete'])
			})
	}

	update_progress(req_id:number,index:number,status:string){
		const procedure:Procedure = {
			query:'sp_update_progress_2',
			parameters:[req_id,index,status],
			select_unique:true
		}
		return mysql_connection.callProcedure(procedure)
	}

	update_user_upload_inpaint(req_id:number, type:string,index:number,filepath:string){
		return this.update_cut(req_id,type,index,filepath,true)
	}

	update_cut(req_id:number, type:string,index:number,filepath:string,is_user_upload_inpaint=false){
		//cut,mask,inpaint
		const path:Array<string|null> = [null,null,null,null]
		switch (type) {
			case 'cut':
				path[0] = filepath
				break;
			case 'mask':
				path[1] = filepath
				break;
			case 'mask_image':
				path[2] = filepath
				break;
			case 'inpaint':
				path[3] = filepath
				break;
		}

		const procedure:Procedure = {
			query:'sp_update_cut_2',
			parameters:[req_id,index,...path,is_user_upload_inpaint],
			select_unique:true
		}
		return mysql_connection.callProcedure(procedure)
	}

	set_cut_ranges(req_id:number, json:JSON){
		const procedures = Array<Procedure>();
		for(const [index,range] of  Object.entries(json)){
			const procedure:Procedure = {
				query:'sp_set_cut_ranges',
				parameters:[req_id,parseInt(index),range[0],range[1]],
				select_unique:true
			}
			procedures.push(procedure)
		}
		return mysql_connection.callMultipleProcedure(procedures)
	}

	get_cut_range(req_id:number){
		const ranges:Map<string,Array<number>> = new Map<string,Array<number>>();
		var procedure:Procedure = {
			query:'sp_get_cut_range',
			parameters:[req_id],
			select_unique:false
		};
		return mysql_connection.callProcedure(procedure)
		.then(rows=>{
			for(const row of rows) {
				ranges.set(`${row["cut_idx"]}`, [row["cut_start"],row["cut_end"]])
			}
			return ranges
		})
	}

	get_path(req_id:number,type:string,index:number = 0){
		var procedure:Procedure = {
			query:'sp_get_paths',
			parameters:[req_id,index],
			select_unique:true
		};
		return mysql_connection.callProcedure(procedure)
			.then(row=>{
				switch(type){
					case "cut":
								return row['cut_path']
					case "inpaint":
								return row['inpaint_path']
					case "mask":
								return row['mask_path']
					case "mask_image":
								return row['mask_image_path']
				}	
			})
	}

	set_bboxes(req_id:number,index:number,bboxes:Array<BBox>){
		var procedure:Procedure = {
			query:'sp_set_bbox_2',
			parameters:[req_id,index,JSON.stringify(bboxes)],
			select_unique:true
		};
		return mysql_connection.callProcedure(procedure)
	}

	get_bboxes(req_id:number, cut_idx:number){
		const result:Array<BBox> = Array<BBox>();
		var procedure:Procedure = {
			query:'sp_get_bbox_2',
			parameters:[req_id,cut_idx],
			select_unique:true
		};
		return mysql_connection.callProcedure(procedure).then(rows=>{
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

	set_bboxes_with_translate(req_id:number,index:number,updated_bboxes:TranslateBBox[]){
		this.get_bboxes(req_id,index).then((bboxes)=>{
			updated_bboxes = update_bbox(bboxes,updated_bboxes)
		})
		var procedure:Procedure = {
			query:'sp_set_bbox_2',
			parameters:[req_id,index,JSON.stringify(updated_bboxes)],
			select_unique:true
		};
		return mysql_connection.callProcedure(procedure)
	}
}
export const queryManager = new mysqlConnectionManager();