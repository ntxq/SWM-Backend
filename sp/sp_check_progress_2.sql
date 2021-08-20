BEGIN
	SELECT(
		(SELECT progress FROM CUTS WHERE p_request_id = request_id AND p_cut_idx = cut_idx) 
			>= 
		(SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = p_status))
        AS complete;
END