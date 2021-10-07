BEGIN
	SELECT(
		(SELECT progress FROM REQUESTS WHERE p_request_id = request_id) 
			>= 
		(SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = p_status))
        AS complete;
END