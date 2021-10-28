BEGIN
	SELECT (SELECT SUM(size) FROM UPLOAD_SIZE WHERE user_id=p_user_id AND UPLOAD_SIZE.type = 1) AS ocr_process,
			(SELECT SUM(size) FROM UPLOAD_SIZE WHERE user_id=p_user_id AND UPLOAD_SIZE.type = 2) AS full_process;
END