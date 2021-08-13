import express from "express";
import fs from "fs";
import { IMAGE_DIR, JSON_DIR } from "src/modules/const";
import path from "path";
import { grpcSocket } from "src/gRPC/grpc_socket";
import * as MESSAGE from "src/gRPC/grpc_message_interface";

import { Request, Response, NextFunction } from "express-serve-static-core";
import { multer_image } from "src/routes/multer_options";
import createError from "http-errors";
import { queryManager } from "src/sql/mysqlConnectionManager";
import { TEMP_ERROR_CODE } from "../../modules/const";

var router = express.Router();

router.post(
  "/source",
  multer_image.array("source"),
  async (req: Request, res: Response) => {
    //todo 최준영 제대로 된 user id 로 변환
    const user_id = 123123123;

    const project_id = await queryManager.add_project(
      user_id,
      req.body["title"]
    );
    const files = req.files as Express.Multer.File[];
    queryManager
      .add_request(project_id, files)
      .then((path_id_map: Map<number, [string, string]>) => {
        const promise_all =
          Array<Promise<void | MESSAGE.ReplyRequestMakeCut>>();

        for (const [req_id, pathes] of path_id_map) {
          const [new_path, original_path] = pathes;
          promise_all.push(queryManager.update_cut(req_id, "cut", 0, new_path));
          promise_all.push(
            grpcSocket.segmentation.MakeCutsFromWholeImage(
              req_id,
              "cut",
              new_path
            )
          );
        }

        Promise.all(promise_all).then(
          (replies: Array<void | MESSAGE.ReplyRequestMakeCut>) => {
            const response_id_map = new Map<string, object>();
            for (const reply of replies) {
              if (reply) {
                const pathes = path_id_map.get(reply.req_id);
                if (pathes) {
                  const [new_path, original_path] = pathes;
                  response_id_map.set(original_path, {
                    req_id: reply.req_id,
                    cut_count: reply.cut_count,
                  });
                }
              }
            }
            res.send({ req_ids: Object.fromEntries(response_id_map) });
          }
        );
      });
  }
);

router.post(
  "/blank",
  multer_image.array("blank"),
  (req: Request, res: Response, next: NextFunction) => {
    const blank_not_exist_ids: number[] = JSON.parse(req.body.empty_id);
    const map_ids: number[] = JSON.parse(req.body.map_ids);
    const files = req.files as Express.Multer.File[];

    //send start ai processing signal
    blank_not_exist_ids.forEach((req_id) => {
      grpcSocket.segmentation.Start(req_id);
    });

    //set query and response data
    const promise_all = new Array<
      Promise<void | MESSAGE.ReplyRequestMakeCut>
    >();
    for (var i = 0; i < map_ids.length; i++) {
      const req_id = map_ids[i];
      const blank_file = files[i];
      const old_path = blank_file.path;
      const new_path = `${IMAGE_DIR}/inpaint/${req_id}_0${path.extname(
        blank_file.originalname
      )}`;
      fs.promises.rename(old_path, new_path);
      promise_all.push(
        queryManager.update_user_upload_inpaint(req_id, "inpaint", 0, new_path)
      );
      promise_all.push(
        grpcSocket.segmentation.MakeCutsFromWholeImage(
          req_id,
          "inpaint",
          new_path
        )
      );
    }
    Promise.all(promise_all).then(() => {
      res.send({ success: true });
    });
  }
);

router.get("/cut", async (req: Request, res: Response, next: NextFunction) => {
  const req_id = parseInt(req.query["req_id"] as string);
  const cut_id = parseInt(req.query["cut_id"] as string);
  const cut = await queryManager.get_path(req_id, "cut", cut_id);
  if (!fs.existsSync(cut)) {
    next(createError(TEMP_ERROR_CODE));
    return;
  }
  res.sendFile(cut);
});

router.get("/result", (req: Request, res: Response) => {
  const req_id = parseInt(req.query["req_id"] as string);
  const cut_id = parseInt(req.query["cut_id"] as string);
  queryManager.check_progress(req_id, cut_id).then((complete) => {
    res.send({ complete });
  });
});

router.get(
  "/result/inpaint",
  async (req: Request, res: Response, next: NextFunction) => {
    const req_id = parseInt(req.query["req_id"] as string);
    const cut_id = parseInt(req.query["cut_id"] as string);
    const inpaint = await queryManager.get_path(req_id, "inpaint", cut_id);
    if (!fs.existsSync(inpaint)) {
      next(createError(404));
      return;
    }
    res.sendFile(inpaint);
  }
);

router.get(
  "/result/mask",
  async (req: Request, res: Response, next: NextFunction) => {
    const req_id = parseInt(req.query["req_id"] as string);
    const cut_id = parseInt(req.query["cut_id"] as string);
    const mask = await queryManager.get_path(req_id, "mask", cut_id);
    if (!fs.existsSync(mask)) {
      next(createError(404));
      return;
    }
    res.send({ mask: require(mask) });
  }
);

router.post(
  "/mask",
  async (req: Request, res: Response, next: NextFunction) => {
    const req_id = parseInt(req.body["req_id"] as string);
    const cut_id = parseInt(req.body["cut_id"] as string);
    const mask = JSON.parse(req.body["mask"])["result"];
    if (mask == undefined) {
      next(createError(400));
      return;
    }

    await queryManager.update_progress(req_id, cut_id, "mask");

    const mask_path = await queryManager.get_path(req_id, "mask", cut_id);
    fs.writeFile(mask_path, JSON.stringify(mask), (err) => {
      console.log(err);
    });

    const rle: Array<Array<number>> = [];
    for (var i = 0; i < mask.length; i++) {
      rle.push(mask[i]["value"]["rle"]);
    }
    grpcSocket.segmentation.UpdateMask(req_id, cut_id, rle, () => {
      res.send({ success: true });
    });
  }
);

export default router;
