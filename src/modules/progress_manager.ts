import {
  mysqlConnection,
  Procedure,
  SelectUniqueResult,
} from "src/sql/sql_connection";
import { ProgressType } from "./const";

type ProgressMap = {
  [key in ProgressType]: number;
};

const progressed: ProgressMap = {
  start: 0,
  cut: 0,
  mask: 30,
  inpaint: 100,
  bbox: 130,
  translate: 200,
  complete: 200,
};

const progressSpeed: ProgressMap = {
  start: 0.2,
  cut: 0.2,
  mask: 0.25,
  inpaint: 1,
  bbox: 0.5,
  translate: 0,
  complete: 0,
};

function nextStateValue(status: ProgressType): number {
  if (status == "translate") {
    return progressed[status];
  }
  const progressedKeys = Object.keys(progressed) as Array<ProgressType>;
  const key = progressedKeys[progressedKeys.indexOf(status) + 1];
  return progressed[key];
}

class Progress {
  requestID: number;
  cutIndex: number;
  status: ProgressType;
  lastUpdateTime: number;

  constructor(requestID: number, cutIndex: number) {
    this.requestID = requestID;
    this.cutIndex = cutIndex;
    this.status = "cut";
    this.lastUpdateTime = Date.now();
  }

  async initStatus(): Promise<void> {
    const procedure: Procedure = {
      query: "sp_check_progress_3",
      parameters: [this.requestID, this.cutIndex],
      selectUnique: true,
    };
    return mysqlConnection
      .callProcedure(procedure)
      .then((rows) => {
        return (rows as SelectUniqueResult)["complete"] as ProgressType;
      })
      .then((status) => {
        this.updateStatus(status);
      });
  }

  updateStatus(status: ProgressType) {
    this.status = status;
    this.lastUpdateTime = Date.now();
  }

  getProgress() {
    const timeDiff = (Date.now() - this.lastUpdateTime) / 1000;
    const progress = Math.min(
      progressed[this.status] + timeDiff * progressSpeed[this.status],
      nextStateValue(this.status)
    );
    return Math.floor(progress);
  }
}

export class ProgressManager {
  progress_map: Map<number, Map<number, Progress>>;
  private static instance: ProgressManager;

  private constructor() {
    this.progress_map = new Map<number, Map<number, Progress>>();
  }

  static getInstance(): ProgressManager {
    return this.instance || (this.instance = new this());
  }

  async getProgressClass(
    requestID: number,
    cutIndex: number
  ): Promise<Progress> {
    if (this.progress_map.has(requestID) === false) {
      this.progress_map.set(requestID, new Map<number, Progress>());
    }
    const progress_request = this.progress_map.get(requestID) as Map<
      number,
      Progress
    >;

    if (progress_request.has(cutIndex) === false) {
      const progress = new Progress(requestID, cutIndex);
      await progress.initStatus();
      progress_request.set(cutIndex, progress);
    }
    const progress_cut = progress_request.get(cutIndex) as Progress;
    return progress_cut;
  }

  async getProgress(requestID: number, cutIndex: number): Promise<number> {
    const progressCls = await this.getProgressClass(requestID, cutIndex);
    let progress = progressCls.getProgress();
    //0~200사이 범위로 제한
    progress = Math.max(0, Math.min(200, progress));
    return progress;
  }

  async updateProgress(
    requestID: number,
    cutIndex: number,
    status: ProgressType
  ): Promise<void> {
    const progressCls = await this.getProgressClass(requestID, cutIndex);
    progressCls.updateStatus(status);
  }
}

export const progressManager = ProgressManager.getInstance();
