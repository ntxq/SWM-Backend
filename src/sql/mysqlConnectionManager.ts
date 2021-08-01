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
			case 'mask':
				path[1] = filepath
			case 'inpaint':
				path[2] = filepath
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
}
export const queryManager = new mysqlConnectionManager();