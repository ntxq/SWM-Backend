import {
  MysqlConnection,
  mysqlConnection,
  Procedure,
  SelectUniqueResult,
} from "src/sql/sql_connection";
import { IMAGE_DIR } from "src/modules/const";
import path from "node:path";
import { BBox, TranslateBBox } from "src/routes/upload/ocr";

import { s3, updateBbox } from "src/modules/utils";
import { progressManager } from "src/modules/progress_manager";

export class mysqlConnectionManager {
  connection: MysqlConnection;
  constructor() {
    this.connection = mysqlConnection;
  }

  async addProject(userID: number, title: string): Promise<number> {
    const procedure: Procedure = {
      query: "sp_add_project",
      parameters: [userID, title],
      selectUnique: true,
    };
    const row = (await mysqlConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    return row["id"] as number;
  }

  async addRequest(
    projectID: number,
    files: Express.Multer.File[]
  ): Promise<Map<number, [string, string]>> {
    const ID2PathMap = new Map<number, [string, string]>();
    const procedures = new Array<Procedure>();
    for (const file of files) {
      const procedure: Procedure = {
        query: "sp_add_request",
        parameters: [projectID, file.originalname],
        selectUnique: true,
      };
      procedures.push(procedure);
    }
    const rows = (await mysqlConnection.callMultipleProcedure(
      procedures
    )) as Array<SelectUniqueResult>;

    for (const [index, row] of rows.entries()) {
      const requestID = row["id"] as number;
      const file = files[index];
      const new_path = path.join(
        IMAGE_DIR,
        "cut",
        `${requestID}_0${path.extname(file.originalname)}`
      );
      await s3.upload(new_path, file.buffer);
      ID2PathMap.set(requestID, [new_path, file.originalname]);
    }
    return ID2PathMap;
  }

  async setCutCount(requestID: number, cutCount: number): Promise<void> {
    const procedure: Procedure = {
      query: "sp_set_cut_count",
      parameters: [requestID, cutCount],
      selectUnique: true,
    };
    await mysqlConnection.callProcedure(procedure);
  }

  async getCutCount(requestID: number): Promise<number> {
    const procedure: Procedure = {
      query: "sp_get_cut_count",
      parameters: [requestID],
      selectUnique: true,
    };
    const rows = (await mysqlConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    return rows["cut_count"] as number;
  }

  checkProgress(requestID: number, cutIndex: number): number {
    return progressManager.getProgress(requestID, cutIndex);
  }

  async updateProgress(
    requestID: number,
    cutIndex: number,
    status: string
  ): Promise<unknown> {
    const procedure: Procedure = {
      query: "sp_update_progress_2",
      parameters: [requestID, cutIndex, status],
      selectUnique: true,
    };
    const rows = await mysqlConnection.callProcedure(procedure);
    progressManager.updateProgress(requestID, cutIndex, status);
    return rows;
  }

  updateUserUploadInpaint(
    requestID: number,
    type: string,
    cutIndex: number,
    filePath: string
  ): Promise<void> {
    return this.updateCut(requestID, type, cutIndex, filePath, true);
  }

  async updateCut(
    requestID: number,
    type: string,
    cutIndex: number,
    filePath: string,
    isUserUploadInpaint = false
  ): Promise<void> {
    //cut,mask,inpaint
    const default_value = Object.create(null) as null;
    const path: Array<string | null> = [
      default_value,
      default_value,
      default_value,
      default_value,
    ];
    switch (type) {
      case "cut":
        path[0] = filePath;
        break;
      case "mask":
        path[1] = filePath;
        break;
      case "mask_image":
        path[2] = filePath;
        break;
      case "inpaint":
        path[3] = filePath;
        break;
    }

    const procedure: Procedure = {
      query: "sp_update_cut_2",
      parameters: [requestID, cutIndex, ...path, isUserUploadInpaint],
      selectUnique: true,
    };
    await mysqlConnection.callProcedure(procedure);
    progressManager.updateProgress(requestID, cutIndex, type);
    if (cutIndex !== 0) {
      progressManager.updatePart(requestID, 0, type);
    } else if (cutIndex === 0) {
      progressManager.restoreTotalPart(requestID, 0, type);
    }
  }

  async setCutRanges(requestID: number, json: JSON): Promise<Array<unknown>> {
    const procedures = new Array<Procedure>();
    type CutRangeArray = Array<[string, Array<number>]>;

    for (const [index, range] of Object.entries(json) as CutRangeArray) {
      const procedure: Procedure = {
        query: "sp_set_cut_ranges",
        parameters: [requestID, Number.parseInt(index), range[0], range[1]],
        selectUnique: true,
      };
      procedures.push(procedure);
    }
    const rows = await mysqlConnection.callMultipleProcedure(procedures);
    progressManager.updateTotalPart(
      requestID,
      0,
      "cut",
      Object.entries(json).length
    );
    return rows;
  }

  async getCutRange(requestID: number): Promise<Map<string, Array<number>>> {
    const ranges: Map<string, Array<number>> = new Map<string, Array<number>>();
    const procedure: Procedure = {
      query: "sp_get_cut_range",
      parameters: [requestID],
      selectUnique: false,
    };

    const rows = (await mysqlConnection.callProcedure(
      procedure
    )) as Array<SelectUniqueResult>;

    interface CutRange extends SelectUniqueResult {
      cut_idx: string;
      cut_start: number;
      cut_end: number;
    }

    for (const row of rows as Array<CutRange>) {
      ranges.set(`${row["cut_idx"]}`, [row["cut_start"], row["cut_end"]]);
    }
    return ranges;
  }
  /*
		todo 최준영
		requestID와 cutIndex가 유효하지 않은 경우 -> invalid request
		requestID와 cutIndex가 유효하고 row가 없는 경우 -> early request
		requestID와 cutIndex가 유효하고 row가 있는 경우 -> early request
	*/
  async getPath(
    requestID: number,
    type: string,
    cutIndex = 0
  ): Promise<string> {
    const procedure: Procedure = {
      query: "sp_get_paths",
      parameters: [requestID, cutIndex],
      selectUnique: true,
    };

    const row = (await mysqlConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    switch (type) {
      case "cut":
        return row["cut_path"] as string;
      case "inpaint":
        return row["inpaint_path"] as string;
      case "mask":
        return row["mask_path"] as string;
      case "mask_image":
        return row["mask_image_path"] as string;
      default:
        return "";
    }
  }

  async setBboxes(
    requestID: number,
    index: number,
    bboxes: Array<BBox>
  ): Promise<unknown> {
    const procedure: Procedure = {
      query: "sp_set_bbox_2",
      parameters: [requestID, index, JSON.stringify(bboxes)],
      selectUnique: true,
    };
    const rows = await mysqlConnection.callProcedure(procedure);
    //todo 최준영 detect-bbox-translate-complete 단계 구분 필요
    progressManager.updateProgress(requestID, index, "complete");
    if (index !== 0) {
      progressManager.updatePart(requestID, 0, "complete");
    }
    return rows;
  }

  async getBboxes(requestID: number, cutIndex: number): Promise<Array<BBox>> {
    const result: Array<BBox> = new Array<BBox>();
    const procedure: Procedure = {
      query: "sp_get_bbox_2",
      parameters: [requestID, cutIndex],
      selectUnique: true,
    };

    return mysqlConnection.callProcedure(procedure).then((rows) => {
      const bboxes = JSON.parse(
        (rows as SelectUniqueResult)["bboxes"] as string
      ) as Array<BBox>;
      for (const row_bbox of bboxes) {
        const bbox: BBox = {
          bbox_id: row_bbox["bbox_id"],
          originalX: row_bbox["originalX"],
          originalY: row_bbox["originalY"],
          originalWidth: row_bbox["originalWidth"],
          originalHeight: row_bbox["originalHeight"],
          originalText: row_bbox["originalText"],
        };
        result.push(bbox);
      }
      return result;
    });
  }

  setBboxesWithTranslate(
    requestID: number,
    cutIndex: number,
    updatedBboxes: TranslateBBox[]
  ): Promise<unknown> {
    this.getBboxes(requestID, cutIndex)
      .then((bboxes) => {
        updatedBboxes = updateBbox(bboxes, updatedBboxes);
      })
      .catch((error) => {
        throw error;
      });
    const procedure: Procedure = {
      query: "sp_set_bbox_2",
      parameters: [requestID, cutIndex, JSON.stringify(updatedBboxes)],
      selectUnique: true,
    };
    return mysqlConnection.callProcedure(procedure);
  }
}
export const queryManager = new mysqlConnectionManager();
