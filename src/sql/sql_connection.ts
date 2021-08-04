import { Response } from 'express';
import mysql, { Connection } from 'mysql';
import { dbConnection } from './secret'

export interface Procedure{
	query:string;
	parameters:Array<any>;
	callback:Function;
}

class mysqlConnection{
	connection:mysql.Pool;
	constructor(){
		this.connection = this.connect();
	}
	
	connect():mysql.Pool{
		const connection = mysql.createPool({
			connectionLimit: 10,
			host:dbConnection.host,
			user:dbConnection.user,
			password:dbConnection.password,
			port:dbConnection.port,
			database:`Omniscient Translator Database`,
			multipleStatements: true,
			charset : 'utf8_general_ci'
		});
		connection.on('error', (err) => {
			console.log('db error', err);
			if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
			  return this.connect();
			} else {
			  throw err;
			}
		}); 
		return connection
	}
	 
	callProcedure(procedure:Procedure){
		const question_marks_arr = Array(procedure.parameters.length).fill('?');
		const question_marks = question_marks_arr.join(',')
		const sql = `CALL ${procedure.query}(${question_marks});`
		this.connection.query(sql,procedure.parameters,function(err, rows, fields){
			if(err){
				console.error(err.message)
				procedure.callback(rows,err)
				return
			}

			try{
				procedure.callback(rows[0],null)
			}
			catch(error){
				procedure.callback(rows,err)
				return
			}
		})
	}

	callMultipleProcedure(procedures:Array<Procedure>,callback:Function){
		this.connection.getConnection((err,conn)=>{
			if(err){
				console.error(err);
				throw err;
			}
			conn.beginTransaction(async ()=>{
				try{
					for(var i = 0;i<procedures.length;i++){
						const procedure = procedures[i];
						await this.execAsyncQuery(conn,procedure)
					}
					conn.commit();
					conn.release();
					callback(null,null)
				} catch(error){
					console.error(error);
					conn.rollback();
					conn.release();
					callback(error,null)
				}
			})
		})
	}

	private execAsyncQuery(conn:Connection,procedure:Procedure){
		return new Promise((resolve,rejects)=>{
			const question_marks_arr = Array(procedure.parameters.length).fill('?');
			const question_marks = question_marks_arr.join(',')
			const sql = `CALL ${procedure.query}(${question_marks});`
			conn.query(sql,procedure.parameters,function(err, rows, fields){
				if(err){
					console.error(err.message)
					procedure.callback(rows,err)
					rejects(err)
				}
				if(Array.isArray(rows)){
					const result = JSON.parse(JSON.stringify(rows[0][0]));
					if(result.error_msg){
						procedure.callback(null,result.error_msg)
						rejects(result.error_msg)
					}
					procedure.callback(result,null)
				}
				else{
					procedure.callback(rows,null)
				}
				resolve(rows)
			})
		});
	}

	destroy_connection() {
		this.connection.end();
	}
}

export const mysql_connection = new mysqlConnection()
export { mysqlConnection }