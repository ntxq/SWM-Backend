BEGIN
	IF NOT EXISTS (SELECT 1 FROM PROJECTS WHERE id = (SELECT project_id FROM REQUESTS WHERE p_request_id = request_id) AND user_id = p_user_id) THEN
		SIGNAL SQLSTATE 'SP403' SET MESSAGE_TEXT = 'no match userID-requestID group';
    END IF;
	IF EXISTS ( SELECT 1 FROM UPLOAD_SIZE WHERE p_request_id = request_id AND p_type = UPLOAD_SIZE.type) THEN
		SELECT SUM(size) AS total_size FROM UPLOAD_SIZE WHERE user_id=p_user_id AND p_type = UPLOAD_SIZE.type;
    ELSE
		SET @total_size = (SELECT SUM(size) FROM UPLOAD_SIZE WHERE user_id=p_user_id AND p_type = UPLOAD_SIZE.type);
        # with inpaint 15GB
        IF p_type = 1 AND @total_size + p_size > 16106127360 THEN
			SELECT -1 AS total_size;
		# without inpaint - 1GB
		ELSEIF p_type = 2 AND @total_size + p_size > 1073741824 THEN
			SELECT -1 AS total_size;
		ELSE
			INSERT INTO UPLOAD_SIZE(request_id,type,size,user_id) VALUES (p_request_id,p_type,p_size,p_user_id);
            SELECT (@total_size + p_size) AS total_size;
        END IF;
    END IF;
	
END