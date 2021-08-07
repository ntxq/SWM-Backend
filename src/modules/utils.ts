import path from "path";
import { TranslateBBox, BBox } from 'src/routes/upload/ocr';

export function isImageFile(file:Express.Multer.File):boolean{
	// Allowed ext
	const filetypes = /jpeg|jpg|png/;
	// Check ext
	const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
	// Check mime
	const mimetype = filetypes.test(file.mimetype);
 
	if(mimetype && extname){
		return true;
	} else {
		return false;
	}
}

export function update_bbox(old_bbox:BBox[] | TranslateBBox[],new_bbox:BBox[] | TranslateBBox[]){
	return new_bbox as TranslateBBox[];
}