BEGIN
	SELECT PROGRESS_ENUM.name AS complete FROM PROGRESS_ENUM, CUTS WHERE p_request_id = request_id AND p_cut_idx = cut_idx AND progress = PROGRESS_ENUM.index;
END