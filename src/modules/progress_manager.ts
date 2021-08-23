import {
  mysqlConnection,
  Procedure,
  SelectUniqueResult,
} from "src/sql/sql_connection";

const progressed = {
  start: 0,
  cut: 5,
  mask: 30,
  inpaint: 100,
  detect: 110,
  bbox: 130,
  translate: 180,
  complete: 200,
};

function nextStateValue(status: string): number {
  switch (status) {
    case "start":
      return progressed.cut;
    case "cut":
      return progressed.mask;
    case "mask":
      return progressed.inpaint;
    case "inpaint":
      return progressed.detect;
    case "detect":
      return progressed.bbox;
    case "bbox":
      return progressed.translate;
    case "translate":
      return progressed.complete;
    case "complete":
      return progressed.complete;
  }
  return progressed.complete;
}

class Progress {
  requestID: number;
  cutIndex: number;
  status: string;
  lastUpdateTime: number;
  progressed: number;
  progressSpeed: number;
  totalParts: number;
  previousTotalParts: number;
  progressedParts: number;

  constructor(requestID: number, cutIndex: number) {
    this.requestID = requestID;
    this.cutIndex = cutIndex;
    this.status = "start";
    this.progressed = progressed.start;
    this.progressSpeed = 0.2;
    this.totalParts = 1;
    this.previousTotalParts = 0;
    this.progressedParts = 0;
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
        return (rows as SelectUniqueResult)["complete"] as string;
      })
      .then((status) => {
        this.updateStatus(status);
      });
  }

  updateStatus(status: string) {
    this.status = status;
    this.lastUpdateTime = Date.now();
    this.progressedParts = 0;
    this.previousTotalParts = this.totalParts;
    this.totalParts = 1;
    switch (this.status) {
      case "start":
        this.progressed = progressed.start;
        this.progressSpeed = 0.2;
        break;
      case "cut":
        this.progressed = progressed.cut;
        this.progressSpeed = 1;
        break;
      case "mask":
        this.progressed = progressed.mask;
        this.progressSpeed = 0.25;
        break;
      case "inpaint":
        this.progressed = progressed.inpaint;
        this.progressSpeed = 1;
        break;
      case "detect":
        this.progressed = progressed.detect;
        this.progressSpeed = 0.5;
        break;
      case "bbox":
        this.progressed = progressed.bbox;
        this.progressSpeed = 0.5;
        break;
      case "translate":
        this.progressed = progressed.translate;
        this.progressSpeed = 0.5;
        break;
      case "complete":
        this.progressed = progressed.complete;
        this.progressSpeed = 0;
        break;
    }
  }

  updatePart(status: string) {
    if (status !== this.status) {
      return;
    }
    if (this.progressedParts + 1 >= this.totalParts) {
      return;
    }
    this.progressedParts += 1;
  }

  updateTotalPart(status: string, count: number) {
    if (status !== this.status) {
      return;
    }
    this.progressedParts = 0;
    this.totalParts = count;
  }

  restoreTotalPart(status: string) {
    if (status !== this.status) {
      return;
    }
    this.progressedParts = 0;
    this.totalParts = this.previousTotalParts;
  }

  getProgress() {
    const timeDiff = (Date.now() - this.lastUpdateTime) / 1000;
    const partsProgress = this.progressedParts / this.totalParts;
    const progress = Math.min(
      this.progressed +
        partsProgress * (nextStateValue(this.status) - this.progressed) +
        timeDiff * this.progressSpeed,
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
    status: string
  ): Promise<void> {
    const progressCls = await this.getProgressClass(requestID, cutIndex);
    progressCls.updateStatus(status);
  }

  async updatePart(
    requestID: number,
    cutIndex: number,
    status: string
  ): Promise<void> {
    if (this.progress_map.get(requestID)?.has(cutIndex)) {
      const progressCls = await this.getProgressClass(requestID, cutIndex);
      progressCls.updatePart(status);
    }
  }

  async updateTotalPart(
    requestID: number,
    cutIndex: number,
    status: string,
    count: number
  ): Promise<void> {
    if (this.progress_map.get(requestID)?.has(cutIndex)) {
      const progressCls = await this.getProgressClass(requestID, cutIndex);
      progressCls.updateTotalPart(status, count);
    }
  }

  async restoreTotalPart(
    requestID: number,
    cutIndex: number,
    status: string
  ): Promise<void> {
    if (this.progress_map.get(requestID)?.has(cutIndex)) {
      const progressCls = await this.getProgressClass(requestID, cutIndex);
      progressCls.restoreTotalPart(status);
    }
  }
}

export const progressManager = ProgressManager.getInstance();
