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
    console.log(row);
    const text = row["ROUTINE_DEFINITION"] as string;
    const title = row["SPECIFIC_NAME"] as string;
    fs.writeFileSync(path.join(path.resolve(), "sp", `${title}.sql`), text);
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
