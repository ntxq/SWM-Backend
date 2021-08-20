import {
  mysqlConnection,
  mysql_connection,
  Procedure,
} from "./sql_connection";
import fs from "fs";
import path from "path";

async function backup(){
	var procedure:Procedure = {
		query:"sp_get_stored_procedures",
		parameters:[],
		select_unique:false
	};
	const rows = await mysql_connection.callProcedure(procedure);
	for(const row of rows[0]){
		console.log(row)
		const text = row["ROUTINE_DEFINITION"]
		const title = row["SPECIFIC_NAME"]
		console.log(path.join(__dirname,"..","sp",title))
		fs.writeFileSync(path.join(__dirname,"..","..","sp",`${title}.sql`),text)
	}
}
backup()
