import {
  mysqlConnection,
  Procedure,
  SelectMultipleResult,
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
  )) as SelectMultipleResult;
  const results = rows[0] as SelectMultipleResult;
  for (const row of results) {
    console.log(row);
    const text = (row as SelectUniqueResult)["ROUTINE_DEFINITION"] as string;
    const title = (row as SelectUniqueResult)["SPECIFIC_NAME"] as string;
    console.log(path.join(path.resolve(), "..", "sp", title));
    fs.writeFileSync(
      path.join(path.resolve(), "..", "..", "sp", `${title}.sql`),
      text
    );
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
