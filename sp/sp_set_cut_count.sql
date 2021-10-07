BEGIN
	UPDATE REQUESTS SET cut_count = p_cut_count WHERE request_id = p_request_id;
END