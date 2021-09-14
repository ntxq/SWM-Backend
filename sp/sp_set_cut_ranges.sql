BEGIN
	INSERT INTO CUTS(request_id,cut_idx,cut_start,cut_end) 
		VALUES(p_request_id, p_index, p_cut_start, p_cut_end)
	ON DUPLICATE KEY UPDATE cut_start = p_cut_start, cut_end = p_cut_end;
END