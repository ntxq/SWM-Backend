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
		 false;
	 }
}

//todo 최준영 마지막 숫자는 따로 디스크에 저장할 것(SQL,noSQL,파일이름으로 체크 등등...)
var now = 0
export function generate_id():number{
	now += 1
	return now
}