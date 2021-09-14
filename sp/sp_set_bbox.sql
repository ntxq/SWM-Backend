BEGIN
	INSERT INTO BBOXS(request_id, bbox_id, originalX, originalY, originalWidth, originalHeight, originalText)
		VALUES (p_request_id, p_bbox_id, p_originalX, p_originalY, p_originalWidth, p_originalHeight, p_originalText);
END