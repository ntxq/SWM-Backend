import {
  mysqlConnection,
  Procedure,
  SelectUniqueResult,
} from "./sql_connection";
import fs from "node:fs";
import path from "node:path";

async function backup() {
  const procedure: Procedure = {
    query: "sp_get_stored_procedures",
    parameters: [],
    selectUnique: false,
  };
  const rows = (await mysqlConnection.callProcedure(
    procedure
  )) as Array<SelectUniqueResult>;
  for (const row of rows) {
    const text = row["ROUTINE_DEFINITION"] as string;
    const title = row["SPECIFIC_NAME"] as string;
    const path_string = path.posix.join(
      path.posix.resolve(),
      "sp",
      `${title}.sql`
    );
    if (fs.existsSync(path_string)) {
      const read = fs.readFileSync(path_string);
      if (text !== read.toString()) {
        fs.writeFileSync(path_string, text);
      } else {
        console.log(path_string);
      }
    } else {
      fs.writeFileSync(path_string, text);
    }
  }
}
backup().then(
  () => {
    console.log("complete");
  },
  (error) => {
    console.error(error);
  }
);
