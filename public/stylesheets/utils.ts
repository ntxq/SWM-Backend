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
