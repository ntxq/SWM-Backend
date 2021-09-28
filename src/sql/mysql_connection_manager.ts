import {
  MysqlConnection,
  mysqlConnection,
  mysqlLonginConnection,
  Procedure,
  SelectUniqueResult,
} from "src/sql/sql_connection";
import { BBox, TranslateBBox } from "src/routes/api/ocr";

import { s3 } from "src/modules/s3_wrapper";
import { progressManager } from "src/modules/progress_manager";
import createError from "http-errors";
import { getImagePath } from "src/modules/utils";
import { ProgressType } from "src/modules/const";
import { PostProjectResponse } from "src/routes/api/segmentation";
import { Project } from "src/routes/api/history";

export class mysqlConnectionManager {
  connection: MysqlConnection;
  constructor() {
    this.connection = mysqlConnection;
  }

  async getProjects(userID: number, page: number): Promise<Array<Project>> {
    const page_size = 50;
    const procedure: Procedure = {
      query: "sp_get_project",
      parameters: [userID, page * page_size],
      selectUnique: false,
    };
    const rows = (await mysqlConnection.callProcedure(
      procedure
    )) as Array<SelectUniqueResult>;

    const results = new Map<number, Array<SelectUniqueResult>>();
    for (const row of rows) {
      const id = row["project_id"] as number;
      if (!results.has(id)) {
        results.set(id, []);
      }
      results.get(id)?.push(row);
    }

    const projects = new Array<Project>();
    for (const [id, values] of results.entries()) {
      const project: Project = { id: id, requests: [] };
      for (const row of values) {
        const id = row["request_id"] as number;
        const progress = row["progress"] as string;
        const thumbnail = row["cut1_path"] as string;
        const thumnail_s3 =
          thumbnail !== null ? await s3.getDownloadURL(thumbnail) : undefined;
        const request = { id: id, progress: progress, thumbnail: thumnail_s3 };
        project.requests.push(request);
      }
      projects.push(project);
    }
    return projects;
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
    filenames: string[]
  ): Promise<PostProjectResponse> {
    const procedures = new Array<Procedure>();
    for (const filename of filenames) {
      const procedure: Procedure = {
        query: "sp_add_request",
        parameters: [projectID, filename],
        selectUnique: true,
      };
      procedures.push(procedure);
    }
    const rows = (await mysqlConnection.callMultipleProcedure(
      procedures
    )) as Array<SelectUniqueResult>;

    const returnValue = [];
    for (const [index, row] of rows.entries()) {
      const requestID = row["id"] as number;

      const imagePath = getImagePath(requestID, 0, "cut");
      const s3URL = await s3.getUploadURL(imagePath);

      const inpaintImagePath = getImagePath(requestID, 0, "inpaint");
      const s3BlankURL = await s3.getUploadURL(inpaintImagePath);
      returnValue.push({
        req_id: requestID,
        filename: filenames[index],
        s3_url: s3URL,
        s3_blank_url: s3BlankURL,
      });
    }
    return { request_array: returnValue };
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

  checkProgress(requestID: number, cutIndex: number): Promise<number> {
    return progressManager.getProgress(requestID, cutIndex);
  }

  async updateProgress(
    requestID: number,
    cutIndex: number,
    status: ProgressType
  ): Promise<unknown> {
    const procedure: Procedure = {
      query: "sp_update_progress_2",
      parameters: [requestID, cutIndex, status as string],
      selectUnique: true,
    };
    const rows = await mysqlConnection.callProcedure(procedure);
    await progressManager.updateProgress(requestID, cutIndex, status);
    return rows;
  }

  updateUserUploadInpaint(
    requestID: number,
    type: ProgressType,
    cutIndex: number,
    filePath: string
  ): Promise<void> {
    return this.updateCut(requestID, type, cutIndex, filePath, true);
  }

  async updateCut(
    requestID: number,
    type: ProgressType,
    cutIndex: number,
    filePath: string,
    isUserUploadInpaint = false
  ): Promise<void> {
    //cut,mask,inpaint
    // eslint-disable-next-line unicorn/no-null
    const path: Array<string | null> = [null, null, null, null];
    switch (type) {
      case "cut":
        path[0] = filePath;
        break;
      case "mask":
        path[1] = filePath;
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
    await progressManager.updateProgress(requestID, cutIndex, type);
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
        throw new createError.InternalServerError();
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
    await progressManager.updateProgress(requestID, index, "translate");
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
          translatedText: row_bbox["translatedText"],
        };
        result.push(bbox);
      }
      return result;
    });
  }

  async setBboxesWithTranslate(
    requestID: number,
    cutIndex: number,
    updatedBboxes: TranslateBBox[]
  ): Promise<unknown> {
    const procedure: Procedure = {
      query: "sp_set_bbox_2",
      parameters: [requestID, cutIndex, JSON.stringify(updatedBboxes)],
      selectUnique: true,
    };
    return mysqlConnection.callProcedure(procedure);
  }

  async addUser(
    userID: number,
    nickname: string,
    email?: string
  ): Promise<SelectUniqueResult> {
    const procedure: Procedure = {
      query: "sp_set_user",
      parameters: [userID, nickname, email],
      selectUnique: true,
    };
    return mysqlLonginConnection.callProcedure(
      procedure
    ) as Promise<SelectUniqueResult>;
  }

  async setRefreshToken(userID: number, refreshToken: string): Promise<number> {
    const procedure: Procedure = {
      query: "sp_set_refresh_token",
      parameters: [userID, refreshToken],
      selectUnique: true,
    };
    const result = (await mysqlLonginConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    const index = result["token_index"] as number;
    return index;
  }

  async getUser(userID: number): Promise<SelectUniqueResult> {
    const procedure: Procedure = {
      query: "sp_get_user",
      parameters: [userID],
      selectUnique: true,
    };
    const result = (await mysqlLonginConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    return result;
  }

  async getRefreshToken(index: number): Promise<string> {
    const procedure: Procedure = {
      query: "sp_get_refresh_token",
      parameters: [index],
      selectUnique: true,
    };
    const result = (await mysqlLonginConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    return result["token"] as string;
  }

  async isValidRequest(userID: number, requestID: number): Promise<boolean> {
    const procedure: Procedure = {
      query: "sp_check_request_user",
      parameters: [userID, requestID],
      selectUnique: true,
    };
    const result = (await mysqlConnection.callProcedure(
      procedure
    )) as SelectUniqueResult;
    return result["valid"] !== 0;
  }
}
export const queryManager = new mysqlConnectionManager();
