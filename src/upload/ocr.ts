import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { isImageFile, generate_id } from '../../public/utils';

var router = express.Router();


var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, 'images/');
	},
	filename: function (req, file, cb) {
	  cb(null, file.originalname);
	}
})
var fileFilter = function(req:express.Request, file, cb){
	if(!isImageFile(file)){
		req.res.statusCode = 415
		// req.h = 'goes wrong on the mimetype';
		cb('Error: Images Only!');
	}
	cb(null,true)
}
  
const upload = multer({ storage: storage, fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 1024 } });


router.post('/source', upload.array('source'), (req,res) => {
	try{
		const files = req.files as Express.Multer.File[];
		for (var i = 0; i < files.length;i++) {
			console.log(res.statusCode)
			if(req){
				res.status(415).send("jpg,jpeg,png파일만 업로드 가능합니다.")
				return
			}
		}
		const req_id = generate_id();
		for (var i = 0; i < files.length;i++) {
			const file = files[i]
			const path = `original/${req_id}_${i}`
			fs.writeFile(path, file.buffer,()=>{})
		}
		// send_to_ai_server();
		res.send({req_id:req_id})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/progress', (req,res) => {
	try{
		const req_id = req.params['req_id']
		var step = req.params['step']
		// step = get_now_step(req_id,step)
		res.send({step:step})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/result', (req,res) => {
	try{
		const req_id = req.params['req_id']
		const data = {} // get_ocr_result(req_id)
		res.send({data:data})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.post('/confirm', (req,res) => {
	try{
		const data = req.body['data']
		// save_ocr_result(data)
		res.send({})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

export default router;