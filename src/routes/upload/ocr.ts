import express from 'express';
import multer from 'multer';
import fs from 'fs';
import { isImageFile, generate_id } from '../../modules/utils';
import path from 'path';
import { req_now_step, req_ocr_result, save_ocr_result } from '../../modules/req_ai_server';

interface ImageRequest extends express.Request{
	req_id?:number;
}

var router = express.Router();

var prefix = 0
const image_dir = __dirname +'/../../images'

var storage = multer.diskStorage({
	destination: function (req, file, cb) {
		cb(null, image_dir);
	},
	filename: function (req, file, cb) {
		prefix += 1
		cb(null, Date.now() + prefix + file.originalname);
	}
})
var fileFilter = function(req:ImageRequest, file, cb){
	if(!isImageFile(file)){
		return cb({message:'Error: Images Only!',status:415});
	}
	if(!req.req_id){
		req.req_id = generate_id();
	}
	return cb(null,true)
}
  
const upload = multer({ storage: storage, fileFilter:fileFilter, limits: { fileSize: 1024 * 1024 * 1024 } });


router.post('/source', upload.array('source'), (req:ImageRequest,res) => {
	try{
		const files = req.files as Express.Multer.File[];
		for (var i = 0; i < files.length;i++) {
			const file = files[i]
			const old_path = file.path
			const new_path = `${image_dir}/original/${req.req_id}_${i}${path.extname(file.originalname)}`
			fs.rename(old_path, new_path, function (err) {
				if (err) {
					console.error(err)
					throw err
				}
				console.log('Successfully renamed - AKA moved!')
			})
		}
		// send_to_ai_server();
		res.send({req_id:req.req_id})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/progress', (req,res) => {
	try{
		const req_id = req.params['req_id']
		var step = req_now_step(req_id,req.params['step'])
		res.send({step:step})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.get('/result', (req,res) => {
	try{
		const req_id = req.params['req_id']
		const data = req_ocr_result(req_id)
		res.send({data:data})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

router.post('/confirm', (req,res) => {
	try{
		const data = req.body['data']
		save_ocr_result(data)
		res.send({})
	}
	catch{
		res.status(500).send({msg:"internel error"});
	}
});

export default router;