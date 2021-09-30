import { ProgressType } from "src/modules/const";

export interface RequestStartConcat {
  req_id: number;
}

export interface ReplyStartConcat {
  path: string;
}

export interface RequestStartTranslate {
  bboxes: string;
  image_path: string;
}

export interface ReplyStartTranslate {
  data: string;
}

export interface SendImage {
  req_id: number;
  type: ProgressType;
  cut_index: number;
  file_name: string;
}

export interface ReceiveImage {
  success: boolean;
}

export interface SendJson {
  req_id: number;
  cut_index: number;
  type: string;
  data: string;
  file_name: string;
}

export interface ReceiveJson {
  success: boolean;
}

export interface RequestMakeCut {
  req_id: number;
  type: string;
  image_path: string;
}

export interface ReplyRequestMakeCut {
  req_id: number;
  cut_count: number;
  cut_ranges: string;
}

export interface RequestStart {
  req_id: number;
  cut_index: number;
  image_path: string;
}

export interface ReplySegmentationStart {
  req_id: number;
  mask: string;
}

export interface ReplyOCRStart {
  req_id: number;
}

export interface RequestMaskUpdate {
  req_id: number;
  mask_rles: Buffer[];
  cut_index: number;
  image_path: string;
}

export interface ReplyMaskUpdate {
  req_id: number;
  status_code: number;
}

export interface RequestInpaintComplete {
  req_id: number;
  cut_index: number;
  file_name: string;
}

export interface ReplyInpaintComplete {
  req_id: number;
}
