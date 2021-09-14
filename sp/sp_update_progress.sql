BEGIN
	UPDATE REQUESTS 
		SET progress = (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = p_status)
        WHERE request_id = p_request_id;
END