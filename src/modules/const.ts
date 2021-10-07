import path from "node:path";

const DATA_PATH = "data";
export const IMAGE_DIR = path.join(DATA_PATH, "images");
export const JSON_DIR = path.join(DATA_PATH, "jsons");

export type ProgressType =
  | "start"
  | "cut"
  | "mask"
  | "inpaint"
  | "bbox"
  | "translate";
