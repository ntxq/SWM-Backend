BEGIN
	SELECT bboxes FROM CUTS WHERE request_id = p_request_id AND cut_idx = p_cut_idx;
END