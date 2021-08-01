import { mysqlConnection, mysql_connection, Procedure } from 'src/sql/sql_connection';
import mysql, { Connection } from 'mysql';
import { IMAGE_DIR } from 'src/modules/const';
import fs from 'fs';
import path from 'path';
export class mysqlConnectionManager{
	connection:mysqlConnection;
	constructor(){
		this.connection = mysql_connection
	}

	add_project(user_id:number,title:string){
		return new Promise<number>((resolve, reject) => {
			const procedure:Procedure = {
				query:'sp_add_project',
				parameters:[user_id,title],
				callback:(rows:any,err:any)=>{
					rows = rows[0]
					if(err) {
						reject(err);
						return;
					}
					const req_id:number = rows['id']
					resolve(req_id)
				}
			}
			mysql_connection.callProcedure(procedure)
		})
	}

	add_original_sources(project_id:number,files:Express.Multer.File[]){
		const req_id_map = new Map<string,number>();
		const path_id_map = new Map<number,string>();
		const procedures = Array<Procedure>();
		for(var i =0;i<files.length;i++){
			const file = files[i]
			const procedure:Procedure = {
				query:'sp_add_request',
				parameters:[project_id,file.originalname],
				callback:(rows:any,err:any)=>{
					const req_id = rows['id']
					const old_path = file.path
					const new_path = `${IMAGE_DIR}/original/${req_id}${path.extname(file.originalname)}`
					fs.promises.rename(old_path, new_path)
					req_id_map.set(file.originalname,req_id)
					path_id_map.set(req_id,new_path)
				}
			}
			procedures.push(procedure)
		}
		return new Promise<[Map<string,number>,Map<number,string>]>((resolve, reject) => {
			mysql_connection.callMultipleProcedure(procedures,(err:any,result:any)=>{
				resolve([req_id_map,path_id_map])
			})
		})
	}

	set_original_file_paths(path_id_map:Map<number,string>){
		const procedures = Array<Procedure>();
		for(const [req_id,path] of path_id_map){
			const procedure:Procedure = {
				query:'sp_set_original_file_path',
				parameters:[req_id,path],
				callback:()=>{}
			}
			procedures.push(procedure)
		}
		return new Promise<void>((resolve, reject) => {
			mysql_connection.callMultipleProcedure(procedures,(err:any,result:any)=>{
				resolve()
			})
		})
	}

	set_blanks(id_path_map:Map<number,string>){
		const procedures = Array<Procedure>();
		var status_code = 200
		for(const [req_id,file_path] of id_path_map){
			const procedure:Procedure = {
				query:'sp_set_blank',
				parameters:[req_id,file_path],
				callback:(rows:any,err:any)=>{
					if(err) status_code = 400;
				}
			}
			procedures.push(procedure)
		}
		return new Promise<number>((resolve, reject) => {
			mysql_connection.callMultipleProcedure(procedures,(err:any,result:any)=>{
				if(err){
					resolve(400)
					return;
				}
				resolve(status_code)
			})
		})
	}

	check_progress(req_id:number,status:string){
		return new Promise<boolean>((resolve, reject) => {
			const procedure:Procedure = {
				query:'sp_check_progress',
				parameters:[req_id,status],
				callback:(rows:any,err:any)=>{
					rows = rows[0]
					if(err) {
						reject(err);
						return;
					}
					const complete:boolean = Boolean(rows['complete'])
					resolve(complete)
				}
			}
			mysql_connection.callProcedure(procedure)
		})
	}

	update_progress(req_id:number,status:string){
		return new Promise<void>((resolve, reject) => {
			const procedure:Procedure = {
				query:'sp_update_progress',
				parameters:[req_id,status],
				callback:(rows:any,err:any)=>{
					if(err) {
						reject(err);
						return;
					}
					resolve()
				}
			}
			mysql_connection.callProcedure(procedure)
		})
	}

	update_cut(req_id:number, type:string,index:number,filepath:string){
		//cut,mask,inpaint
		const path:Array<string|null> = [null,null,null]
		switch (type) {
			case 'cut':
				path[0] = filepath
				break;
			case 'mask':
				path[1] = filepath
				break;
			case 'inpaint':
				path[2] = filepath
				break;
		}
		return new Promise<void>((resolve, reject) => {

			const procedure:Procedure = {
				query:'sp_update_cut',
				parameters:[req_id,index,...path],
				callback:(rows:any,err:any)=>{
					if(err) {
						reject(err);
						return;
					}
					resolve()
				}
			}
			mysql_connection.callProcedure(procedure)
		})
	}

	set_cut_ranges(req_id:number, json:JSON){
		const procedures = Array<Procedure>();
		for(const [index,range] of  Object.entries(json)){
			console.log(index,range)
			const procedure:Procedure = {
				query:'sp_set_cut_ranges',
				parameters:[req_id,parseInt(index),range[0],range[1]],
				callback:(rows:any,err:any)=>{ }
			}
			procedures.push(procedure)
		}
		return new Promise<void>((resolve, reject) => {
			mysql_connection.callMultipleProcedure(procedures,(err:any,result:any)=>{
				if(err){
					return;
				}
				resolve()
			})
		})
	}

	get_cut_range(req_id:number){
		return new Promise<Map<string,Array<number>>>((resolve, reject) => {
			const ranges:Map<string,Array<number>> = new Map<string,Array<number>>();
			var procedure:Procedure = {
				query:'sp_get_cut_range',
				parameters:[req_id],
				callback:(rows:any,err:any)=>{ 
					console.log(rows)
					for(const row of rows) {
						console.log(row)
						ranges.set(`${row["cut_idx"]}`, [row["cut_start"],row["cut_end"]])
					}
					console.log(ranges)
					resolve(ranges)
				}
			};
			mysql_connection.callProcedure(procedure)
		})
	}

	get_path(req_id:number,type:string,index:number = 0){
		var procedure:Procedure = {query:"",parameters:[],callback:()=>{}};
		return new Promise<string>((resolve, reject) => {
			switch(type){
				case "original":
					procedure = {
						query:'sp_get_original_path',
						parameters:[req_id],
						callback:(rows:any,err:any)=>{ 
							rows = rows[0]
							resolve(rows['path'])
						}
					}
					break
				case "cut":
					procedure = {
						query:'sp_get_paths',
						parameters:[req_id,index],
						callback:(rows:any,err:any)=>{ 
							rows = rows[0]
							resolve(rows['cut_path'])
						}
					}
					break;
				case "inpaint":
					procedure = {
						query:'sp_get_paths',
						parameters:[req_id,index],
						callback:(rows:any,err:any)=>{ 
							rows = rows[0]
							resolve(rows['inpaint_path'])
						}
					}
					break;
				case "mask":
					procedure = {
						query:'sp_get_paths',
						parameters:[req_id,index],
						callback:(rows:any,err:any)=>{ 
							rows = rows[0]
							resolve(rows['mask_path'])
						}
					}
					break
			}
			mysql_connection.callProcedure(procedure)
		})
	}
}
export const queryManager = new mysqlConnectionManager();