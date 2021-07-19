import { Response } from 'express';
import mysql from 'mysql';
import { dbConnection } from './secret'

type SQLErrorFunction = (err:string)=>void;

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
	 
	callProcedure(procedure:string,params:Array<any>,callback:Function,onError:SQLErrorFunction|Response){
		const question_marks_arr = Array(params.length).fill('?');
		const question_marks = question_marks_arr.join(',')
		const sql = `CALL ${procedure}(${question_marks});`
		this.connection.query(sql,params,function(err, rows, fields){
			if(err){
				//여튼 뭔가 에러뜸
				if(typeof(onError) === "function"){
					onError(err.message)
				}
				else{
					console.log(err.message)
					const res:Response = onError;
					res.status(500).send({message:"mysql procedure broken."})
				}
				return
			}

			try{
				callback(...rows[0])
			}
			catch(error){
				console.error(error.message)
				if(typeof(onError) === "function"){
					onError(error.message)
				}
				else{
					const res:Response = onError;
					res.status(500).send({message:"mysql procedure broken."})
				}
				return
			}
		})
	}

	destroy_connection() {
		this.connection.end();
	}
}

export const mysql_connection = new mysqlConnection()