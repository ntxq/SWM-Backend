BEGIN
	SELECT bbox_id, originalX, originalY, originalWidth, originalHeight, originalText FROM BBOXS WHERE request_id = p_request_id;
END