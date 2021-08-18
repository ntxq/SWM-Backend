import createError from "http-errors"
import mysql, { Connection } from 'mysql';
import { dbConnection } from 'src/sql/secret'

export interface Procedure{
	query:string;
	parameters:Array<any>;
	callback?:Function;
	select_unique:boolean;
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
	 
	async callProcedure(procedure:Procedure){
		const rows = await this.callMultipleProcedure([procedure]);
		return rows[0];
	}

	callMultipleProcedure(procedures:Array<Procedure>){
		return new Promise<Array<any>>((resolve,reject)=>{
			this.connection.getConnection((err,conn)=>{
				if(err){
					console.error(err);
					reject(new createError.InternalServerError)
					return;
				}
				conn.beginTransaction(async ()=>{
					Promise.all(
						Array.from(procedures, procedure => this.execAsyncQuery(conn,procedure))
					).then((rows)=>{
						conn.commit();
						conn.release();
						resolve(rows)
					}).catch((err)=>{
						conn.commit();
						conn.release();
						if(err instanceof createError.HttpError){
							reject(err)
						}
						else{
							reject(new createError.InternalServerError)
						}
					})
				})
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
					if(err.sqlState?.startsWith("SP")){
						rejects(createError(err.sqlState.slice(2)))
					}
					else{
						rejects(new createError.InternalServerError)
					}
					return;
				}

				//Array라는 건 마지막이 OkPacket이라는 뜻
				if(Array.isArray(rows)){
					rows.pop()
				}
				//단순 update문으로 OkPacket만 오는 경우는 parsing하지않는다
				if(procedure.select_unique && Array.isArray(rows)){
					if(rows[0][0] === undefined){
						resolve(undefined)
						return;
					}
					rows = JSON.parse(JSON.stringify(rows[0][0]));
				}

				if(procedure.callback){
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